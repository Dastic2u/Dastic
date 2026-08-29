const { app, BrowserWindow, Tray, Menu, ipcMain, powerSaveBlocker, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// In a packaged build there is no terminal, so every console.error below was
// written to nowhere — which is exactly why "the screen goes blank" could be
// reported but never diagnosed. Mirror everything to a file in userData,
// rotated so it cannot grow without limit on a machine that mines all day.
// Moved to the TOP of the file on purpose: this used to sit after the
// single-instance-lock check, so a launch that got REFUSED never reached
// it -- that whole failure path logged to nowhere in a packaged build,
// with no terminal to see it in either. "it works when Claude opens it,
// not when I do" turned out to be exactly this: an earlier, already-
// broken instance silently holding the lock, and every real launch after
// it refused with no visible trace anywhere.
const LOG_MAX_BYTES = 2 * 1024 * 1024;
let logFilePath = null;
function logFile() {
  if (logFilePath === null) {
    try {
      logFilePath = path.join(app.getPath('userData'), 'dastic.log');
      if (fs.existsSync(logFilePath) && fs.statSync(logFilePath).size > LOG_MAX_BYTES) {
        fs.renameSync(logFilePath, logFilePath + '.1');
      }
    } catch (e) { logFilePath = ''; }
  }
  return logFilePath;
}
function fileLog(line) {
  const p = logFile();
  if (!p) return;
  try { fs.appendFileSync(p, line + String.fromCharCode(10)); } catch (e) {}
}
// Wrap the existing console calls rather than rewriting every log site.
for (const level of ['log', 'warn', 'error']) {
  const original = console[level].bind(console);
  console[level] = (...args) => {
    original(...args);
    fileLog(args.map((a) => {
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch (e) { return String(a); }
    }).join(' '));
  };
}

// Minimal .env loader — no dotenv dependency needed for a single KEY=VALUE
// file. Only sets vars that aren't already set (real env vars win).
(function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
})();

// ORDER MATTERS: userData is pinned BEFORE requesting the single-instance
// lock, because Electron derives that lock from the userData path. With the
// lock taken first, the source build and the installed build were still on
// their own default paths, got two DIFFERENT locks, and both ran happily
// against the same folder once this pin applied a few lines later. The second
// one then found the profile locked by Chromium and came up with an empty
// localStorage -- "no wallets showing", with the data perfectly intact on
// disk. Diagnosed live 2026-08-23 after the same report three times.

// Electron derives userData from productName, so renaming the app to Dastic
// would silently point it at a brand-new empty folder — losing the saved
// pairing, mining keys and session data and forcing a re-pair. Pin it to the
// original folder so the rename stays cosmetic. Must run before whenReady().
// Only remove this alongside a real migration that copies the folder across.
app.setPath('userData', path.join(app.getPath('appData'), 'NacklePick'));

// Observed live 2026-08-23: a window painted solid black -- process alive,
// DOM correctly built (the wallet-list log line confirmed both cards were
// rendered), no crash or render-process-gone event, but nothing ever reached
// the screen. That is the well-known Electron/Chromium GPU-compositor black-
// window failure, not a data or layout bug; it tends to follow exactly the
// kind of repeated hard process kills this app was subjected to during
// testing, which can leave the GPU process/driver in a bad state. Disabling
// hardware acceleration trades a little GPU-accelerated smoothness for a
// renderer that always actually paints, which is the right trade for a
// small settings/status UI like this one.
app.disableHardwareAcceleration();

// Which profile this process actually ended up on. "No wallets, and the UI is
// back in English" is the signature of a DIFFERENT (empty) profile rather than
// lost data -- the language lives in the same store as the wallet list, so
// both reverting together points at the store, not at either feature. Printed
// on every start so that question is answerable from one line of the log.
console.log('[launcher] userData profile: ' + app.getPath('userData') +
  '  (exe: ' + app.getPath('exe') + ')');

