# 🔄 User Flow Clarification - Dapp ID vs Wallet Scanning

## Critical Distinction

### **Creator (You)** 🏗️
- Needs: **Dapp ID** (to register app in Acki Nacki ecosystem - ONE TIME)
- Action: Register app with Acki Nacki team
- Result: Get dapp ID, use to build app

### **End Users** 👥
- Needs: **Nothing** (dapp ID is NOT needed)
- Action: Scan QR code with their own wallet
- Result: Start mining immediately!

---

## The Workflows

### CREATOR WORKFLOW (One Time Setup)

```
You (Creator)
  ↓
Contact Acki Nacki team: https://t.me/EugeneDAO
  ↓
Provide:
├─ App name: "NacklePick Miner"
├─ App link: Your GitHub/website
└─ Logo: In WebP format
  ↓
Receive: Dapp ID (e.g., "0x123abc...")
  ↓
Add to your .env file:
├─ BEE_APP_ID=0x123abc...
  ↓
Build EXE: npm run build
  ↓
Upload to GitHub
  ↓
DONE! App is ready for public
```

**Dapp ID is used by:**
- App initialization (backend)
- Binding mining keys to app
- Registering app in ecosystem

**Dapp ID is NOT given to users.**

---

### USER WORKFLOW (For Each User)

```
User downloads NacklePick from GitHub
  ↓
Runs: NacklePick Setup 1.0.0.exe
  ↓
Opens app
  ↓
Sees: "👤 Click 🔐 Setup to connect your wallet and start mining."
  ↓
Clicks: "🔐 Connect Wallet" button
  ↓
Modal appears:
├─ Title: "🔐 Bee Engine Authorization"
├─ Message: "✅ Just scan the QR code with your Acki Nacki Wallet!"
└─ Button: "🔐 Authorize Wallet"
  ↓
Clicks: "🔐 Authorize Wallet"
  ↓
QR code appears (or deep link)
  ↓
User scans with their Acki Nacki Wallet
  ↓
Wallet confirms authorization
  ↓
App shows: "✅ Ready to mine! Wallet authorized."
  ↓
User clicks: "⛏️ START MINING"
  ↓
Bee Engine mining starts (5:30 minutes)
  ↓
User can minimize - mining continues
  ↓
Session completes: "+X.XXXXX NACKL earned"
  ↓
Auto-loops to next session
  ↓
User earns NACKL continuously! 💰
```

**Users are NOT asked for:**
- Dapp ID ❌
- App ID ❌
- Any credentials ❌

**Users only:**
- Scan QR code ✅
- Confirm in wallet ✅
- Start mining ✅

---

## Updated UI Flow

### Before Clicking "Setup"
```
👤 NacklePick Miner
⛏️ Mining as: wallet_name

Mining Status:
├─ Sessions: 0
├─ Taps: 0
├─ Wallet Balance: 0.0000 NACKL
└─ This Session: 0.000000 NACKL

Timer: 05:30
Status: "👤 Click 🔐 Setup to connect your wallet and start mining."

Controls:
└─ [⛏️ START MINING] (disabled)

Settings:
├─ 🔐 Wallet Authorization: [🔐 Connect Wallet]
├─ ⏱️ Session Timing: Controlled by Bee Engine (automatic)
├─ Taps per Session: [70▼]
├─ 💤 Background Mining: [Always▼]
├─ ⚡ Low CPU Mode: [Off▼]
└─ 🔄 Auto-Loop Sessions: [On (Continuous Mining)▼]
```

### After Clicking "Connect Wallet" and Scanning QR

```
✅ NacklePick Miner
⛏️ Mining as: wallet_name

Mining Status:
├─ Sessions: 0
├─ Taps: 0
├─ Wallet Balance: 0.0000 NACKL
└─ This Session: 0.000000 NACKL

Timer: 05:30
Status: "✅ Ready to mine! Wallet authorized."

Controls:
└─ [⛏️ START MINING] (ENABLED - green)

Settings:
├─ 🔐 Wallet Authorization: [🔐 Connect Wallet] (already done)
├─ ⏱️ Session Timing: Controlled by Bee Engine (automatic)
├─ Taps per Session: [70▼]
├─ 💤 Background Mining: [Always▼]
├─ ⚡ Low CPU Mode: [Off▼]
└─ 🔄 Auto-Loop Sessions: [On (Continuous Mining)▼]
```

### During Mining Session

```
⛏️ NacklePick Miner
⛏️ Mining as: wallet_name

Mining Status:
├─ Sessions: 1
├─ Taps: 45
├─ Wallet Balance: 0.0000 NACKL
└─ This Session: 0.000045 NACKL (updates in real-time!)

Timer: 02:15 (counts down from 05:30)
Status: "⛏️ Mining... 45 / 70 taps"

Controls:
└─ [⏹ STOP] (available if user wants to stop early)

Session History:
└─ Session #1: 45 taps → +0.000045 NACKL (02:15 ago)
```

### Session Completes

```
✅ NacklePick Miner
⛏️ Mining as: wallet_name

Mining Status:
├─ Sessions: 2
├─ Taps: 140
├─ Wallet Balance: 0.000090 NACKL (UPDATED!)
└─ This Session: 0.000045 NACKL (from last session)

Timer: 05:30 (reset)
Status: "🔄 Starting next session..." (auto-looping)

Controls:
└─ [⛏️ START MINING] (if auto-loop OFF)

Session History:
├─ Session #2: 70 taps → +0.000045 NACKL (just now)
└─ Session #1: 70 taps → +0.000045 NACKL
```

