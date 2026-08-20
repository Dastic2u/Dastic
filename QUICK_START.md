# 🚀 Quick Start - Bee Engine Integration

## 30 Second Setup

```bash
cd E:\miner

# 1. Install
npm install

# 2. Configure (replace with your dapp ID)
echo BEE_APP_ID=your_actual_dapp_id_here > .env

# 3. Run
npm start
```

## First Mining Session

1. **Launch Wallet**: Click green "⛏️ Launch" button
2. **Authorize**: Click Settings → "🔐 Authorize"
3. **Confirm**: Open Acki Nacki Wallet (automatic)
4. **Mine**: Click "⛏️ START MINING"

Done! 🎉 Real blockchain mining is now running.

---

## Where's My Dapp ID?

Get it from one of these:

### For Mainnet:
Contact: https://t.me/EugeneDAO

Provide:
- App name: "NacklePick Miner"  
- App link: (your GitHub/website)
- Logo (as WebP, use https://squoosh.app/)

### For Testnet:
Check: https://dev.ackinacki.com

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "bee-sdk not found" | Run `npm install @teamgosh/bee-sdk` |
| App won't start | Check Node.js version (14+) with `node -v` |
| No authorization | Install Acki Nacki Wallet: https://ackinacki.com/wallet |
| No rewards | Activate in ecosystem (see SETUP_BEE_ENGINE.md) |

---

## Key Files

| File | Purpose |
|------|---------|
| `bee-engine-miner.js` | Mining logic |
| `bee-engine-config.js` | Configuration |
| `.env` | Your dapp ID |
| `miner.html` | Mining UI |

---

## Documentation

- 📖 **Setup Guide**: `SETUP_BEE_ENGINE.md`
- 📋 **Full Details**: `INTEGRATION_SUMMARY.md`
- 🔗 **Bee Engine API**: https://dev.ackinacki.com/bee-engine

---

## Commands

```bash
npm start          # Run the app
npm run build      # Create Windows installer
npm install        # Install dependencies
```

---

That's it! You're mining on the blockchain. 🐝⛏️