// Only ever one instance against this profile.
//
// Chromium locks the userData directory, so a SECOND instance does not fail
// loudly — it comes up with an empty localStorage and shows no wallets at
// all, which reads exactly like "my wallets are gone". Diagnosed live
// 2026-08-23 when a packaged build was opened while a source build was
// already running: the data was intact the whole time, and the exe found it
// immediately once it had the profile to itself. Refuse the second instance
// and surface the first instead of silently showing an empty app.
if (!app.requestSingleInstanceLock()) {
  console.warn('[launcher] Another instance already owns this profile — exiting. ' +
    'Two copies cannot share one data directory: the second gets an empty ' +
    'localStorage and would look like it had lost every wallet.');
  // Say so on screen. Quitting silently is indistinguishable from the app
  // failing to launch at all: double-click, nothing happens, and the copy
  // already running may be behind another window or minimised to the tray.
  // Reported as "I start the .bat and don't see my wallets" — the .bat was
  // being refused by an instance the user could not see.
  app.whenReady().then(() => {
    dialog.showMessageBoxSync({
      type: 'info',
      title: 'Dastic is already running',
      message: 'Dastic is already running.',
      detail: 'Only one copy can run at a time, because they would share the same ' +
        'data folder and the second would show an empty wallet list.\n\n' +
        'Look for the existing window, or click the Dastic icon in the system tray ' +
        '(bottom-right, near the clock).',
      buttons: ['OK'],
    });
    app.quit();
  });
} else {
  app.on('second-instance', () => {
    if (launcherWindow) {
      if (launcherWindow.isMinimized()) launcherWindow.restore();
      if (!launcherWindow.isVisible()) launcherWindow.show();
      launcherWindow.focus();
    }
  });
}

const { registerBeeEngineIpc } = require('./bee-engine-main');

/**
 * Wall-clock stamp for every forwarded renderer log line.
 *
 * Without this the run logs are unmeasurable: run11 and run12 recorded a full
 * submit_session_root → session_accepted round trip and there was no way to
 * say how many seconds it took, because nothing in the file carried a time.
 * The only absolute times in those logs were the `current_time` field buried
 * inside chain ERROR payloads — i.e. available only when something failed.
 * Elapsed-time questions about the mining flow are the main thing these logs
 * get read for, so the timestamp belongs on every line.
 */


/**
 * Drag a window back onto the visible desktop.
 *
 * Observed live 2026-08-23: the launcher opened with only a few pixels of its
 * title bar above the bottom edge of the screen -- the app was running
 * normally and had rendered both wallet cards, but the window was effectively
 * invisible, which reads exactly like "the app doesn't show my wallets".
 * Windows can place or restore a window outside the work area (display
 * changes, scaling changes, a stale position), and nothing recovers from it
 * on its own because the user cannot grab a title bar they cannot see.
 *
 * Checks against the work area of whichever display the window is nearest,
 * so a legitimate second-monitor position is left alone.
 */
function ensureOnScreen(win, label) {
  if (!win || win.isDestroyed()) return;
  try {
    const b = win.getBounds();
    const area = screen.getDisplayMatching(b).workArea;
    console.log('[launcher] ' + (label || 'window') + ' bounds=' + JSON.stringify(b) +
      ' workArea=' + JSON.stringify(area));
    // Measure how much of the window actually lands on the desktop, rather
    // than checking an edge margin. A first attempt required only 80px of the
    // window to be inside the work area, and a launcher sitting with ~50px
    // showing above the taskbar passed that test while being unusable. What
    // matters is the visible FRACTION: anything under two thirds on screen is
    // something the user cannot comfortably read or drag.
    const visibleW = Math.max(0, Math.min(b.x + b.width,  area.x + area.width)  - Math.max(b.x, area.x));
    const visibleH = Math.max(0, Math.min(b.y + b.height, area.y + area.height) - Math.max(b.y, area.y));
    const visibleFraction = (visibleW * visibleH) / Math.max(1, b.width * b.height);
    if (visibleFraction >= 0.67) return;
    const width = Math.min(b.width, area.width);
    const height = Math.min(b.height, area.height);
    win.setBounds({
      width, height,
      x: Math.round(area.x + (area.width - width) / 2),
      y: Math.round(area.y + (area.height - height) / 2),
    });
    console.warn('[launcher] Window was off-screen at ' + JSON.stringify(b) +
      ' - recentred on the visible desktop.');
  } catch (e) {
    console.warn('[launcher] Could not verify window position:', e.message);
  }
}

