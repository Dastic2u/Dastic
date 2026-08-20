NACKLEPICK — SETUP, BUILD & GITHUB INSTRUCTIONS
================================================

STEP 1: INSTALL DEPENDENCIES
----------------------------
Open Command Prompt and go to your miner folder:

    D:
    cd D:\miner
    npm install
    npm install --save-dev electron-builder

STEP 2: RUN IN DEVELOPMENT MODE
--------------------------------
    npm start

STEP 3: BUILD THE .EXE INSTALLER
---------------------------------
    npm run build

This creates a "dist" folder with:
- NacklePick Setup.exe        <- Installer for any PC
- win-unpacked/NacklePick.exe  <- Portable .exe (no install)

STEP 4: ADD TO GITHUB
---------------------
1. Go to https://github.com/new
2. Repository name: nacklepick
3. Make it Public or Private
4. Click "Create repository"
5. In Command Prompt (in your D:\miner folder):

    git init
    git add .
    git commit -m "NacklePick v2.0 - Acki Nacki Bee Engine Miner"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/nacklepick.git
    git push -u origin main

Replace YOUR_USERNAME with your actual GitHub username.

STEP 5: GET APP_DAPP_ID FROM ACKI NACKI
----------------------------------------
Contact Acki Nacki dev team and provide:

1. App name: NacklePick
2. App link: https://github.com/YOUR_USERNAME/nacklepick
3. Logo: logo.webp (included in this folder)

Contact methods:
- Telegram: t.me/ackinacki
- Dev portal: dev.ackinacki.com

They will reply with your app_dapp_id.

STEP 6: CONNECT REAL BEE ENGINE
--------------------------------
Once you have app_dapp_id:

1. Open index.html
2. Replace YOUR_APP_DAPP_ID_HERE with your real ID
3. Run: npm install @teamgosh/bee-sdk
4. Uncomment the real Bee Engine code block (marked with "STAGE 2")
5. Rebuild: npm run build

FILES IN THIS PROJECT
----------------------
- package.json     : Project config with build settings
- main.js          : Desktop window + system tray
- index.html       : Full UI with miner animation
- icon.png         : Logo image (256x256)
- icon.ico         : Windows icon file (multi-size)
- logo.webp        : Logo in WEBP format (for Acki Nacki submission)
- README.txt       : This file

FEATURES
---------
✅ Animated miner character (mines when active, sleeps when idle)
✅ NacklePick logo in header
✅ Session stats + total sessions counter
✅ Era display with 24h countdown timer
✅ Reward history with timestamps
✅ Donation button with wallet address copy
✅ System tray (minimize/close hides to tray)
✅ Tray right-click menu with Start/Stop/Show/Quit
✅ Auto-loop sessions
✅ Session duration setting

TROUBLESHOOTING
---------------
- "npm is not recognized" -> Restart after Node.js install
- Tray icon missing -> Check Windows system tray overflow (^ arrow)
- Build fails -> Make sure electron-builder is installed
- Git not recognized -> Download from https://git-scm.com/download/win
- Emojis not showing -> Windows 10+ required for full emoji support
