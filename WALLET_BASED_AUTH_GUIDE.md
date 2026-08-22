# 🐝 Wallet-Based Authentication Guide

## Architecture Clarification

### Before (Confusion):
- Users needed to know dapp ID
- Non-technical for regular users
- Hard to explain

### After (Correct Model): ✅
```
APP CREATOR (You):
├─ Registers dapp in Acki Nacki ecosystem
├─ Gets DAPP ID from team
├─ Adds DAPP ID to .env file
├─ Builds and deploys the app
└─ Shares with public

REGULAR USERS:
├─ Download Dastic miner
├─ Click "🔐 Authorize Wallet"
├─ Scan QR code with Acki Nacki Wallet
├─ Confirm authorization
└─ Start mining! No dapp ID needed
```

---

## 🔑 The Two Authentication Methods

### 1. **Creator Setup** (ONE TIME)
```
You:
  Set BEE_APP_ID=your_dapp_id in .env
  Build: npm run build
  Upload: To GitHub
  Done! ✅
```

### 2. **User Authentication** (EACH SESSION)
```
User:
  Download installer
  Run Dastic
  Click "🔐 Authorize Wallet"
  Scan QR code with wallet app
  Confirm in wallet
  Mining starts! ✅
```

---

## 📱 User Flow (Regular User - Not You)

```
Step 1: User Downloads
  ├─ Goes to GitHub Releases
  ├─ Downloads: Dastic Setup 1.0.0.exe
  └─ Runs installer

Step 2: User Opens App
  ├─ Clicks wallet "⛏️ Launch"
  ├─ Mining window opens
  └─ Shows: "Mining as: alice"

Step 3: User Authorizes (First Time Only)
  ├─ Clicks: "🔐 Setup / Change" OR "🔐 Authorize Wallet"
  ├─ Modal appears with instructions
  ├─ User scans QR code
  ├─ Acki Nacki Wallet opens
  ├─ User confirms permission
  ├─ App receives authorization
  └─ Authorization saved in localStorage

Step 4: User Mines
  ├─ Clicks: "⛏️ START MINING"
  ├─ Mining countdown: 05:30
  ├─ Taps tracked: 0/70
  ├─ Session ends after duration
  ├─ Shows: "+0.001234 NACKL" earned
  ├─ Wallet Balance updated
  ├─ Auto-restarts next session (if enabled)
  └─ Or user clicks START for next session

Step 5: Repeat Forever
  └─ Earn NACKL forever! 🎉
```

---

## 🎯 What Regular Users See

### Main Mining Window:

```
🐝 Mining as alice

        ⛑️
       ⛏️

Sessions    Taps        Session Reward
0           0           0.0000 NACKL

        05:30
    Ready to mine

[⛏️ START MINING]

⚙️ Settings
🔐 Bee Engine Setup  [Setup / Change]
⏱️ Session Timing    (Controlled by Bee Engine)
Taps per Session     [70 ▼]
💤 Background Mining [Always ▼]
⚡ Low CPU Mode      [Off ▼]
🔄 Auto-Loop         [On ▼]

💰 Total Wallet Balance (NACKL)
                0.0000

📜 Session History
[Clear]
Session #1: 70 taps    [15:32]  +0.001234 NACKL
Session #2: 70 taps    [15:05]  +0.001098 NACKL
```

### Authorization Modal (First Time):

```
┌─────────────────────────────────────┐
│ 🔐 Bee Engine Authorization         │
│                                     │
│ ✅ Just scan the QR code with your  │
│ Acki Nacki Wallet!                  │
│                                     │
│ No dapp ID needed to mine. Click    │
│ "Authorize" below and confirm in    │
│ your wallet.                        │
│                                     │
│ Note: Only the app creator needs    │
│ a dapp ID to register this app in   │
│ Acki Nacki ecosystem.              │
│                                     │
│ [Cancel]  [🔐 Authorize Wallet]    │
└─────────────────────────────────────┘
```

---

## 🔐 Wallet Authorization Flow

```
User clicks "Authorize Wallet"
  ↓
App generates mining key pair
  ↓
Deep link to Acki Nacki Wallet
  ├─ Option 1: QR code scan
  └─ Option 2: Click link
  ↓
User's wallet opens
  ↓
Shows: "Authorize Dastic Miner?"
  ↓
User confirms
  ↓
Keys written to Miner contract
  ↓
App waits for blockchain confirmation
  ↓
App sends first tap to verify
  ↓
✅ Authorization complete!
  ↓
"Ready to mine" message shows
```

---

## 💾 What Gets Stored

### localStorage (Per Wallet):
```
bee_mining_keys_alice: {
  public: "0x12345...",
  secret: "0xabcde...",
  generatedAt: 1234567890
}

bee_miner_address_alice: "0:abc123..."

nacklepick_miner_alice: {
  sessions: 5,
  totalTaps: 350,
  balance: 0.00567,
  history: [
    { taps: 70, reward: 0.001234, time: "15:32" },
    ...
  ]
}
```

### Nothing on Blockchain Until User Confirms
- Private keys: Stored locally only
- Wallet: Managed by user's wallet app
- Authorization: One-time confirmation

---