function logStamp() {
  const d = new Date();
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

let launcherWindow = null;
let tray = null;
let minerWindows = {};  // Map: walletName -> BrowserWindow
let walletData = {};    // Map: walletName -> { sessions, taps, balance, isMining }
let isQuitting = false;

const iconPath = path.join(__dirname, 'icon.png');
const iconGreenPath = path.join(__dirname, 'icon-green.png');

function createLauncher() {
  launcherWindow = new BrowserWindow({
    width: 700,
    height: 600,
    minWidth: 600,
    minHeight: 500,
    title: 'Dastic Launcher',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  launcherWindow.setMenu(null);

  // Read the wallet list and settings directly here, in the main process, at
  // the one moment they are least likely to race anything: nothing else has
  // touched this profile yet for THIS launch. Passed to the page via its own
  // load, not fetched later over IPC.
  //
  // The prior design had the renderer call fs.existsSync/readFileSync itself
  // via a synchronous IPC round trip. That should have been just as reliable
  // -- but reported live 2026-08-23, repeatedly: the SAME wallets.json, same
  // unchanged mtime, same correct content confirmed moments before and after
  // by a completely independent process, came back "does not exist" for that
  // one IPC call. Never reproduced on demand, never explained (not a missing
  // handler, not a registration-order issue, not corruption -- the file was
  // provably fine before and after). Rather than keep chasing a race that
  // could be antivirus scanning, Explorer's shell hooks, or something else
  // entirely, removing the round trip removes the failure mode with it: a
  // single synchronous fs call made once, from the one process that owns
  // this window, before the renderer exists to race it at all.
  let initialWallets = [];
  let initialLanguage = 'en';
  // walletsUnreadable is passed to the page so it can say "couldn't read your
  // wallets" instead of rendering the empty-state "add your first wallet".
  // Those two are completely different situations and showing the wrong one
  // is what made a transient read failure look like the wallets were gone.
  let walletsUnreadable = false;
  const wp = walletsFilePath();
  const walletsRead = readJsonResilient(wp, 'createLauncher wallets.json');
  if (walletsRead.ok && Array.isArray(walletsRead.value)) {
    initialWallets = walletsRead.value;
    console.log('[launcher] createLauncher: read ' + initialWallets.length +
      ' wallet(s) from ' + wp + (walletsRead.recovered ? ' (via backup)' : ''));
  } else if (walletsRead.fresh) {
    console.log('[launcher] createLauncher: no wallets.json yet — new profile.');
  } else {
    // Both the mirror and its backup are unreadable. Before telling the user
    // anything, rebuild the list from the pairing files — they carry the
    // wallet names and are almost never mid-write.
    const salvaged = recoverWalletsFromPairingFiles();
    if (salvaged.length > 0) {
      initialWallets = salvaged;
      console.error('[launcher] createLauncher: wallets.json AND its backup were both ' +
        'unreadable — rebuilt ' + salvaged.length + ' wallet(s) from the pairing files [' +
        salvaged.map((w) => w.name).join(', ') + ']. Counters start at zero; the miner ' +
        're-reads balance from chain.');
    } else {
      walletsUnreadable = true;
      console.error('[launcher] createLauncher: wallets.json unreadable and nothing to ' +
        'rebuild from — showing an error state rather than an empty list, because the ' +
        'wallets are probably fine.');
    }
  }
  try {
    const settings = readSettings();
    if (settings && typeof settings.language === 'string') initialLanguage = settings.language;
  } catch (e) { /* default 'en' stands */ }

  launcherWindow.loadFile('index.html', {
    query: {
      initialWallets: JSON.stringify(initialWallets),
      initialLanguage,
      walletsUnreadable: walletsUnreadable ? '1' : '',
    },
  });

  launcherWindow.once('ready-to-show', () => {
    // Windows can silently minimize a window created by a process that
    // never had OS foreground focus (e.g. launched from a background
    // shell). Force it visible and focused so it's never invisibly stuck.
    if (launcherWindow.isMinimized()) launcherWindow.restore();
    ensureOnScreen(launcherWindow, 'launcher');
    launcherWindow.show();
    launcherWindow.focus();
  });

  // A dead renderer leaves an empty window frame with no error and no way
  // back — the reported "screen goes blank, only the mining windows left".
  // Record why, then reload rather than leaving the user staring at nothing.
  // 'clean-exit' is normal teardown, not a crash, so it is skipped.
  launcherWindow.webContents.on('render-process-gone', (event, details) => {
    console.error(`[${logStamp()}][launcher] RENDERER PROCESS GONE: ${details.reason}` +
      ` (exitCode ${details.exitCode}) — reloading the launcher.`);
    if (details.reason === 'clean-exit') return;
    setTimeout(() => {
      if (launcherWindow && !launcherWindow.isDestroyed()) launcherWindow.reload();
    }, 1000);
  });
  launcherWindow.webContents.on('unresponsive', () => {
    console.error(`[${logStamp()}][launcher] Renderer became unresponsive`);
  });
  launcherWindow.webContents.on('did-fail-load', (event, code, desc) => {
    console.error(`[${logStamp()}][launcher] Failed to load: ${code} ${desc}`);
  });
  launcherWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[${logStamp()}][launcher][console:${level}] ${sourceId}:${line} ${message}`);
  });

  launcherWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      launcherWindow.hide();
    }
  });

  launcherWindow.on('closed', () => {
    launcherWindow = null;
  });
}

function createMinerWindow(walletName) {
  if (minerWindows[walletName]) {
    minerWindows[walletName].show();
    minerWindows[walletName].focus();
    return;
  }

  const minerWin = new BrowserWindow({
    width: 520,
    height: 700,
    title: `Dastic - ${walletName}`,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      additionalArguments: [`--wallet=${walletName}`],
      // These windows hide to the tray rather than close (see the 'close'
      // handler below), so they spend most of their life "background" as far
      // as Chromium is concerned. All of the session clock, burst scheduling,
      // settle retries and epoch polling are setInterval/setTimeout in this
      // renderer — throttling them to 1/minute would not merely slow the UI,
      // it would break session timing outright.
      backgroundThrottling: false
    }
  });

  minerWin.setMenu(null);

  // Get APP_ID from environment or global settings
  const appId = process.env.BEE_APP_ID || global.beeAppId || 'not_set';
  minerWin.loadFile('miner.html', { query: {
    wallet: walletName,
    appId: appId
  } });

  minerWin.once('ready-to-show', () => {
    if (minerWin.isMinimized()) minerWin.restore();
    ensureOnScreen(minerWin, 'miner:' + walletName);
    minerWin.show();
    minerWin.focus();
  });

  minerWin.webContents.on('render-process-gone', (event, details) => {
    console.error(`[${logStamp()}][${walletName}] RENDERER PROCESS GONE: ${details.reason}` +
      ` (exitCode ${details.exitCode}) — reloading this miner window.`);
    if (details.reason === 'clean-exit') return;
    // The wallet is not mining once its renderer is gone; say so rather than
    // leaving the tray showing green for a window that no longer exists.
    if (walletData[walletName]) walletData[walletName].isMining = false;
    updateTray();
    setTimeout(() => {
      if (minerWin && !minerWin.isDestroyed()) minerWin.reload();
    }, 1500);
  });
  minerWin.webContents.on('unresponsive', () => {
    console.error(`[${walletName}] Renderer became unresponsive`);
  });
  minerWin.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[${walletName}] Failed to load:`, errorCode, errorDescription);
  });
  minerWin.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[${logStamp()}][${walletName}][console:${level}] ${sourceId}:${line} ${message}`);
  });

  minerWin.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      minerWin.hide();
    }
  });

  minerWin.on('closed', () => {
    delete minerWindows[walletName];
    updateTray();
  });

  minerWindows[walletName] = minerWin;
  updateTray();
}

function createTray() {
  tray = new Tray(iconPath);
  tray.setToolTip('Dastic');
  updateTray();

  tray.on('click', () => {
    if (launcherWindow) {
      if (launcherWindow.isVisible()) {
        launcherWindow.hide();
      } else {
        launcherWindow.show();
        launcherWindow.focus();
      }
    }
  });
}

function anyMinerActive() {
  return Object.values(walletData).some(d => d && d.isMining);
}

// Keeping the machine awake while — and only while — a wallet is actually
// mining. backgroundThrottling:false stops Chromium throttling a hidden
// window's timers, but it does nothing about the OS itself deciding to sleep
// or suspend the process; a session interrupted that way loses the burst it
// was computing and can leave a submitted root with nothing listening for its
// SessionInterval. 'prevent-app-suspension' is the weaker of the two blockers
// on purpose: it lets the DISPLAY sleep (so the screen still turns off and the
// laptop stays cool) and only keeps the app itself running.
let powerBlockerId = null;
function updatePowerBlocker() {
  const mining = anyMinerActive();
  if (mining && powerBlockerId === null) {
    powerBlockerId = powerSaveBlocker.start('prevent-app-suspension');
    console.log('[launcher] Mining started — blocking app suspension (display may still sleep).');
  } else if (!mining && powerBlockerId !== null) {
    powerSaveBlocker.stop(powerBlockerId);
    powerBlockerId = null;
    console.log('[launcher] No wallet mining — released the suspension blocker.');
  }
}

function updateTray() {
  if (!tray) return;

  // Switch icon based on mining state
  const isMining = anyMinerActive();
  try {
    tray.setImage(isMining ? iconGreenPath : iconPath);
  } catch (e) {
    // Fallback if green icon missing
  }

  const activeMiners = Object.keys(walletData).filter(name => {
    const data = walletData[name];
    return data && data.isMining;
  });

  // One row per wallet, green when it is actually mining and red when it is
  // not — on instruction, so the tray answers "is everything still running?"
  // without opening a window. Keyed off walletData (what every miner window
  // reports over 'miner-status') rather than minerWindows, so a wallet whose
  // window was closed still shows its true state instead of vanishing from
  // the list. Colour is not the only carrier: each row spells out mining/idle.
  const allWallets = Object.keys(walletData).sort();
  const walletItems = allWallets.length ? allWallets.map(name => {
    const data = walletData[name] || {};
    const mining = !!data.isMining;
    const taps = data.taps == null ? '' : ` · ${data.taps} taps`;
    return {
      label: `${mining ? '🟢' : '🔴'} ${name} — ${mining ? 'mining' : 'idle'}${taps}`,
      click: () => createMinerWindow(name)
    };
  }) : [{ label: 'No wallets yet', enabled: false }];

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Dastic', enabled: false },
    { type: 'separator' },
    { label: `Wallets — ${activeMiners.length}/${allWallets.length} mining`, enabled: false },
    ...walletItems,
    { type: 'separator' },
    {
      label: 'Open Launcher',
      click: () => {
        if (launcherWindow) {
          launcherWindow.show();
          launcherWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit All',
      click: () => {
        isQuitting = true;
        Object.values(minerWindows).forEach(win => win.destroy());
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  if (activeMiners.length > 0) {
    tray.setToolTip(`Dastic
${activeMiners.length} of ${allWallets.length} wallet` +
      `${allWallets.length === 1 ? '' : 's'} mining`);
  } else {
    tray.setToolTip(allWallets.length
      ? `Dastic
none of ${allWallets.length} wallet${allWallets.length === 1 ? '' : 's'} mining`
      : 'Dastic');
  }
}

/**
 * A plain-file mirror of the wallet list.
 *
 * localStorage is the wrong single source of truth for something this
 * important. It lives inside the Chromium profile, and a profile that is
 * locked by another process, or replaced, reads back EMPTY rather than
 * failing -- which is indistinguishable from "the user has no wallets" and
 * cost several rounds of "my wallets are gone" when the data was on disk the
 * whole time. This mirror sits in userData as ordinary JSON: readable,
 * greppable, restorable by hand, and unaffected by profile locking.
 *
 * The renderer still uses localStorage as its working copy. This is the
 * safety net: written on every change, and read back only when localStorage
 * comes up empty while the mirror has entries.
 */
// The resilient read/write layer these mirrors depend on. See json-mirror.js
// for why a single fs call is not trusted on this machine.
const { readJsonResilient, writeJsonAtomic } = require('./json-mirror');

function walletsFilePath() {
  return path.join(app.getPath('userData'), 'wallets.json');
}

// Synchronous variant so the renderer can consult the file BEFORE its first
// render, rather than painting from localStorage and then flickering to a
// different list a tick later once an async read resolves.
ipcMain.on('wallets:readMirrorSync', (event) => {
  try {
    const p = walletsFilePath();
    const read = readJsonResilient(p, 'wallets:readMirrorSync');
    if (!read.ok) {
      // Genuinely absent on a fresh profile is fine and silent-ish; anything
      // else has already been logged loudly by readJsonResilient.
      if (read.fresh) console.warn('[launcher] wallets.json does not exist at ' + p);
      event.returnValue = [];
      return;
    }
    const result = Array.isArray(read.value) ? read.value : [];
    // This handler used to swallow every failure silently -- the only code
    // path in this app with no log at all on error, which is exactly why the
    // divergence between "file has 2 wallets on disk" and "the running app
    // read 0" could not be explained from any log. Logging the outcome even
    // on success now, not just on failure, so a future report is answerable
    // in one line either way.
    console.log('[launcher] wallets:readMirrorSync -> ' + result.length +
      ' wallet(s) from ' + p + (read.recovered ? ' (via backup)' : ''));
    event.returnValue = result;
  } catch (e) {
    console.error('[launcher] wallets:readMirrorSync FAILED: ' + e.message + ' (path: ' + walletsFilePath() + ')');
    event.returnValue = [];
  }
});

ipcMain.handle('wallets:readMirror', () => {
  try {
    const read = readJsonResilient(walletsFilePath(), 'wallets:readMirror');
    // Same last resort as createLauncher, so the launcher's "Try again"
    // button can rescue the list too rather than just failing again.
    if (!read.ok) return recoverWalletsFromPairingFiles();
    return Array.isArray(read.value) ? read.value : [];
  } catch (e) {
    console.warn('[launcher] Could not read the wallet mirror:', e.message);
    return [];
  }
});

ipcMain.handle('wallets:writeMirror', (event, list) => {
  try {
    if (!Array.isArray(list)) return false;
    // Never let an empty list overwrite a populated mirror. An empty renderer
    // list is far more likely to mean "this profile did not load" than "the
    // user deleted every wallet", and the mirror exists precisely to survive
    // that case. Deleting the last wallet on purpose is handled by
    // wallets:clearMirror below, which is explicit about it.
    if (list.length === 0) return false;
    writeJsonAtomic(walletsFilePath(), list);
    return true;
  } catch (e) {
    console.warn('[launcher] Could not write the wallet mirror:', e.message);
    return false;
  }
});

ipcMain.handle('wallets:clearMirror', () => {
  // Deliberate, explicit removal of the last wallet — the one case where an
  // empty list is the truth rather than a failed read. Atomic like the rest,
  // and it still leaves the previous content in .bak.
  try { writeJsonAtomic(walletsFilePath(), []); return true; }
  catch (e) { return false; }
});

/**
 * Per-wallet pairing mirror — mining keys, miner address, AN wallet name —
 * on the exact same reasoning as wallets.json above, extended to the data
 * that actually matters more: without it, a miner window has no pairing at
 * all and shows the first-time "Connect to Acki Nacki Mainnet" screen for a
 * wallet that has been mining for weeks.
 *
 * Reproduced live 2026-08-27: two ALREADY-PAIRED wallets, mining moments
 * before, both landed on the pairing gate on the very next launch. Checked
 * directly against the LevelDB store on disk at that exact moment —
 * bee_mining_keys_martins and bee_mining_keys_rahmita were both there,
 * intact. localStorage.getItem() returned null anyway, in the running
 * process, for both. Same failure class as the wallet list, on data whose
 * absence is far more disruptive than an empty launcher screen.
 *
 * One file per wallet rather than one shared file: pairing data includes a
 * secret key, and there's no reason for every wallet's file to need touching
 * whenever any single one re-pairs.
 */
function pairingFilePath(walletName) {
  const safe = String(walletName || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(app.getPath('userData'), `pairing_${safe}.json`);
}

/**
 * Last-resort wallet-list recovery, from the per-wallet pairing files.
 *
 * Added 2026-08-29 after wallets.json AND wallets.json.bak were both
 * unreadable at the same moment — while pairing_martins.json and
 * pairing_rahmita.json sat there perfectly intact. The wallet NAME is in the
 * filename, so the list was fully recoverable and the app told the user it
 * had nothing anyway.
 *
 * These files are the better source precisely because they are boring: they
 * are written only when a wallet is paired, not on every status tick, so they
 * are almost never mid-write when something goes wrong. Counters come back as
 * zero and the balance as a placeholder — the miner re-reads both from chain
 * within seconds of opening, and a stale zero is infinitely better than an
 * empty launcher.
 */
function recoverWalletsFromPairingFiles() {
  try {
    const dir = app.getPath('userData');
    const recovered = [];
    for (const entry of fs.readdirSync(dir)) {
      const m = /^pairing_(.+)\.json$/.exec(entry);
      if (!m) continue; // skips the .bak and .tmp siblings by construction
      const read = readJsonResilient(path.join(dir, entry), 'recover ' + entry);
      if (!read.ok || !read.value || !read.value.miningKeys) continue;
      recovered.push({
        name: read.value.anWalletName || m[1],
        sessions: 0,
        taps: 0,
        balance: '—',
        isMining: false,
        history: [],
      });
    }
    return recovered;
  } catch (e) {
    console.warn('[launcher] pairing-file recovery failed: ' + e.message);
    return [];
  }
}

ipcMain.on('pairing:readSync', (event, walletName) => {
  try {
    const p = pairingFilePath(walletName);
    const read = readJsonResilient(p, `pairing:readSync(${walletName})`);
    if (!read.ok) {
      // Returning null here sends an already-paired wallet back to the "Connect
      // to Acki Nacki Mainnet" QR screen, so it must mean "this wallet has
      // genuinely never been paired" and nothing else. readJsonResilient has
      // already retried and tried the backup before we get here.
      event.returnValue = null;
      return;
    }
    const parsed = read.value;
    console.log(`[launcher] pairing:readSync(${walletName}) -> found, keys present=` +
      `${!!(parsed && parsed.miningKeys)}${read.recovered ? ' (via backup)' : ''}`);
    event.returnValue = parsed;
  } catch (e) {
    console.error(`[launcher] pairing:readSync(${walletName}) FAILED: ${e.message}`);
    event.returnValue = null;
  }
});

ipcMain.handle('pairing:write', (event, walletName, data) => {
  try {
    if (!walletName || !data) return false;
    writeJsonAtomic(pairingFilePath(walletName), data);
    return true;
  } catch (e) {
    console.warn(`[launcher] pairing:write(${walletName}) failed: ${e.message}`);
    return false;
  }
});

/**
 * Small app-wide settings — currently just the language — as a plain file.
 *
 * localStorage (Chromium's LevelDB, inside the same profile as the wallet
 * list) turned out to be unreliable this session: repeatedly force-killing
 * the app while testing left its write-ahead log torn mid-write more than
 * once (a fresh empty .log segment appeared after almost every kill), and a
 * corrupted LevelDB can hand different opens a different last-good state --
 * which is exactly "it shows Chinese for one launch and English for
 * another, from the same profile, with no other explanation." A plain JSON
 * file written with a single synchronous fs call cannot end up in that
 * state the way an LSM-tree database recovering a torn log can.
 */
function settingsFilePath() {
  return path.join(app.getPath('userData'), 'settings.json');
}
function readSettings() {
  try {
    const read = readJsonResilient(settingsFilePath(), 'settings.json');
    if (!read.ok) return {};
    return (read.value && typeof read.value === 'object') ? read.value : {};
  } catch (e) { return {}; }
}
ipcMain.on('settings:getSync', (event) => {
  event.returnValue = readSettings();
});
ipcMain.handle('settings:set', (event, key, value) => {
  try {
    const s = readSettings();
    s[key] = value;
    writeJsonAtomic(settingsFilePath(), s);
    return true;
  } catch (e) {
    console.warn('[launcher] Could not write settings:', e.message);
    return false;
  }
});

// IPC handlers
ipcMain.on('renderer-error', (event, data) => {
  console.error(`[Renderer error] ${data.source || 'unknown'}:`, data.message, data.stack || '');
});

ipcMain.on('miner-status', (event, data) => {
  const { wallet, isMining, taps, sessions, balance, remaining } = data;
  walletData[wallet] = { isMining, taps, sessions, balance, remaining };

  if (launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.webContents.send('wallet-update', data);
  }

  updateTray();
  updatePowerBlocker();
});

ipcMain.on('open-miner', (event, walletName) => {
  createMinerWindow(walletName);
});

ipcMain.on('stop-miner', (event, walletName) => {
  if (minerWindows[walletName] && !minerWindows[walletName].isDestroyed()) {
    minerWindows[walletName].webContents.send('command-stop');
  }
});

ipcMain.on('focus-miner', (event, walletName) => {
  if (minerWindows[walletName]) {
    minerWindows[walletName].show();
    minerWindows[walletName].focus();
  }
});

// App lifecycle
app.whenReady().then(() => {
  registerBeeEngineIpc();
  createLauncher();
  createTray();
  // Deliberately opens NO wallet on startup. This used to auto-open a
  // hard-coded personal wallet name, which meant a fresh install on someone
  // else's machine popped a miner window for an account they do not own.
  // The launcher lists whatever wallets the user has added (an empty list on
  // first run) and they choose which to open.

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createLauncher();
    }
  });
});

app.on('window-all-closed', () => {});

app.on('before-quit', () => {
  isQuitting = true;
});
