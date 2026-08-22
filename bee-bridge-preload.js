/**
 * Preload for the hidden Bee Engine bridge window.
 *
 * Runs with contextIsolation:true and nodeIntegration:false — this
 * window has no Node globals at all, only a genuine browser `window`,
 * which is what @teamgosh/bee-sdk's WASM binary needs for its HTTP
 * layer (web_sys::window()). Exposes a minimal IPC pipe so the bridge
 * page can receive requests from main and send back responses without
 * touching Node directly.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('beeIPC', {
  onRequest: (callback) => {
    ipcRenderer.on('bee-bridge:request', (event, payload) => callback(payload));
  },
  sendResponse: (payload) => {
    ipcRenderer.send('bee-bridge:response', payload);
  }
});
