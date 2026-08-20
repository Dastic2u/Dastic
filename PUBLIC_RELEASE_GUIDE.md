# 🚀 Public Release Guide - NacklePick Bee Engine Miner

This guide covers all the modifications made for public release and how to build & distribute your application.

---

## 🎯 Key Changes for Public Release

### 1. **Real Bee Engine Mining Time** ✅

**What Changed:**
- Removed all fake/simulated timing
- Real duration uses actual Bee Engine contract time
- `SESSION_DURATION` (default 330 seconds = 5:30 minutes) is **REAL Bee Engine time**, not simulated

**How It Works:**
```
User clicks START MINING
  ↓
Duration = 330 seconds (5:30 minutes)
  ↓
Bee Engine starts REAL mining for exactly 330 seconds
  ↓
Each tap tracked in real-time on blockchain
  ↓
Session completes after exactly 330 seconds
  ↓
REAL rewards collected from smart contract
```

**User Sees:**
- ⏱️ Real timer counting down
- ⛏️ Actual Bee Engine mining progress
- 💰 Real NACKL rewards (not fake)

---

### 2. **Multi-User / Public Release Support** ✅

**What Changed:**
- No hardcoded dapp ID in code
- Each user configures their own dapp ID
- Multiple wallets supported per user
- Each wallet has independent authorization
- Config saved securely in localStorage

**Setup Flow for End Users:**

```
User launches NacklePick
  ↓
Click "Setup / Change" button
  ↓
Enter Dapp ID
  ↓
Choose resource settings
  ↓
Click "Save & Authorize"
  ↓
Confirm in Acki Nacki Wallet
  ↓
Ready to mine!
```

**For Multiple Users on Same PC:**
- Each user logs in separately
- Each creates their own wallet
- Each wallet has independent keys
- Settings stored per wallet in localStorage

---

### 3. **PC Resource Optimization** ✅

**Low CPU Mode:**
```
Before: Full CPU usage (faster mining)
After:  Configurable CPU usage (user choice)
```

**Settings Available:**
- **High Performance** (Default): Maximum mining speed
- **Low CPU Mode**: Reduced CPU usage, slower mining
- Perfect for background mining on laptops

**Background Mining Modes:**
1. **Always** ⛏️ - Mine continuously (high CPU)
2. **When Minimized** 💤 - Mine only when app is hidden (save resources)
3. **Never** ❌ - Manual control only

**Implementation:**
```javascript
// User can toggle before starting mining
backgroundMode = 'minimized'  // Only mine when window hidden
lowCpuMode = true             // Reduce CPU usage
```

---

### 4. **Background Mining** ✅

**What Changed:**
- App can run minimized
- Mining continues in background
- Tray icon shows status
- Mining proceeds even when window is hidden

**How Users Enable It:**

Settings → Background Mining → "When Minimized"

**User Workflow:**
```
1. Start mining
2. Click minimize button
3. App goes to tray
4. Mining continues in background ⛏️
5. Click tray icon to check status anytime
6. Mining stops after duration or when app closes
```

---

### 5. **Custom Taps User Input** ✅

**What Changed:**
- Pre-set options: 50, 70, 80, 90, 100 taps
- Custom option for user-defined taps
- Range: 1-10,000 taps
- Saved per wallet

**User Interface:**
```
Taps per Session
[Select: 50▼]

If user selects "Custom":
├─ Custom taps (1-10000)
└─ [Input: ____]
```

**Example Workflow:**
```
User wants 250 taps per session
  ↓
Click dropdown → "Custom"
  ↓
Enter: 250
  ↓
Start mining with 250 taps
  ↓
Every 1.32 seconds one tap (330s / 250 taps)
```

---

### 6. **Latest Bee SDK** ✅

**What Changed:**
- Updated package.json to use `"latest"` version
- Automatically pulls newest Bee Engine SDK on `npm install`
- Always up-to-date with latest features and security patches

**Package.json:**
```json
{
  "dependencies": {
    "@teamgosh/bee-sdk": "latest"
  }
}
```

**Benefit:**
- 🔄 Auto-updated when you reinstall
- 🛡️ Security patches included
- ✨ Latest features available

**To Pin a Specific Version** (if needed):
```json
"@teamgosh/bee-sdk": "1.2.3"
```

---

## 📦 Building as EXE

### Step 1: Prepare Your Files

```bash
cd E:\miner

# Ensure all dependencies installed
npm install

# Verify bee-sdk is latest
npm list @teamgosh/bee-sdk
```

### Step 2: Update App Info (Optional)

Edit `package.json` to customize:
```json
{
  "name": "nacklepick-miner",
  "version": "1.0.0",
  "description": "NacklePick - Multi-wallet NACKL desktop miner",
  "build": {
    "appId": "com.nacklepick.miner",
    "productName": "NacklePick",
    "win": {
      "target": "nsis",
      "icon": "icon.png"
    }
  }
}
```

### Step 3: Build the EXE

```bash
npm run build
```

**Output:**
- Location: `E:\miner\dist\`
- Installer: `NacklePick Setup 1.0.0.exe` (or your version)
- Size: ~150-200 MB (includes Node and all dependencies)

### Step 4: Test the Built EXE

```bash
cd E:\miner\dist
./NacklePick\ Setup\ 1.0.0.exe
```

Follow the installer:
1. Choose installation directory
2. Create desktop shortcut (optional)
3. Launch app after install
4. Test all features

---

## 🐙 Publishing to GitHub

### Step 1: Create GitHub Repository

```bash
cd E:\miner

# Initialize git
git init

# Create .gitignore
echo "node_modules/
dist/
*.exe
.env
bee_engine.config.json" > .gitignore

