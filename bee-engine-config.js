/**
 * Bee Engine Configuration
 * Central configuration for Bee Engine integration
 */

// Replace with your actual dapp ID
const APP_ID = process.env.BEE_APP_ID || 'your_app_dapp_id_here';

// Acki Nacki Mainnet endpoints
const ENDPOINTS = [
  'https://mainnet.ackinacki.com',
  'https://mainnet2.ackinacki.com'
];

// Testnet endpoints (use for development)
const TESTNET_ENDPOINTS = [
  'https://testnet.ackinacki.com'
];

const BEE_ENGINE_CONFIG = {
  APP_ID,
  ENDPOINTS,
  TESTNET_ENDPOINTS,

  // Mining configuration
  MINING: {
    MAX_ATTEMPTS: 30,           // Max polling attempts for key propagation
    INTERVAL_MS: 1000,          // Polling interval in ms
    MIN_DURATION: 60000,        // Minimum mining duration (60s)
    MAX_DURATION: 3600000,      // Maximum mining duration (1h)
    DEFAULT_DURATION: 330000,   // Default 5:30 minutes
  },

  // Reward configuration
  REWARDS: {
    EPOCH_BLOCKS: 1000,         // Blocks per epoch
  },

  // Storage keys
  STORAGE: {
    MINING_KEYS: 'bee_mining_keys_',
    MINER_ADDRESS: 'bee_miner_address_',
    SESSION_DATA: 'bee_session_data_'
  }
};

module.exports = BEE_ENGINE_CONFIG;
