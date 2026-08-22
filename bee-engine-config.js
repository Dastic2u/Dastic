/**
 * Bee Engine Configuration
 * Central configuration for Bee Engine integration
 */

// Read .env directly rather than relying on env-var inheritance between
// the main and renderer processes (this file is require()'d from both).
(function loadDotEnv() {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
})();

// Replace with your actual dapp ID
const APP_ID = process.env.BEE_APP_ID || 'your_app_dapp_id_here';

// Confirmed live from acki.live's own production bundle (graphqlEndpoint:
// "https://mainnet.ackinacki.org/graphql") — not officially documented on
// dev.ackinacki.com, but verified against a live mainnet explorer.
//
// A LIST, comma-separated, because one endpoint is a single point of failure and
// run24 measured what that costs: 67 "pool timed out while waiting for an open
// connection" in 13 minutes, the event-reader thread dying on a ~7s loop, and
// the block poll losing its anchor repeatedly. The SDK's own network layer takes
// an array and does latency detection across it (`latency_detection_interval`,
// `max_latency`, `sending_endpoint_count` in its client config), so more than one
// entry is used, not just held in reserve.
//
// Only one mainnet host is CONFIRMED, so only one is shipped — inventing a second
// would put a URL in front of the SDK that may not exist and turn every retry
// into a guaranteed failure. Add real ones via .env when you have them:
//   BEE_MAINNET_ENDPOINT=https://mainnet.ackinacki.org,https://your-other-host
function parseEndpoints(raw, fallback) {
  const list = String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : fallback;
}

const ENDPOINTS = parseEndpoints(
  process.env.BEE_MAINNET_ENDPOINT,
  ['https://mainnet.ackinacki.org']
);

// Confirmed from https://dev.ackinacki.com/graphql/graphql-quick-start
const TESTNET_ENDPOINTS = parseEndpoints(
  process.env.BEE_TESTNET_ENDPOINT,
  ['https://shellnet.ackinacki.org']
);

// The bee-infra backend the SDK's `Wallet` class requires as its third
// constructor argument. Unlike the GraphQL endpoint this is NOT optional and
// has no default inside the SDK. Value taken from @teamgosh/bee-sdk's own
// README ("bee-infra backend"), which is a firmer source than the reference
// app's app-backend-DEV host. Override with BEE_API_URL if it moves.
const API_URL = process.env.BEE_API_URL || 'https://app-backend.ackinacki.org/api';