# Add files
git add .
git commit -m "Initial commit: NacklePick Bee Engine Miner"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/nacklepick-miner.git

# Push
git branch -M main
git push -u origin main
```

### Step 2: Create GitHub Release

**Option A: Via Command Line**
```bash
# Requires 'gh' CLI installed
gh release create v1.0.0 \
  ./dist/NacklePick\ Setup\ 1.0.0.exe \
  -t "NacklePick v1.0.0" \
  -n "Initial release with Bee Engine mining"
```

**Option B: Via GitHub Web Interface**
1. Go to your repo: `https://github.com/YOUR_USERNAME/nacklepick-miner`
2. Click "Releases" → "Create a new release"
3. Tag: `v1.0.0`
4. Title: `NacklePick v1.0.0`
5. Upload: Drag `NacklePick Setup 1.0.0.exe`
6. Description: Add features and changelog
7. Click "Publish release"

### Step 3: Update README for Users

Create `README.md`:
```markdown
# NacklePick - Bee Engine Miner

Multi-wallet NACKL desktop miner with Bee Engine integration.

## Download

[⬇️ Download Latest Release](https://github.com/YOUR_USERNAME/nacklepick-miner/releases)

## Quick Start

1. Download and run the installer
2. Launch NacklePick
3. Click "Setup / Change" and enter your Dapp ID
4. Click "⛏️ START MINING"

## Features

- ✅ Real blockchain mining
- ✅ Multiple wallets
- ✅ Background mining
- ✅ Low CPU mode
- ✅ Session history
- ✅ Auto-loop mining

## Support

- [Bee Engine Docs](https://dev.ackinacki.com/bee-engine)
- [Acki Nacki Docs](https://docs.ackinacki.com)
```

---

## 🔑 How Users Get Dapp ID

Create `DAPP_ID_GUIDE.md`:

```markdown
# How to Get Your Dapp ID

## Step 1: Contact Acki Nacki Team

Email/Telegram: https://t.me/EugeneDAO

## Step 2: Provide Information

Share these with the team:
- **App Name**: NacklePick Miner
- **App Link**: Your website or GitHub repo
- **Logo**: In WebP format (convert at https://squoosh.app/)

## Step 3: Receive Dapp ID

You'll get something like: `0x1234567890abcdef...`

## Step 4: Use in NacklePick

1. Launch NacklePick
2. Click "Setup / Change"
3. Paste your Dapp ID
4. Click "Save & Authorize"
5. Start mining!
```

---

## 🔒 User Privacy & Security

**No Data Collection:**
- No login required
- All data stored locally on user's PC
- Mining keys stored in encrypted localStorage
- No telemetry or tracking

**Files Created:**
- `~/.NacklePick/` - User settings (optional)
- `LocalStorage` - Per-wallet mining keys
- `Session storage` - Current session state

---

## 📊 Distribution Checklist

- [ ] Code ready with all modifications
- [ ] All tests passed
- [ ] npm dependencies up to date
- [ ] Built EXE created (`npm run build`)
- [ ] EXE tested on clean Windows machine
- [ ] GitHub repository created
- [ ] README.md written
- [ ] Release published with EXE
- [ ] Download link tested
- [ ] Documentation clear for end users

---

## 🚀 Final Workflow: Dapp ID → Build → Upload

### For First Release:

```bash
# 1. Update version in package.json (e.g., 1.0.0)
# 2. Build EXE
npm run build

# 3. Test the built EXE thoroughly
cd dist
"./NacklePick Setup 1.0.0.exe"

# 4. Create GitHub release with EXE
# (Use web interface or gh CLI)

# 5. Announce to users
# - Share download link
# - Share Dapp ID setup guide
```

### For Each Update:

```bash
# 1. Update code with new features
# 2. Test in development (npm start)
# 3. Bump version: package.json version++
# 4. Commit changes
git add .
git commit -m "Add feature X"
git push

# 5. Build new EXE
npm run build

# 6. Create new GitHub release
gh release create v1.0.1 ./dist/...

# 7. Users will see update available
```

---

## 📈 Post-Launch Monitoring

**Track These Metrics:**
- Number of downloads
- GitHub stars/forks
- User issues reported
- Bug fix requests

**Suggested Updates:**
- Feature requests from users
- Bee Engine SDK updates
- Performance optimizations
- UI/UX improvements

---

## ⚠️ Important Notes for Public Release

1. **Dapp ID Required**: Each instance needs a valid dapp ID
2. **Network Access**: Must have internet connection
3. **Wallet Required**: Acki Nacki Wallet must be installed
4. **Mining Rewards**: Only if ecosystem participation activated
5. **Data Storage**: All data stored locally (no cloud sync)
6. **Support**: Users need access to Acki Nacki docs

---

## 🎯 Complete Public Release Process

```
Your Dapp ID
    ↓
Code ready with modifications
    ↓
Run: npm install
    ↓
Run: npm run build (creates EXE)
    ↓
Test EXE on clean Windows
    ↓
Create GitHub repo
    ↓
Upload EXE to GitHub Releases
    ↓
Share download link with users
    ↓
Users download and run installer
    ↓
Users enter their own Dapp ID
    ↓
Users start mining! 🐝⛏️
```

---

## Version History

- **v1.0.0** (Current)
  - ✅ Real Bee Engine mining
  - ✅ Multi-wallet support
  - ✅ Background mining
  - ✅ Low CPU mode
  - ✅ Custom taps
  - ✅ Latest SDK support

---

**Ready for Public Release!** 🎉

Your application is now configured for public distribution with:
- ✅ Real blockchain mining
- ✅ Multi-user support
- ✅ Resource optimization
- ✅ Background operation
- ✅ User configuration
- ✅ Latest dependencies

Next: Add your dapp ID and build! 🚀
