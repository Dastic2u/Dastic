NACKLEPICK MINER v5.3
=====================

A multi-wallet desktop NACKL miner built with Electron.

FEATURES
--------
- Multi-instance mining: Each wallet runs in its own window
- Live stats on launcher: See sessions, taps, and balance for all wallets
- Stop from launcher: Stop any miner without opening its window
- System tray with green active indicator
- Animated miner: Character swings pickaxe while mining, sleeps when idle
- Taps preset selector: 70, 80, 90, 100, or custom taps per session
- Auto-loop: Automatically start new sessions
- Per-wallet history: Each wallet tracks its own session history
- Local storage: All data saved between app restarts
- Unlimited wallets: Completely free, no payment required

FILES
-----
- package.json        : Project config and build settings
- launcher.js         : Main Electron process (windows, tray, IPC)
- index.html          : Launcher UI with wallet cards and live stats
- miner.html          : Individual miner window with animation
- icon.ico            : Windows app icon (used for .exe and tray)
- icon-green.ico      : Green tray icon shown when mining is active
- icon.png            : PNG version of icon
- icon-green.png      : PNG version of green icon
- logo.webp           : Logo for Acki Nacki submission

INSTALL & RUN (Development)
---------------------------
1. Install Node.js from https://nodejs.org (LTS version)
2. Open Command Prompt and go to this folder:
     cd D:\nacklepick-miner
3. Install dependencies:
     npm install
4. Run the app:
     npm start

BUILD .EXE (Production)
-----------------------
STEP 1: Install electron-builder (one time only)
     npm install --save-dev electron-builder

STEP 2: Build the Windows installer and portable .exe
     npm run build

STEP 3: Find your built files in the dist/ folder:

  dist/NacklePick Setup.exe          <-- Installer (share this)
     - Double-click to install on any PC
     - Creates Start Menu shortcut
     - Creates Desktop shortcut

  dist/win-unpacked/NacklePick.exe   <-- Portable (no install needed)
     - Copy this file to a USB stick
     - Run directly on any Windows PC
     - No installation required

IMPORTANT: If build fails with "icon not found", make sure icon.ico
is in the same folder as package.json.

HOW TO USE
----------
1. Launcher opens showing your wallets (default: "martins")
2. Click "Launch" to open a miner window
3. In Settings, choose your taps preset (70, 80, 90, 100, or Custom)
4. Click "START MINING" in the miner window
5. The timer counts down, miner swings pickaxe, sparkles fly
6. Close the miner window (X) -> it hides to tray and keeps mining
7. Check the launcher -> live stats update automatically
8. Click "Stop" on launcher -> stops that wallet's miner
9. Right-click tray icon -> see all active miners, open launcher, or quit
10. Add as many wallets as you want - completely free

SUPPORT
-------
This app is 100% free with unlimited wallets.
If you find it useful, donations are appreciated:

☕ Support martins:
martins(ackinacki)

NOTES
-----
- This is Stage 1 (simulated mining). Real Bee Engine integration comes
  when you receive your app_dapp_id from Acki Nacki.
- To integrate real mining, install @teamgosh/bee-sdk and replace the
  simulated timer with bee_engine_miner.start() calls.
