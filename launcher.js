const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');

let launcherWindow = null;
let tray = null;
let minerWindows = {};
let walletData = {};
let isQuitting = false;

const iconPath = path.join(__dirname, 'icon.ico');
const iconGreenPath = path.join(__dirname, 'icon-green.ico');

function createLauncher() {
  launcherWindow = new BrowserWindow({
    width: 700,
    height: 600,
    minWidth: 600,
    minHeight: 500,
    title: 'NacklePick Launcher',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  launcherWindow.setMenu(null);
  launcherWindow.loadFile('index.html');

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
    title: `NacklePick - ${walletName}`,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      additionalArguments: [`--wallet=${walletName}`]
    }
  });

  minerWin.setMenu(null);
  minerWin.loadFile('miner.html', { query: { wallet: walletName } });

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
  tray.setToolTip('NacklePick');
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

function updateTray() {
  if (!tray) return;

  const isMining = anyMinerActive();
  try {
    tray.setImage(isMining ? iconGreenPath : iconPath);
  } catch (e) {}

  const activeMiners = Object.keys(minerWindows).filter(name => {
    const data = walletData[name];
    return data && data.isMining;
  });

  const minerItems = activeMiners.map(name => ({
    label: `⛏️ ${name}`,
    click: () => {
      if (minerWindows[name]) {
        minerWindows[name].show();
        minerWindows[name].focus();
      }
    }
  }));

  const allWallets = Object.keys(walletData);
  const launchItems = allWallets.map(name => ({
    label: `${minerWindows[name] ? '●' : '○'} ${name}`,
    click: () => createMinerWindow(name)
  }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'NacklePick', enabled: false },
    { type: 'separator' },
    ...(activeMiners.length > 0 ? [
      { label: 'Active Miners:', enabled: false },
      ...minerItems,
      { type: 'separator' }
    ] : []),
    { label: 'Launch Wallet:', enabled: false },
    ...launchItems,
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
    tray.setToolTip(`NacklePick\n⛏️ ${activeMiners.length} active miner${activeMiners.length > 1 ? 's' : ''}`);
  } else {
    tray.setToolTip('NacklePick');
  }
}

ipcMain.on('miner-status', (event, data) => {
  const { wallet, isMining, taps, sessions, balance, remaining } = data;
  walletData[wallet] = { isMining, taps, sessions, balance, remaining };

  if (launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.webContents.send('wallet-update', data);
  }

  updateTray();
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

app.whenReady().then(() => {
  createLauncher();
  createTray();

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
