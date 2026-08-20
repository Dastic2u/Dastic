/**
 * Bee Engine Miner Wrapper
 * Handles Bee Engine mining operations, wallet authorization, and key management
 */

const BEE_ENGINE_CONFIG = require('./bee-engine-config');

class BeeEngineMiner {
  constructor() {
    this.sdk = null;
    this.miner = null;
    this.walletName = null;
    this.minerAddress = null;
    this.miningKeys = null;
    this.isMining = false;
    this.isAuthorized = false;
    this.currentSession = null;
  }

  /**
   * Initialize Bee Engine SDK
   * Must be called before any mining operations
   */
  async initialize(walletName, useTestnet = false) {
    try {
      // Dynamically require bee-sdk when needed
      const BeeEngine = require('@teamgosh/bee-sdk');

      this.walletName = walletName;
      const endpoints = useTestnet ?
        BEE_ENGINE_CONFIG.TESTNET_ENDPOINTS :
        BEE_ENGINE_CONFIG.ENDPOINTS;

      // SDK initialization (specifics depend on bee-sdk API)
      this.sdk = new BeeEngine({
        endpoints,
        appId: BEE_ENGINE_CONFIG.APP_ID
      });

      console.log(`[BeeEngine] Initialized for wallet: ${walletName}`);
      return { success: true, message: 'Bee Engine SDK initialized' };
    } catch (error) {
      console.error('[BeeEngine] Initialization error:', error);
      return {
        success: false,
        error: error.message,
        hint: 'Make sure @teamgosh/bee-sdk is installed: npm install @teamgosh/bee-sdk'
      };
    }
  }

