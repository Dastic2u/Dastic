const { app, BrowserWindow, Tray, Menu, ipcMain, powerSaveBlocker } = require('electron');
const path = require('path');
const fs = require('fs');

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

// Electron derives userData from productName, so renaming the app to Dastic
// would silently point it at a brand-new empty folder — losing the saved
// pairing, mining keys and session data and forcing a re-pair. Pin it to the
// original folder so the rename stays cosmetic. Must run before whenReady().
// Only remove this alongside a real migration that copies the folder across.
app.setPath('userData', path.join(app.getPath('appData'), 'NacklePick'));

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
  launcherWindow.loadFile('index.html');

  launcherWindow.once('ready-to-show', () => {
    // Windows can silently minimize a window created by a process that
    // never had OS foreground focus (e.g. launched from a background
    // shell). Force it visible and focused so it's never invisibly stuck.
    if (launcherWindow.isMinimized()) launcherWindow.restore();
    launcherWindow.show();
    launcherWindow.focus();
  });

  launcherWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[launcher] RENDERER PROCESS GONE:', details.reason, details);
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
    minerWin.show();
    minerWin.focus();
  });

  minerWin.webContents.on('render-process-gone', (event, details) => {
    console.error(`[${walletName}] RENDERER PROCESS GONE:`, details.reason, details);
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
