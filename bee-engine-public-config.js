/**
 * Bee Engine Public Release Configuration
 * For end-users who will use this as a public application
 */

const fs = require('fs');
const path = require('path');

// Configuration file location
const CONFIG_DIR = path.join(process.env.APPDATA || process.env.HOME, 'NacklePick');
const CONFIG_FILE = path.join(CONFIG_DIR, 'bee-engine.config.json');

class PublicBeeConfig {
  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from user's home directory
   * This allows end-users to set their own APP_ID
   */
  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[PublicConfig] Failed to load config:', error.message);
    }

    return this.getDefaults();
  }

  /**
   * Get default configuration
   */
  getDefaults() {
    return {
      APP_ID: '',
      ENDPOINTS: [
        'https://mainnet.ackinacki.com',
        'https://mainnet2.ackinacki.com'
      ],
      TESTNET_ENDPOINTS: [
        'https://testnet.ackinacki.com'
      ],
      MINING: {
        MAX_ATTEMPTS: 30,
        INTERVAL_MS: 1000,
        MIN_DURATION: 60000,      // 1 minute
        MAX_DURATION: 3600000,    // 1 hour
        DEFAULT_DURATION: 330000  // 5:30 minutes (REAL BEE ENGINE TIME)
      },
      RESOURCE_OPTIMIZATION: {
        LOW_CPU_MODE: false,        // Reduce CPU usage (slower mining)
        MINING_THREADS: -1,         // -1 = auto-detect, or specific number
        BACKGROUND_ONLY: false,     // Only mine when minimized
        AUTO_STOP_ON_BATTERY: true, // Stop mining on battery power
        AUTO_STOP_ON_IDLE: false    // Stop mining after X minutes idle
      },
      REWARDS: {
        EPOCH_BLOCKS: 1000
      }
    };
  }

  /**
   * Set APP_ID for this user
   */
  setAppId(appId) {
    if (!appId || appId === 'not_set') {
      throw new Error('Invalid APP_ID');
    }

    this.config.APP_ID = appId;
    this.saveConfig();
    return true;
  }

  /**
   * Update resource optimization settings
   */
  setResourceOptions(options) {
    this.config.RESOURCE_OPTIMIZATION = {
      ...this.config.RESOURCE_OPTIMIZATION,
      ...options
    };
    this.saveConfig();
    return this.config.RESOURCE_OPTIMIZATION;
  }

  /**
   * Check if app is configured
   */
  isConfigured() {
    return !!this.config.APP_ID && this.config.APP_ID !== 'not_set';
  }

  /**
   * Get configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Save configuration to file
   */
  saveConfig() {
    try {
      // Create directory if not exists
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf8');
      console.log('[PublicConfig] Configuration saved to:', CONFIG_FILE);
      return true;
    } catch (error) {
      console.error('[PublicConfig] Failed to save config:', error.message);
      return false;
    }
  }

  /**
   * Reset to defaults
   */
  reset() {
    this.config = this.getDefaults();
    this.saveConfig();
    return this.config;
  }
}

module.exports = new PublicBeeConfig();