  /**
   * Generate mining keys for a wallet
   * Returns deep_link, secret, and public key
   */
  async generateMiningKeys() {
    try {
      if (!this.sdk) {
        throw new Error('SDK not initialized. Call initialize() first.');
      }

      // Call bee-sdk key generation
      const BeeEngine = require('@teamgosh/bee-sdk');
      const { gen_mining_keys } = BeeEngine;

      const result = await gen_mining_keys(BEE_ENGINE_CONFIG.APP_ID);

      // Store keys securely (in production, use encryption)
      this.miningKeys = {
        public: result.public,
        secret: result.secret,
        generatedAt: Date.now()
      };

      // Persist in localStorage
      const storageKey = BEE_ENGINE_CONFIG.STORAGE.MINING_KEYS + this.walletName;
      localStorage.setItem(storageKey, JSON.stringify(this.miningKeys));

      console.log('[BeeEngine] Mining keys generated');
      return {
        success: true,
        deepLink: result.deep_link,
        public: result.public,
        message: 'Mining keys generated. User must confirm in AN Wallet.'
      };
    } catch (error) {
      console.error('[BeeEngine] Key generation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Wait for mining keys to be propagated in the Miner contract
   * This polls the blockchain for confirmation
   */
  async waitForKeyPropagation(publicKey) {
    try {
      if (!this.sdk) {
        throw new Error('SDK not initialized');
      }

      const BeeEngine = require('@teamgosh/bee-sdk');
      const { ensure_mining_keys_propagated, get_miner_address_by_wallet_name } = BeeEngine;

      // Get miner contract address
      this.minerAddress = await get_miner_address_by_wallet_name({
        client_config: {
          network: {
            endpoints: BEE_ENGINE_CONFIG.ENDPOINTS,
            app_id: BEE_ENGINE_CONFIG.APP_ID
          }
        },
        wallet_name: this.walletName
      });

      // Poll for key propagation
      await ensure_mining_keys_propagated({
        client_config: {
          network: {
            endpoints: BEE_ENGINE_CONFIG.ENDPOINTS,
            miner_address: this.minerAddress,
            app_id: BEE_ENGINE_CONFIG.APP_ID,
            expected_owner_public: publicKey,
            max_attempts: BEE_ENGINE_CONFIG.MINING.MAX_ATTEMPTS,
            interval_ms: BEE_ENGINE_CONFIG.MINING.INTERVAL_MS
          }
        }
      });

      // Store miner address
      const storageKey = BEE_ENGINE_CONFIG.STORAGE.MINER_ADDRESS + this.walletName;
      localStorage.setItem(storageKey, this.minerAddress);

      this.isAuthorized = true;
      console.log('[BeeEngine] Keys propagated. Wallet authorized.');

      return {
        success: true,
        minerAddress: this.minerAddress,
        message: 'Authorization complete'
      };
    } catch (error) {
      console.error('[BeeEngine] Key propagation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform first tap verification
   * Confirms user owns the connected wallet
   */
  async verifyWithFirstTap(x = 256, y = 256) {
    try {
      if (!this.sdk || !this.isAuthorized) {
        throw new Error('Not authorized. Complete wallet authorization first.');
      }

      const BeeEngine = require('@teamgosh/bee-sdk');
      const { add_tap } = BeeEngine;

      // Send first tap with signature from mining key
      await add_tap(x, y);

      console.log('[BeeEngine] First tap verified');
      return { success: true, message: 'Wallet ownership verified' };
    } catch (error) {
      console.error('[BeeEngine] First tap error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start mining session
   * @param {number} durationMs - Duration in milliseconds
   * @param {Function} eventCallback - Callback for mining events
   */
  async startMining(durationMs, eventCallback) {
    try {
      if (!this.sdk || !this.isAuthorized) {
        throw new Error('Not authorized. Complete wallet authorization first.');
      }

      if (this.isMining) {
        throw new Error('Mining already in progress');
      }

      const BeeEngine = require('@teamgosh/bee-sdk');
      const { bee_engine_miner } = BeeEngine;

      // Validate duration
      const validDuration = Math.max(
        BEE_ENGINE_CONFIG.MINING.MIN_DURATION,
        Math.min(durationMs, BEE_ENGINE_CONFIG.MINING.MAX_DURATION)
      );

      this.miner = bee_engine_miner;

      // Check if mining can start
      if (!await this.miner.can_start()) {
        throw new Error('Mining cannot start. Check seed availability.');
      }

      this.isMining = true;
      this.currentSession = {
        startTime: Date.now(),
        duration: validDuration,
        taps: 0
      };

      console.log('[BeeEngine] Mining started for ' + (validDuration / 1000) + 's');

      // Start mining with callback
      this.miner.start(validDuration, (event) => {
        if (eventCallback) {
          eventCallback(event);
        }
      });

      return { success: true, message: 'Mining started' };
    } catch (error) {
      this.isMining = false;
      console.error('[BeeEngine] Mining start error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add tap to current mining session
   * Taps are bound to mining and signed with private key
   * @param {number} x - X coordinate (0-512)
   * @param {number} y - Y coordinate (0-512)
   */
  async addTap(x, y) {
    try {
      if (!this.isMining) {
        throw new Error('No active mining session');
      }

      const BeeEngine = require('@teamgosh/bee-sdk');
      const { add_tap } = BeeEngine;

      await add_tap(x, y);

      if (this.currentSession) {
        this.currentSession.taps++;
      }

      return { success: true, taps: this.currentSession?.taps || 0 };
    } catch (error) {
      console.error('[BeeEngine] Tap error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop mining and submit results
   */
  async stopMining() {
    try {
      if (!this.isMining || !this.miner) {
        return { success: false, error: 'No active mining session' };
      }

      this.miner.stop();
      this.isMining = false;

      console.log('[BeeEngine] Mining stopped');

      return {
        success: true,
        session: this.currentSession,
        message: 'Mining stopped and results submitted'
      };
    } catch (error) {
      console.error('[BeeEngine] Mining stop error:', error);
      this.isMining = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Collect available mining rewards
   */
  async getRewards() {
    try {
      if (!this.sdk) {
        throw new Error('SDK not initialized');
      }

      const BeeEngine = require('@teamgosh/bee-sdk');
      const { get_reward } = BeeEngine;

      const reward = await get_reward();

      console.log('[BeeEngine] Rewards collected: ' + reward);

      return { success: true, reward };
    } catch (error) {
      console.error('[BeeEngine] Reward collection error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Poll contract for state updates
   * Used to synchronize state during authorization
   */
  async polling() {
    try {
      const BeeEngine = require('@teamgosh/bee-sdk');
      const { polling } = BeeEngine;

      await polling();

      return { success: true };
    } catch (error) {
      console.error('[BeeEngine] Polling error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current mining status
   */
  getStatus() {
    return {
      initialized: !!this.sdk,
      authorized: this.isAuthorized,
      isMining: this.isMining,
      walletName: this.walletName,
      minerAddress: this.minerAddress,
      currentSession: this.currentSession
    };
  }

  /**
   * Restore authorization state from localStorage
   */
  restoreAuthorization(walletName) {
    try {
      const keysKey = BEE_ENGINE_CONFIG.STORAGE.MINING_KEYS + walletName;
      const addressKey = BEE_ENGINE_CONFIG.STORAGE.MINER_ADDRESS + walletName;

      const keys = localStorage.getItem(keysKey);
      const address = localStorage.getItem(addressKey);

      if (keys && address) {
        this.walletName = walletName;
        this.miningKeys = JSON.parse(keys);
        this.minerAddress = address;
        this.isAuthorized = true;

        console.log('[BeeEngine] Authorization restored from localStorage');
        return { success: true, message: 'Authorization restored' };
      }

      return { success: false, error: 'No saved authorization found' };
    } catch (error) {
      console.error('[BeeEngine] Restore error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all stored data for a wallet
   */
  clearWalletData(walletName) {
    try {
      const keysKey = BEE_ENGINE_CONFIG.STORAGE.MINING_KEYS + walletName;
      const addressKey = BEE_ENGINE_CONFIG.STORAGE.MINER_ADDRESS + walletName;

      localStorage.removeItem(keysKey);
      localStorage.removeItem(addressKey);

      if (this.walletName === walletName) {
        this.isAuthorized = false;
        this.miningKeys = null;
        this.minerAddress = null;
      }

      return { success: true, message: 'Wallet data cleared' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = BeeEngineMiner;
