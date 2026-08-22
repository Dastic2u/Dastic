/**
 * Bee Engine — main-process router to a hidden bridge window.
 *
 * @teamgosh/bee-sdk's WASM binary needs a genuine browser `window`
 * (its HTTP layer calls web_sys::window() internally — a plain Node
 * polyfill object doesn't satisfy Rust's type check, confirmed by
 * testing `global.window = globalThis` in plain Node: WASM init still
 * succeeds, but any network call fails with "Can not get `window`").
 * So the SDK can't run in Electron's main process for anything beyond
 * local key generation.
 *
 * It also can't run in a normal nodeIntegration:true renderer — that
 * hard-crashes the whole renderer process (confirmed: exitCode
 * -2147483645 / STATUS_BREAKPOINT), even with every fetch()-avoidance
 * fix applied. The suspected cause is Node's globals (require, module,
 * process) being present alongside browser globals confusing this
 * wasm-bindgen "web" target build's environment detection.
 *
 * The fix: run the SDK in a hidden BrowserWindow with
 * nodeIntegration:false + contextIsolation:true — a genuine, unmodified
 * browser environment (real `window`, no Node globals at all) — loaded
 * via a real `<script type="module">` so ESM/WASM resolution matches
 * what the package expects. Every mining window's Bee Engine calls are
 * routed through this one hidden bridge window over IPC.
 */

const path = require('path');
const { ipcMain, BrowserWindow } = require('electron');
const BEE_ENGINE_CONFIG = require('./bee-engine-config');

let bridgeWindow = null;
let bridgeReadyPromise = null;
let requestCounter = 0;
const pendingRequests = new Map(); // requestId -> { resolve, action, timer }
const eventSenders = new Map();    // sessionKey -> webContents (for forwarding mining events)

/**
 * Settle every outstanding bridge request with a failure.
 *
 * Called when the bridge renderer dies. Without it those promises stayed
 * unsettled for the life of the app, because the only code that ever resolved
 * one was the response handler in a renderer that no longer exists.
 */
function failAllPending(reason) {
  if (pendingRequests.size === 0) return;
  console.error(`[BeeBridge] Failing ${pendingRequests.size} in-flight request(s): ${reason}`);
  for (const [requestId, pending] of pendingRequests) {
    if (pending.timer) clearTimeout(pending.timer);
    pendingRequests.delete(requestId);
    pending.resolve({ success: false, error: reason, bridgeUnavailable: true });
  }
}

function createBridgeWindow() {
  if (bridgeReadyPromise) return bridgeReadyPromise;

  bridgeWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'bee-bridge-preload.js'),
      // NOT optional for this window. Chromium throttles timers on a page it
      // considers background — clamped to ~1/second, then to ~1/minute after
      // five minutes of "intensive throttling" — and this window is created
      // `show: false` and is NEVER shown, so it qualifies permanently.
      //
      // Every wallet's Miner lives here, and the SDK is timer-driven
      // throughout: its chain-event poller is TimeoutFuture::new(2500) and its
      // "wait for the Submitting slot" loop is TimeoutFuture::new(1000), both
      // of which compile to setTimeout. Under intensive throttling a 2.5s
      // poll becomes a 60s poll, which starves the seed queue and delays the
      // SessionInterval that a submitted root is blocked on — i.e. exactly the
      // stall class this project spent a day chasing.
      backgroundThrottling: false
    }
  });

  bridgeReadyPromise = bridgeWindow.loadFile('bee-bridge.html').then(() => bridgeWindow);

  bridgeWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[BeeBridge] RENDERER PROCESS GONE:', details.reason, details);
    bridgeWindow = null;
    bridgeReadyPromise = null;
    // The responder is gone, so nothing will ever resolve these. Settle them
    // now: the next createBridgeWindow() rebuilds the bridge, and a caller that
    // got a failure retries into the new one instead of awaiting the old one
    // forever.
    failAllPending('the Bee Engine bridge process went away (' + details.reason + ')');
  });
  bridgeWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // Same wall-clock stamp as launcher.js's forwarders, so bridge/SDK lines
    // and renderer lines in one run log can be ordered and timed against each
    // other. See logStamp() there for why every line needs it.
    const d = new Date();
    const p = (n, w = 2) => String(n).padStart(w, '0');
    const ts = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
    console.log(`[${ts}][BeeBridge][console:${level}] ${sourceId}:${line} ${message}`);
  });

  ipcMain.on('bee-bridge:response', (event, payload) => {
    const { requestId } = payload;

    // Mining events use requestId "event:<sessionKey>" and aren't a
    // one-shot request/response — forward them to whichever renderer
    // started that session instead of resolving a pending promise.
    if (typeof requestId === 'string' && requestId.startsWith('event:')) {
      const sessionKey = requestId.slice('event:'.length);
      const sender = eventSenders.get(sessionKey);
      if (sender && !sender.isDestroyed()) {
        sender.send(`bee:miningEvent:${sessionKey}`, payload.event);
      }
      return;
    }

    const pending = pendingRequests.get(requestId);
    if (!pending) return;
    if (pending.timer) clearTimeout(pending.timer);
    pendingRequests.delete(requestId);
    pending.resolve(payload);
  });

  return bridgeReadyPromise;
}