## 🚀 Creator Setup (Your Part)

**This only happens ONCE when you release the app:**

```bash
# 1. Get your dapp ID from Acki Nacki team
# Email: https://t.me/EugeneDAO
# Provide: App name, link, logo

# 2. Add to .env file
echo BEE_APP_ID=your_dapp_id_12345 > .env

# 3. Build
npm install
npm run build

# 4. Upload to GitHub
git push origin main
# Create release with EXE

# DONE! Users can now download and use ✅
```

**That's all creator needs to do.**

---

## 📊 Session History Detail

Each session shows:

```
Session #5: 70 taps    [15:32]  +0.001234 NACKL
           └─────┬────┘  └────┬────┘  └────┬─────┘
        Taps in session  Time completed  NACKL earned
```

**Session Calculation:**
```
Taps per session:    70 (user choice)
Session duration:    330 seconds (5:30) - Bee Engine controlled
Taps interval:       330 / 70 = 4.7 seconds per tap
Rewards:             Real from Miner contract
Stored:              In wallet history forever
```

---

## 🎯 Key Points

| Aspect | Before | After | Status |
|--------|--------|-------|--------|
| User needs dapp ID | ❌ YES | ✅ NO | Fixed |
| Setup complexity | Complex | Simple | Fixed |
| Auth method | Dapp ID entry | Wallet scan | Better |
| Creator needs dapp ID | NO | ✅ YES | Correct |
| Wallet balance shown | NO | ✅ YES | Added |
| Session reward shown | NO | ✅ YES | Added |
| Taps per session shown | NO | ✅ YES | Added |
| Auto-restart sessions | YES | ✅ YES | Kept |
| Session duration | Configurable | ✅ Bee Engine | Real |

---

## 🔄 Auto-Restart Feature

**Setting: "🔄 Auto-Loop Sessions"**

```
Off (Manual Restart):
├─ Session ends
├─ Shows reward
├─ User clicks START for next session
└─ Requires manual action each time

On (Continuous Mining) ← DEFAULT:
├─ Session ends
├─ Shows: "🔄 Starting next session..."
├─ 2 second pause
├─ Mining starts automatically
├─ User can minimize to tray
└─ Continuous 24/7 mining possible
```

**Perfect for:**
- Background mining
- Overnight mining
- Minimal interaction needed
- Just set it and forget it! 🐝

---

## 🎓 What Users Learn

1. **First launch**: See authorization modal, scan QR, done
2. **Settings**: Auto-loop ON by default (continuous mining)
3. **Mining**: Watch countdown, see taps accumulate
4. **History**: View all sessions + rewards earned
5. **Wallet**: See total NACKL balance
6. **Repeat**: Sessions auto-restart if enabled

---

## ✅ No Changes Needed for Users

All user features already implemented:
- ✅ Wallet scan authorization
- ✅ No dapp ID needed
- ✅ Session tracking
- ✅ Reward display
- ✅ Wallet balance display
- ✅ Session history
- ✅ Auto-restart
- ✅ Background mining

---

## 🚀 To Release to Public

**Creator (You):**
```bash
1. Get dapp ID from team
2. echo BEE_APP_ID=your_id > .env
3. npm install && npm run build
4. git push && upload EXE to GitHub
```

**Users (Public):**
```
1. Download from GitHub
2. Run installer
3. Click wallet "Launch"
4. Click "Authorize Wallet"
5. Scan QR code
6. Mine! 🎉
```

---

## 💡 Architecture Summary

```
┌──────────────────────────────────────────┐
│     You (App Creator)                    │
│  Set BEE_APP_ID in .env                  │
│  Build: npm run build                    │
│  Upload: Dastic Setup 1.0.0.exe      │
│  Dapp registered in Acki Nacki network   │
└────────────┬─────────────────────────────┘
             │
             ↓ Users download
       ┌─────────────────┐
       │ Public Users    │
       │ (Anyone)        │
       │  ↓ Launch app   │
       │  ↓ Scan QR      │
       │  ↓ Mine! 🐝     │
       └─────────────────┘
```

---

## FAQ

**Q: Do users need to know about dapp ID?**
A: NO! Never mention it to them. It's creator-only.

**Q: How do users authorize?**
A: Scan QR code with Acki Nacki Wallet. That's it.

**Q: Can users on same PC mine?**
A: YES! Each user launches their own wallet, gets independent authorization.

**Q: What if user minimizes?**
A: If "Background Mining" = "When Minimized", mining continues in tray.

**Q: Sessions restart automatically?**
A: YES! If "Auto-Loop" = On (default).

**Q: How long is each session?**
A: 330 seconds (5:30 minutes) - controlled by Bee Engine, not user.

**Q: Can user change session length?**
A: NO - Bee Engine controls it. This is by design (blockchain controlled).

**Q: Where is NACKL balance shown?**
A: Bottom of stats grid - "💰 Total Wallet Balance".

**Q: Where is session reward shown?**
A: Stats grid - "This Session" column updates after each session.

**Q: How does history work?**
A: Shows all past sessions with taps and rewards earned.

---

**Everything is ready for public release! 🚀**

Users just need to download and scan their wallet. Simple, secure, decentralized.