const BEE_ENGINE_CONFIG = {
  APP_ID,
  ENDPOINTS,
  TESTNET_ENDPOINTS,
  API_URL,

  // Mining configuration.
  //
  // Confirmed against the official reference implementation
  // (github.com/gosh-sh/bee-engine examples/javascript/miner-react):
  // Miner.start() is called with 15000ms bursts, and add_tap() is a
  // manual/on-demand action that ONLY works while a burst is actively
  // running — the worker does not persist for arbitrarily long
  // durations. Passing a long duration_ms (we tried 300000ms) leaves
  // the worker finishing its real work in seconds while our own
  // scheduled add_tap() calls, spaced out over the full 5 minutes,
  // land long after — hence "No running workers to add tap to" and
  // sessions completing with 0 taps recorded.
  //
  // Fix: mine in short BURST_DURATION_MS bursts (matching the
  // reference's 15s), tap a few times within each live burst, and
  // chain bursts back-to-back (via can_start() polling) to build up
  // the user-facing SESSION_DURATION_MS "session" shown in the UI.
  MINING: {
    // Pairing window: how long the app waits for the user to scan the QR
    // code and approve the mining key in their Acki Nacki Wallet app.
    // 30 x 1000ms gave the user THIRTY SECONDS to pick up their phone,
    // unlock it, open the wallet, scan and confirm — which is where
    // "Failed to ensure mining keys propagated: Max 30 attempts reached"
    // came from. It was a UI deadline, not a chain problem. 150 x 2000ms
    // is five minutes, and polls half as often on a congested mainnet.
    MAX_ATTEMPTS: 150,           // Max polling attempts for key propagation
    INTERVAL_MS: 2000,           // Polling interval in ms
    MIN_DURATION: 60000,         // Lower clamp on chosen session duration (60s)
    MAX_DURATION: 3600000,       // Upper clamp on chosen session duration (1h)
    BURST_DURATION_MS: 15000,    // Matches the reference app's Miner.start() call
    TAPS_PER_BURST: 70,          // DEFAULT only — the real value is a per-user setting
                                 // (localStorage 'bee_taps_per_burst', edited in the
                                 // miner window's Settings panel and re-read at the
                                 // start of every burst). This is what a wallet that
                                 // has never saved one gets.
                                 //
                                 // CORRECTED 2026-08-22 (same day, later pass): earlier
                                 // today this was dropped to 5 and hard-capped at 10,
                                 // reading `uint8 constant MAX_LEN_TAPS = 10`
                                 // (contracts/mvsystem/modifiers/modifiers.sol) as a
                                 // per-submission tap-count ceiling. Re-reading
                                 // setCommitData/acceptTap's actual bodies disproved
                                 // that: `_tapsSize` is incremented once per acceptTap
                                 // CALL (`_tapsSize += 1`), not once per tap, and is
                                 // unrelated to `tapNumber`/`_commitTaps` (the real tap
                                 // count, stored separately). MAX_LEN_TAPS therefore
                                 // caps SUBMISSIONS PER EPOCH at 10, not taps per
                                 // submission — there is no contract-level ceiling on
                                 // tapNumber at all. This matches what
                                 // PROJECT_MEMORY.md's 2026-08-21 run already measured:
                                 // two sequential 35-tap submissions both landed clean,
                                 // `tap_sum` rising by exactly 35 each time, no
                                 // ERR_FULL_TAPS.
                                 //
                                 // The real ceiling is wall-clock cost, not the
                                 // contract: a worker floored at MIN_DURATION=60s, plus
                                 // ~45s settling root and proof on chain, plus ~10s
                                 // before the engine frees up (~115s per submission,
                                 // measured in run17). A session only has room for ~2-3
                                 // of those, so one submission carrying the full 70 (an
                                 // ~80s worker at ~1s/tap spacing, well inside the 60s
                                 // floor's headroom) costs less total time and one
                                 // fewer round trip than splitting into 35+35 — hence
                                 // the default is the full 70 in one submission now,
                                 // not a small per-burst figure meant to be repeated.
    SESSION_DURATION_MS: 300000, // User-facing session length: chains bursts to fill this
  },

  // Reward configuration
  REWARDS: {
    EPOCH_BLOCKS: 1000,         // Blocks per 5-minute tap window
    // Confirmed by the SDK's own types: GraphqlBlockData exposes seq_no,
    // and MinerAccountData's epoch_start / epoch_5m_start are in that same
    // block-sequence unit. Measured live 2026-08-21: epoch_5m_start
    // advances by exactly 1000 per 5-minute window — that period is
    // MinerRewardPeriod (contracts/mvsystem/modifiers/modifiers.sol,
    // `uint64 constant MinerRewardPeriod = 1000`), confirmed 2026-08-22.
    BLOCK_MS: 300,
    // CORRECTED 2026-08-22: this was 288000 — 24h divided by the nominal
    // 300ms block time above — which was never actually sourced from the
    // contract, only assumed. Reading modifiers.sol directly shows the
    // "daily" per-miner field (epoch_start, the one WITHOUT the _5m suffix)
    // is driven by a different constant entirely: `uint64 constant
    // MinerTapDelay = 262000`, not MinerRewardPeriod and not an invented
    // 288000. This is also what fixes the "why is it 26.7h and not 24h"
    // question live-reported the same day: 288000 blocks at the genuinely
    // measured ~331-333ms/block (not the nominal 300ms) comes out to ~26.6h,
    // matching exactly what the app had been showing — the bug was never the
    // block-time measurement, it was this constant. 262000 blocks at that
    // same measured rate comes out to ~24.1-24.2h, which is what a "daily"
    // cycle should actually look like.
    EPOCH_BLOCKS_PER_DAY: 262000,
  },

  // Storage keys
  STORAGE: {
    MINING_KEYS: 'bee_mining_keys_',
    MINER_ADDRESS: 'bee_miner_address_',
    AN_WALLET_NAME: 'bee_an_wallet_name_',
    WALLET_ADDRESS: 'bee_wallet_address_',
    SESSION_DATA: 'bee_session_data_'
  },

  // How long the main process waits for the hidden bridge window to answer one
  // IPC request before giving up on it.
  //
  // bridgeRequest() used to be `new Promise((resolve) => ...)` with no reject
  // path and no timer, so a request the bridge never answered never settled.
  // Every caller awaiting it hung forever — and in miner.html the caller that
  // matters is `await beeEngine.canStart()` inside runBurst(), which holds
  // burstInFlight true for the rest of the run. burstInFlight true is also what
  // makes the burst-chain watchdog stand down (it reads an in-flight burst as
  // "runBurst() is mid-await, leave it alone"), so the one guard against "it
  // just stops completely" is disarmed by exactly the failure it exists for.
  // run24 session #35 sat idle ~135s in that state with a live countdown.
  //
  // Per action, because the honest budgets differ by two orders of magnitude:
  // canStart is a synchronous wasm call, getRewards is an on-chain transaction,
  // and waitForKeyPropagation polls for the length of the pairing window on
  // purpose. A timeout shorter than the work is a fake failure; the point is to
  // distinguish "still working" from "never coming back".
  BRIDGE_TIMEOUT_MS: {
    DEFAULT: 60000,
    // Local wasm calls with no network in them.
    canStart: 15000,
    addTap: 15000,
    stopMining: 15000,
    startMining: 30000,
    // One GraphQL round trip each, on a chain that sheds load under congestion.
    getCurrentBlock: 45000,
    getMinerData: 45000,
    getBalance: 45000,
    // A write: get_reward() is an external message and has to be accepted.
    getRewards: 90000,
    // Miner.new() cancels any session the contract still holds — a write, and
    // the one that gets refused with exit_code 410 while the old session ages.
    rebuildMinerInstance: 120000,
    // Deliberately long: this is the user picking up their phone, unlocking it,
    // opening the wallet and confirming. MAX_ATTEMPTS x INTERVAL_MS is five
    // minutes by design, so the timeout has to clear that with room to spare.
    waitForKeyPropagation: 420000,
    // A bounded read loop — see verifyMiningOwner's attempt budget.
    verifyMiningOwner: 60000
  }
};

module.exports = BEE_ENGINE_CONFIG;