---

## Key Changes in This Update

| Feature | Before | After | Benefit |
|---------|--------|-------|---------|
| Session Duration | User sets 60-1800s | Bee Engine controls (5:30) | Real blockchain timing |
| Dapp ID | Users asked for it | Only creator uses it | Simpler for users |
| Authorization | Setup wizard | QR code scan | Wallet-native auth |
| Session Display | Cumulative only | Per-session + balance | Clear earnings |
| Auto-Loop | OFF by default | ON by default | Continuous mining |
| Taps Input | Pre-set only | Pre-set + custom | User flexibility |

---

## What Each Component Does

### **Bee Engine** 🐝
- Controls mining duration (~5:30 minutes per session)
- Generates hashes at blockchain difficulty
- Validates taps (user actions)
- Submits results to smart contract
- Calculates and pays rewards

### **NacklePick App** 🐝⛏️
- Manages wallet authorization (QR code)
- Tracks session progress (UI timer)
- Shows balance and earnings
- Manages session history
- Auto-loops sessions

### **Creator's Dapp ID** 🔑
- Registered with app in Acki Nacki ecosystem
- Binds mining keys to this app
- Identifies this specific mining app
- NOT visible to users
- NOT input by users

### **User's Wallet** 👤
- Proves user identity
- Signs mining keys
- Receives NACKL rewards
- NO dapp ID needed
- Only wallet name used

---

## Complete User Journey

```
Day 1:

10:00 AM - User downloads NacklePick
           Size: ~150 MB
           From: GitHub Releases

10:05 AM - User installs
           Click: NacklePick Setup 1.0.0.exe
           Next → Next → Finish

10:10 AM - App opens for first time
           Wallet: "alice" (created earlier)
           Status: "👤 Click 🔐 Setup..."

10:12 AM - User clicks "🔐 Connect Wallet"
           QR code modal appears

10:13 AM - User scans with Acki Nacki Wallet
           Wallet prompts: "Connect to NacklePick?"
           User confirms

10:14 AM - Wallet confirms authorization
           App shows: "✅ Ready to mine! Wallet authorized."

10:15 AM - User clicks "⛏️ START MINING"
           Bee Engine mining begins
           Timer: 05:30 ← counting down
           Status: "⛏️ Mining... 5 / 70 taps"

10:20 AM - 5 minutes later, still mining
           Timer: 00:30
           Status: "⛏️ Mining... 70 / 70 taps"

10:20:30 - Session completes!
           Timer: 00:00
           Session History: "+0.000456 NACKL"
           Balance: 0.000456 NACKL (UPDATED!)

10:21 AM - Auto-loop starts next session
           Timer: 05:30 ← counting down again
           Status: "⛏️ Mining... 1 / 70 taps"

           User minimizes app → mining continues! 💤

1:00 PM  - User checks balance
           Wallet Balance: 0.005000 NACKL
           Total Sessions Completed: 14
           Total Taps: 980

           User has been earning for 3 hours!
           0.000456 NACKL × 14 sessions ≈ 0.005 NACKL

7:00 PM  - End of day
           Sessions: 50 completed
           Earnings: 0.0228 NACKL
           Mining automatically throughout day while user worked
```

---

## User Onboarding (Super Simple)

### Step 1: Download
```
User goes to:
https://github.com/YOUR_USERNAME/nacklepick-miner/releases

Clicks: "NacklePick Setup 1.0.0.exe"
Size: 150 MB
```

### Step 2: Install
```
Double-click installer
Click: Next → Next → Finish
Desktop icon appears
```

### Step 3: Authorize (30 seconds)
```
Open app
Click: "🔐 Connect Wallet"
Scan QR with wallet
Confirm
```

### Step 4: Mine!
```
Click: "⛏️ START MINING"
That's it!
```

**Total onboarding time: 5-10 minutes** ✅

---

## Security Model

### For Creator (Dapp ID)
```
Dapp ID
  ↓ (used only when)
App initializes in Acki Nacki network
  ↓
Binds app to mining contract
  ↓
Only creator knows it
  ↓
Never shared with users
```

### For Users (Wallet)
```
User's Acki Nacki Wallet
  ↓ (used to)
Authorize this app
  ↓
Sign mining keys
  ↓
Receive rewards
  ↓
Wallet stays private
  ↓
Private keys NEVER leave wallet
```

---

## What's NOT Required

❌ Users do NOT need:
- Dapp ID
- App ID
- Private keys
- Passwords
- Email
- Registration
- Account creation

✅ Users only need:
- Acki Nacki Wallet (free to create)
- Internet connection
- 150 MB disk space

---

## Summary

| Actor | What They Need | What They Get | Time |
|-------|---------------|---------------|------|
| **Creator (You)** | Dapp ID (from Acki Nacki) | App to deploy | 40-45 min setup + 1 time |
| **Users** | Nothing (just wallet) | Mining app + rewards | 5-10 min setup |

---

**Bottom Line:**
- 🔑 **Dapp ID**: You (creator) register with Acki Nacki ecosystem ONE TIME
- 👤 **Wallet**: Users just scan QR code with their existing wallet
- 💰 **Mining**: Starts automatically, earns NACKL continuously

This is the correct architecture for a public dapp! 🚀
