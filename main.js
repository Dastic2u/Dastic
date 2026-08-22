const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 950,
    height: 850,
    minWidth: 850,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'icon.ico'),
    show: true,
    title: 'Dastic'
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });
}

function createTray() {
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'));
    if (trayIcon.isEmpty()) throw new Error('Empty icon');
  } catch (e) {
    const base64Icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAXklEQVQ4T2NkYGD4z0ABYBw1gGE0DGBg+M9AUgNMotUNwKYeWYBYN8DkUdIAk0fVAGQ1o+oBskGoGkBWiK4HyAahagBZIboGIFuEqgHIVqFqALKVqBqAbCXyLwEAzG8nE8T2+VIAAAAASUVORK5CYII=';
    trayIcon = nativeImage.createFromDataURL(base64Icon);
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Dastic - NACKL Miner');
  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function updateTrayMenu() {
  const miningStatus = global.miningStatus || 'Idle';
  const sessions = global.sessionsCount || 0;

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Dastic', enabled: false },
    { type: 'separator' },
    { label: `Status: ${miningStatus}`, enabled: false },
    { label: `Sessions: ${sessions}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Hide Window',
      click: () => {
        if (mainWindow) mainWindow.hide();
      }
    },
    { type: 'separator' },
    {
      label: 'Start Mining',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('tray-start-mining');
        }
      }
    },
    {
      label: 'Stop Mining',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('tray-stop-mining');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

ipcMain.on('update-tray', (event, data) => {
  global.miningStatus = data.status;
  global.sessionsCount = data.sessions;
  if (tray) {
    tray.setToolTip(`Dastic — ${data.status} | Sessions: ${data.sessions}`);
    updateTrayMenu();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});
