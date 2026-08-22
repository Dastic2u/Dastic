# Dastic - Bee Engine Integration Setup Guide

This guide will help you set up Bee Engine integration for real blockchain mining on the Acki Nacki network.

## Prerequisites

- Node.js 14+ and npm installed
- Your Bee Engine **dapp ID** (from dev.ackinacki.com)
- Acki Nacki Wallet installed (for authorization)

## Step 1: Install Dependencies

```bash
cd E:\miner
npm install
```

This will install:
- `electron` - Desktop app framework
- `@teamgosh/bee-sdk` - Bee Engine SDK for mining

## Step 2: Configure Your Dapp ID

### Option A: Environment Variable (Recommended)

Create a `.env` file in the miner folder:

```bash
BEE_APP_ID=your_app_dapp_id_here
```

Then start the app:
```bash
npm start
```

### Option B: Direct Configuration

Edit `bee-engine-config.js` and replace:

```javascript
const APP_ID = 'your_app_dapp_id_here';
```

with your actual dapp ID.

### Option C: Command Line

```bash
set BEE_APP_ID=your_app_dapp_id_here
npm start
```

## Step 3: Running the Application

```bash
npm start
```

This launches the Dastic launcher window.

## Step 4: Set Up Bee Engine

1. **Launch a Wallet**: Click the green "⛏️ Launch" button for any wallet
2. **Authorize Bee Engine**: In the mining window, go to Settings and click "🔐 Authorize"
3. **Follow Authorization Flow**:
   - Mining keys will be generated
   - Acki Nacki Wallet will open automatically (deep link)
   - Confirm the authorization in your wallet
   - The app will wait for blockchain confirmation
   - Once confirmed, you're ready to mine!

## Step 5: Start Mining

1. Configure mining settings:
   - **Session Duration**: How long to mine (default: 330 seconds = 5:30)
   - **Taps per Session**: User interactions per session
   - **Auto-Loop**: Automatically restart mining when done

2. Click **⛏️ START MINING**

The app will:
- Connect to Bee Engine
- Generate hashes with reduced difficulty
- Track your taps (user interactions)
- Collect mining rewards
- Submit results to the blockchain

## Troubleshooting

### "bee-sdk not found" Error

**Solution**: Install the SDK

```bash
npm install @teamgosh/bee-sdk
```

### "dapp ID not found" Error

**Solution**: Set your APP_ID in one of these ways:

1. Create `.env` file with `BEE_APP_ID=your_id`
2. Edit `bee-engine-config.js`
3. Set environment variable before running

### Authorization Failed

**Common causes**:
- Acki Nacki Wallet not installed
- Network connectivity issue
- Wrong dapp ID
- Wallet doesn't have enough balance for gas

**Solution**:
- Verify wallet installation: https://ackinacki.com/wallet
- Check network connection
- Verify dapp ID at dev.ackinacki.com
- Ensure wallet has NACKL for transaction fees

### Mining Returns to Simulated Mode

If Bee Engine authorization fails, the app falls back to **simulated mining**:
- Mines on your computer (no blockchain)
- Generates fake rewards for testing UI
- Perfect for development and testing

To switch back to real mining, click "🔐 Authorize" again.

## Getting Your Dapp ID

### For Mainnet (Production)

Contact the Acki Nacki team at: https://t.me/EugeneDAO

Provide:
- Your app name: "Dastic Miner"
- App link: (your website or GitHub repo)
- Logo in WebP format (use https://squoosh.app/ to convert)

### For Testnet (Development)

The testnet dapp ID is typically provided in the dev documentation.

## File Structure

```
E:\miner\
├── launcher.js                          # Main Electron process
├── main.js                             # (Legacy - use launcher.js)
├── index.html                          # Launcher UI
├── miner.html                          # Mining UI with Bee Engine
├── package.json                        # Dependencies
├── bee-engine-config.js                # Bee Engine configuration
├── bee-engine-miner.js                 # Mining logic wrapper
├── BEE_ENGINE_INTEGRATION.md           # Integration documentation
└── SETUP_BEE_ENGINE.md                 # This file
```

## API Integration

### Bee Engine Methods Used

The app integrates these Bee Engine SDK methods:

| Method | Purpose |
|--------|---------|
| `gen_mining_keys()` | Generate mining key pair |
| `ensure_mining_keys_propagated()` | Wait for blockchain confirmation |
| `add_tap(x, y)` | Track user interactions |
| `miner.start()` | Start mining session |
| `miner.stop()` | Stop mining & submit results |
| `get_reward()` | Collect earned rewards |
| `polling()` | Poll contract state |

### Storage

Mining authorization data is stored in browser localStorage:

- `bee_mining_keys_[walletName]` - Mining private key info
- `bee_miner_address_[walletName]` - Miner contract address
- `bee_session_data_[walletName]` - Current session state

## Security Notes

⚠️ **Important**: Mining keys are stored in localStorage (plaintext in development).

**Production recommendations**:
1. Encrypt keys using a password
2. Store in secure Electron storage
3. Never transmit keys to external servers
4. Implement PIN/biometric protection

## Building for Distribution

To create a Windows installer:

```bash
npm run build
```

Output: `dist/nsis/Dastic-Setup.exe`

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Set your dapp ID
3. ✅ Run: `npm start`
4. ✅ Authorize with Bee Engine
5. ✅ Start mining!

## Support

- **Bee Engine Docs**: https://dev.ackinacki.com/bee-engine
- **Acki Nacki Docs**: https://docs.ackinacki.com
- **Issues**: Check console logs (F12 in Electron)

## Useful Links

- [Bee Engine SDK Integration Documentation](https://dev.ackinacki.com/bee-engine/bee-engine-sdk-integration-documentation)
- [Bee Engine Overview](https://dev.ackinacki.com/bee-engine/bee-engine-overview)
- [Acki Nacki SDK Documentation](https://docs.ackinacki.com)
- [Acki Nacki Wallet](https://ackinacki.com/wallet)

---

**Version**: 1.0.0  
**Last Updated**: 2026-08-20  
**Author**: Bee Engine Integration Guide
