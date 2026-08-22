# Bee Engine Integration for Dastic Miner

## Overview
This document outlines the integration of Bee Engine SDK with the Dastic desktop miner application for real blockchain mining on the Acki Nacki network.

## Integration Steps

### 1. Install Bee SDK
```bash
npm install @teamgosh/bee-sdk
```

### 2. Configuration
- Update `launcher.js` to pass APP_ID to miner windows
- Create `bee-engine-config.js` for centralized Bee Engine configuration
- Configure network endpoints for Acki Nacki network

### 3. User Authorization Flow
- Wallet name collection from user
- Mining key generation via `gen_mining_keys()`
- Deep link QR code handling for AN Wallet authorization
- Poll for key propagation using `ensure_mining_keys_propagated()`
- First tap verification

### 4. Mining Integration
- Replace simulated timer with real Bee Engine mining
- Use `miner.start()` with duration
- Handle mining events via callback
- Track taps with `add_tap()`
- Replace simulated rewards with `get_reward()`

### 5. Session Management
- Store mining keys securely (per wallet)
- Track miner contract addresses
- Manage multiple wallet mining sessions
- Handle session persistence

## Files to Create/Modify
- ✅ `package.json` - Add @teamgosh/bee-sdk dependency
- ✅ `bee-engine-config.js` - NEW: Bee Engine configuration
- ✅ `bee-engine-miner.js` - NEW: Mining logic wrapper
- ✅ `launcher.js` - Modify: Pass APP_ID to windows
- ✅ `index.html` - Modify: Add wallet auth UI
- ✅ `miner.html` - Modify: Integrate real mining

## Security Considerations
- Mining keys stored in localStorage (encrypted recommended for production)
- Private keys never leave the app
- Deep links handled securely
- Wallet authorization verified via blockchain

## Status
- [x] Analysis complete
- [ ] Dependencies installed
- [ ] Configuration created
- [ ] Authorization flow implemented
- [ ] Mining loop integrated
- [ ] Testing completed