/**
 * Send one request to the bridge and wait for its answer — or for the budget to
 * run out.
 *
 * The timeout is the point. This resolves rather than rejects on expiry so every
 * existing caller keeps its `if (!result.success)` shape, and it flags the result
 * with `bridgeTimeout` so a caller that cares can tell "the bridge is not
 * answering" apart from "the chain said no".
 */
async function bridgeRequest(action, args) {
  await createBridgeWindow();
  const requestId = 'req:' + (++requestCounter);
  const budgetMs = BEE_ENGINE_CONFIG.BRIDGE_TIMEOUT_MS[action] ||
                   BEE_ENGINE_CONFIG.BRIDGE_TIMEOUT_MS.DEFAULT;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      console.error(`[BeeBridge] ${action} did not answer within ${budgetMs}ms — abandoning it. ` +
        `${pendingRequests.size} other request(s) still in flight. A hung bridge call used to ` +
        'stall the caller for the rest of the run.');
      resolve({
        success: false,
        error: `the Bee Engine bridge did not answer ${action} within ${Math.round(budgetMs / 1000)}s`,
        bridgeTimeout: true
      });
    }, budgetMs);
    // Unref'd so a pending bridge call can never be the reason the app won't
    // quit. Electron's main process is long-lived either way, but a timer that
    // holds the event loop open for two minutes after the last window closed is
    // a visible hang on shutdown.
    if (typeof timer.unref === 'function') timer.unref();

    pendingRequests.set(requestId, { resolve, action, timer });
    bridgeWindow.webContents.send('bee-bridge:request', { requestId, action, args });
  });
}

function registerBeeEngineIpc() {
  ipcMain.handle('bee:generateMiningKeys', async (event, { appId }) => {
    return bridgeRequest('generateMiningKeys', { appId });
  });

  ipcMain.handle('bee:waitForKeyPropagation', async (event, args) => {
    eventSenders.set(args.sessionKey, event.sender);
    return bridgeRequest('waitForKeyPropagation', args);
  });

  ipcMain.handle('bee:rebuildMinerInstance', async (event, args) => {
    eventSenders.set(args.sessionKey, event.sender);
    return bridgeRequest('rebuildMinerInstance', args);
  });

  ipcMain.handle('bee:verifyMiningOwner', async (event, args) => {
    return bridgeRequest('verifyMiningOwner', args);
  });

  ipcMain.handle('bee:verifyFirstTap', async (event, args) => {
    return bridgeRequest('verifyFirstTap', args);
  });

  ipcMain.handle('bee:startMining', async (event, args) => {
    eventSenders.set(args.sessionKey, event.sender);
    return bridgeRequest('startMining', args);
  });

  ipcMain.handle('bee:addTap', async (event, args) => {
    return bridgeRequest('addTap', args);
  });

  ipcMain.handle('bee:stopMining', async (event, args) => {
    return bridgeRequest('stopMining', args);
  });

  ipcMain.handle('bee:canStart', async (event, args) => {
    return bridgeRequest('canStart', args);
  });

  ipcMain.handle('bee:getRewards', async (event, args) => {
    return bridgeRequest('getRewards', args);
  });

  ipcMain.handle('bee:getMinerData', async (event, args) => {
    return bridgeRequest('getMinerData', args);
  });

  ipcMain.handle('bee:getCurrentBlock', async (event, args) => {
    return bridgeRequest('getCurrentBlock', args);
  });

  ipcMain.handle('bee:getBalance', async (event, args) => {
    return bridgeRequest('getBalance', args);
  });

  // Wallet-side reads (the USER's own account, via the SDK's Wallet class) —
  // distinct from every handler above, which drive the miner slot.
  ipcMain.handle('bee:getWalletProfile', async (event, args) => {
    return bridgeRequest('getWalletProfile', args);
  });

  ipcMain.handle('bee:getWalletBalance', async (event, args) => {
    return bridgeRequest('getWalletBalance', args);
  });

  ipcMain.handle('bee:getWalletHistory', async (event, args) => {
    return bridgeRequest('getWalletHistory', args);
  });
}

module.exports = { registerBeeEngineIpc };
