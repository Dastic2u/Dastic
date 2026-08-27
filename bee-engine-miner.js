/**
 * Bee Engine Miner Wrapper — renderer-side IPC client.
 *
 * @teamgosh/bee-sdk's WASM binary hard-crashes Electron's renderer
 * process (confirmed: exitCode -2147483645 / STATUS_BREAKPOINT), so the
 * actual SDK now runs in the main process (see bee-engine-main.js, a
 * plain Node.js context where the same WASM init has been confirmed to
 * work end-to-end). This class keeps the exact same public API it had
 * when it called the SDK directly — miner.html doesn't need to change —
 * but every call is now an ipcRenderer.invoke() round-trip to main.
 *
 * localStorage persistence (mining keys, miner address, AN wallet name)
 * stays here in the renderer, since localStorage isn't available in
 * Electron's main process.
 */

const { ipcRenderer } = require('electron');
const BEE_ENGINE_CONFIG = require('./bee-engine-config');
const { CONTRACT_ERRORS, exitCodeOf } = require('./bee-contract-errors');

class BeeEngineMiner {
  constructor() {
    this.walletName = null;      // local Dastic profile nickname — doubles as the IPC session key
    this.anWalletName = null;    // the user's real Acki Nacki Wallet name
    this.minerAddress = null;
    this.miningKeys = null;
    this.isMining = false;
    this.isAuthorized = false;
    // Whether the CHAIN agrees our mining key owns this miner slot.
    //   true  — confirmed by ensure_mining_keys_propagated
    //   false — confirmed NOT the owner (a 402 from either entry point, or a
    //           successful owner read that disagreed). Mining is pointless.
    //   null  — unknown, because the check could not complete. Mining proceeds.
    // Separate from isAuthorized because isAuthorized gates the read-only getters
    // too, and a stale key does not stop a single one of them working.
    this.ownerVerified = null;
    this.ownerCheckError = null;
    this.currentSession = null;
    this._miningEventListener = null;
  }

  /**
   * Record that the contract has refused an authenticated call with
   * ERR_NOT_OWNER.
   *
   * This is stronger evidence than the startup check: the startup check is a read
   * that can time out, whereas a 402 is the contract having executed our signed
   * message and rejected the signature. So it is allowed to overwrite a `null`
   * and even a stale `true`.
   */
  markNotOwner(detail) {
    this.ownerVerified = false;
    this.ownerCheckError = detail || 'contract refused with exit_code 402 (ERR_NOT_OWNER)';
  }

  getEndpoints() {
    return this.useTestnet ? BEE_ENGINE_CONFIG.TESTNET_ENDPOINTS : BEE_ENGINE_CONFIG.ENDPOINTS;
  }

  /**
   * Write the current pairing to the file mirror, best-effort.
   *
   * Fire-and-forget on purpose: the localStorage.setItem() calls right
   * before every call site already give the app a working copy for this
   * session immediately, synchronously. This is the durability layer for
   * the NEXT launch, and a failed write here shouldn't block anything the
   * user is doing right now.
   */
  _syncPairingMirror() {
    if (!this.walletName || !this.miningKeys || !this.minerAddress) return;
    ipcRenderer.invoke('pairing:write', this.walletName, {
      miningKeys: this.miningKeys,
      minerAddress: this.minerAddress,
      anWalletName: this.anWalletName || null,
    }).catch(() => {});
  }

  async initialize(walletName, useTestnet = false) {
    this.walletName = walletName;
    this.useTestnet = useTestnet;
    return { success: true, message: 'Ready' };
  }

  async generateMiningKeys() {
    try {
      const result = await ipcRenderer.invoke('bee:generateMiningKeys', {
        appId: BEE_ENGINE_CONFIG.APP_ID
      });
      if (!result.success) throw new Error(result.error || 'Key generation failed');

      this.miningKeys = { public: result.public, secret: result.secret, generatedAt: Date.now() };
      localStorage.setItem(BEE_ENGINE_CONFIG.STORAGE.MINING_KEYS + this.walletName, JSON.stringify(this.miningKeys));
      // See launcher.js's pairingFilePath() comment: localStorage alone has
      // proven unreliable for this on this machine, and losing pairing data
      // is far more disruptive than losing the launcher's wallet list was.
      this._syncPairingMirror();

      return { success: true, deepLink: result.deepLink, public: result.public, message: 'Mining keys generated. User must confirm in AN Wallet.' };
    } catch (error) {
      console.error('[BeeEngine] Key generation error:', error);
      return { success: false, error: error.message };
    }
  }

  async waitForKeyPropagation(anWalletName, publicKey) {
    try {
      if (!anWalletName) throw new Error('Acki Nacki Wallet name is required');
      this.anWalletName = anWalletName;

      const result = await ipcRenderer.invoke('bee:waitForKeyPropagation', {
        sessionKey: this.walletName,
        endpoints: this.getEndpoints(),
        appId: BEE_ENGINE_CONFIG.APP_ID,
        anWalletName,
        publicKey,
        secretKey: this.miningKeys.secret,
        maxAttempts: BEE_ENGINE_CONFIG.MINING.MAX_ATTEMPTS,
        intervalMs: BEE_ENGINE_CONFIG.MINING.INTERVAL_MS
      });
      if (!result.success) throw new Error(result.error || 'Wallet did not confirm in time');

      this.minerAddress = result.minerAddress;
      localStorage.setItem(BEE_ENGINE_CONFIG.STORAGE.MINER_ADDRESS + this.walletName, this.minerAddress);
      localStorage.setItem(BEE_ENGINE_CONFIG.STORAGE.AN_WALLET_NAME + this.walletName, anWalletName);
      this._syncPairingMirror();

      this.isAuthorized = true;
      // A fresh pairing IS the ownership check: waitForKeyPropagation does not
      // return until ensure_mining_keys_propagated() has seen our public key in
      // _owner_pubkey for this app id on chain.
      this.ownerVerified = true;
      this.ownerCheckError = null;
      return { success: true, minerAddress: this.minerAddress, message: 'Pairing complete' };
    } catch (error) {
      console.error('[BeeEngine] Key propagation error:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyWithFirstTap(x = 256, y = 256) {
    try {
      if (!this.isAuthorized) throw new Error('Not paired yet. Complete wallet pairing first.');
      const result = await ipcRenderer.invoke('bee:verifyFirstTap', { sessionKey: this.walletName, x, y });
      if (!result.success) throw new Error(result.error || 'Ownership verification failed');
      return { success: true, message: 'Wallet ownership verified' };
    } catch (error) {
      console.error('[BeeEngine] First tap error:', error);
      return { success: false, error: error.message };
    }
  }

  async startMining(durationMs, eventCallback, _isRetry = false) {
    try {
      if (!this.isAuthorized) throw new Error('Not paired yet. Complete wallet pairing first.');
      if (this.isMining) throw new Error('Mining already in progress');

      const validDuration = Math.max(
        BEE_ENGINE_CONFIG.MINING.MIN_DURATION,
        Math.min(durationMs, BEE_ENGINE_CONFIG.MINING.MAX_DURATION)
      );

      // Forward per-tick mining events from main back to the caller
      if (this._miningEventListener) {
        ipcRenderer.removeListener(`bee:miningEvent:${this.walletName}`, this._miningEventListener);
      }
      this._miningEventListener = (event, miningEvent) => {
        if (eventCallback) eventCallback(miningEvent);
      };
      ipcRenderer.on(`bee:miningEvent:${this.walletName}`, this._miningEventListener);

      const result = await ipcRenderer.invoke('bee:startMining', { sessionKey: this.walletName, durationMs: validDuration });

      if (!result.success) {
        // The bridge tracks its own isMining flag independently of this
        // class's. If a previous session ended in a race (e.g. an
        // overlapping timer tick) that flag can get stuck true on the
        // bridge side even though this.isMining is already false here —
        // every future start then fails with "already in progress"
        // forever. Self-heal once: force-stop on the bridge, then retry.
        const staleLock = /already in progress/i.test(result.error || '');
        if (staleLock && !_isRetry) {
          console.warn('[BeeEngine] Bridge reports a stale mining lock — clearing and retrying once.');
          await ipcRenderer.invoke('bee:stopMining', { sessionKey: this.walletName });
          return this.startMining(durationMs, eventCallback, true);
        }
        throw new Error(result.error || 'Mining could not start');
      }

      this.isMining = true;
      this.currentSession = { startTime: Date.now(), duration: validDuration, taps: 0 };

      return { success: true, message: 'Mining started' };
    } catch (error) {
      this.isMining = false;
      console.error('[BeeEngine] Mining start error:', error);
      return { success: false, error: error.message };
    }
  }

  async addTap(x, y) {
    try {
      if (!this.isMining) throw new Error('No active mining session');
      const result = await ipcRenderer.invoke('bee:addTap', { sessionKey: this.walletName, x, y });
      if (!result.success) throw new Error(result.error || 'Tap failed');
      if (this.currentSession) this.currentSession.taps = result.taps;
      return { success: true, taps: result.taps };
    } catch (error) {
      console.error('[BeeEngine] Tap error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel the SDK's worker.
   *
   * `force` skips the local isMining guard. That guard exists so a normal
   * caller can't stop a session twice, but it also made the wedged-engine
   * case unrecoverable: markSessionEnded() clears this flag as soon as OUR
   * bookkeeping is done, while the bridge's own session.isMining and the
   * SDK's live worker are both still up. can_start() then reports false
   * forever and nothing is allowed to clear it — run12 sat in that state for
   * 25 minutes, polling the block height and never starting another session.
   * The bridge's stopMining handler gates on its own flag, so reaching it
   * with force:true is what actually breaks the deadlock.
   */
  async stopMining({ force = false } = {}) {
    try {
      if (!this.isMining && !force) return { success: false, error: 'No active mining session' };
      if (force && !this.isMining) {
        console.warn('[BeeEngine] Force-stopping the engine: our session is already closed locally ' +
          'but the SDK worker is still holding the slot.');
      }
      const result = await ipcRenderer.invoke('bee:stopMining', { sessionKey: this.walletName, force });
      this.isMining = false;
      if (this._miningEventListener) {
        ipcRenderer.removeListener(`bee:miningEvent:${this.walletName}`, this._miningEventListener);
        this._miningEventListener = null;
      }
      return result;
    } catch (error) {
      console.error('[BeeEngine] Mining stop error:', error);
      this.isMining = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Local-only cleanup for when the SDK already finished a session on
   * its own (the real status_updated 'finished' event fired). Per the
   * docs, "If not called, the Bee Engine Miner stops automatically after
   * duration_ms and submits results on its own" — calling the real
   * stop()/stopMining() again here would be a redundant, possibly
   * duplicate submission. Use stopMining() instead only when forcing an
   * early/unfinished session to end (manual cancel, or the safety
   * fallback when 'finished' never arrives).
   */
  markSessionEnded() {
    this.isMining = false;
    if (this._miningEventListener) {
      ipcRenderer.removeListener(`bee:miningEvent:${this.walletName}`, this._miningEventListener);
      this._miningEventListener = null;
    }
  }

  /**
   * Whether the SDK's Miner instance is actually ready to start a new
   * session. Miner.stop() is synchronous but session settlement
   * (submitting the proof/root on-chain) happens in the background —
   * this can correctly return false for a while after stop() resolves.
   */
  async canStart() {
    try {
      const result = await ipcRenderer.invoke('bee:canStart', { sessionKey: this.walletName });
      if (!result.success) throw new Error(result.error || 'Readiness check failed');
      return { success: true, canStart: !!result.canStart };
    } catch (error) {
      console.error('[BeeEngine] canStart check error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reads the Miner contract's on-chain epoch counters: epoch_start,
   * epoch_5m_start, tap_sum, tap_sum_5m.
   *
   * These are NOT unix timestamps despite looking like them — a live
   * epoch_start of 79910000 would be 1972. They are BLOCK HEIGHTS.
   * Measured live on 2026-08-21: epoch_5m_start held one value for ~4
   * minutes and then advanced by exactly 1000, with tap_sum_5m resetting
   * to 0 at the same instant — so one 5-minute window is 1000 blocks,
   * i.e. Acki Nacki's 300ms block time, which is also why
   * BEE_ENGINE_CONFIG.REWARDS.EPOCH_BLOCKS is 1000.
   *
   * miner.html re-measures this every run rather than trusting it, and
   * only accepts a jump as a measurement when the wall clock confirms at
   * least one window elapsed: epoch_5m_start lives on the miner's own
   * account and only rolls forward when that account submits taps, so
   * after an idle spell it leaps several windows forward at once. The
   * daily countdown is derived from the block time and labelled in the UI
   * as derived.
   */
  async getMinerData() {
    try {
      if (!this.isAuthorized) throw new Error('Not paired yet');
      const result = await ipcRenderer.invoke('bee:getMinerData', { sessionKey: this.walletName });
      if (!result.success) throw new Error(result.error || 'Miner data query failed');
      return {
        success: true,
        epochStart: result.epochStart,
        epoch5mStart: result.epoch5mStart,
        tapSum: result.tapSum,
        tapSum5m: result.tapSum5m
      };
    } catch (error) {
      console.error('[BeeEngine] getMinerData error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * The chain's current block height (GraphqlBlockData.seq_no).
   *
   * epoch_start / epoch_5m_start are block sequence numbers in this same
   * unit, so this is what turns them into a real countdown: it is a live
   * clock, whereas the account's own epoch counters freeze whenever the
   * account isn't submitting taps.
   */
  async getCurrentBlock() {
    // Mainnet's GraphQL endpoint sheds load under congestion with "pool
    // timed out while waiting for an open connection" — 13 of them in 90
    // seconds during the 2026-08-21 run, and 2 of 3 block reads failed. A
    // failed read costs the epoch/window countdown its anchor refresh, so
    // retry the transient class of failure a couple of times with a short
    // backoff instead of dropping the poll entirely. Non-transient errors
    // (not paired, bad session) return on the first attempt — retrying
    // those would just stall the caller.
    //
    // The backoff is JITTERED. Every retry in this app was on a fixed ladder, so
    // a congested node got its retries from the block poll, the miner-data poll
    // and the SDK's own event reader in lockstep — run24 shows "Query miner
    // events" failing on a ~7s loop for 13 minutes with 67 pool timeouts. Fixed
    // backoff against a connection-pool limit is a thundering herd of one client:
    // each wave arrives together, exhausts the pool together, and fails together.
    // Spreading each wave over its own interval is the standard fix and costs
    // nothing.
    //
    // The transient set is widened to the classes the SDK's own network layer
    // names in its retry policy (the wasm binary lists server_code 408/425/429/
    // 500/502/503/504, "connection reset by peer", "dns error", "client error
    // (Connect)", "client error (SendRequest)"). Those are all load-shedding, and
    // treating a 503 as a permanent failure threw away a read that would have
    // worked 2 seconds later.
    const TRANSIENT = /pool timed out|queue is full|QUEUE_OVERFLOW|timed out|timeout|temporarily|connection reset|dns error|SendRequest|Send ?Request|client error \(Connect\)|server_code: (?:408|425|429|500|502|503|504)/i;
    const MAX_TRIES = 3;
    let lastError = 'Current block query failed';

    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      try {
        if (!this.isAuthorized) throw new Error('Not paired yet');
        const result = await ipcRenderer.invoke('bee:getCurrentBlock', { sessionKey: this.walletName });
        if (!result.success) throw new Error(result.error || 'Current block query failed');
        if (attempt > 1) console.log(`[BeeEngine] getCurrentBlock succeeded on attempt ${attempt}.`);
        return { success: true, seqNo: result.seqNo };
      } catch (error) {
        lastError = error.message || String(error);
        if (!TRANSIENT.test(lastError) || attempt === MAX_TRIES) {
          console.error('[BeeEngine] getCurrentBlock error:', lastError);
          return { success: false, error: lastError };
        }
        const backoffMs = Math.round(1500 * attempt * (0.5 + Math.random()));
        console.warn(`[BeeEngine] getCurrentBlock hit mainnet congestion (attempt ${attempt}/${MAX_TRIES}), ` +
          `retrying in ${backoffMs}ms.`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
    return { success: false, error: lastError };
  }

  /**
   * Ask the chain whether our stored mining key is still the registered owner
   * of this miner slot for our app id.
   *
   * Three-valued on purpose, and the caller must treat the three differently:
   *   verified                        → the pairing is live
   *   verified false, mismatch true   → the chain answered and disagreed; mining
   *                                     is impossible until the user re-pairs
   *   verified false, inconclusive    → we could not get an answer; mining is
   *                                     allowed to proceed, and the first
   *                                     submission's exit code settles it
   *
   * Collapsing the third case into the second would ground the miner every time
   * mainnet is congested, which is most of the time (run24: 67 connection-pool
   * timeouts in 13 minutes). Collapsing it into the first is what shipped, and
   * that is the bug being fixed.
   */
  async verifyMiningOwner() {
    try {
      if (!this.miningKeys || !this.miningKeys.public || !this.minerAddress) {
        return { verified: false, inconclusive: true, error: 'nothing stored to verify' };
      }
      const result = await ipcRenderer.invoke('bee:verifyMiningOwner', {
        endpoints: this.getEndpoints(),
        appId: BEE_ENGINE_CONFIG.APP_ID,
        minerAddress: this.minerAddress,
        publicKey: this.miningKeys.public,
        maxAttempts: 2,
        intervalMs: 2000
      });
      // A bridge timeout or a dead bridge is not the chain disagreeing with us.
      if (!result || !result.success) {
        return {
          verified: false,
          inconclusive: true,
          error: (result && result.error) || 'owner check did not complete'
        };
      }
      return result;
    } catch (error) {
      return { verified: false, inconclusive: true, error: error.message || String(error) };
    }
  }

  /**
   * Claim whatever the epoch owes.
   *
   * Exit codes here are the contract's, from
   * contracts/mvsystem/modifiers/errors.sol in github.com/ackinacki/ackinacki:
   *
   *   409 ERR_NOT_READY  — getReward()'s only body require() is
   *                        `require(_mbiCur.hasValue(), ERR_NOT_READY)`. THIS is
   *                        "nothing to claim yet", and it is the expected answer
   *                        on a startup sync before any epoch has completed.
   *   402 ERR_NOT_OWNER  — raised by the onlyOwnerPubkey modifier the function
   *                        sits behind, i.e. msg.pubkey() != _owner_pubkey[appId].
   *                        Nothing to do with rewards at all: it means our mining
   *                        key is not the registered one, so every authenticated
   *                        call — including every tap submission — will also be
   *                        refused.
   *
   * This method used to print 402 as "No reward to claim yet ... this is
   * expected", which is how a fatal authorization failure came out as reassuring
   * startup noise on every launch of every run in this log series. The reward
   * sync runs before mining starts, so it is in fact the EARLIEST possible
   * warning — worth saying loudly, and worth reporting back so the caller can
   * refuse to mine.
   */
  async getRewards() {
    try {
      if (!this.isAuthorized) throw new Error('Not paired yet');
      const result = await ipcRenderer.invoke('bee:getRewards', { sessionKey: this.walletName });
      if (!result.success) throw new Error(result.error || 'Reward claim failed');
      return { success: true, claimed: true };
    } catch (error) {
      const message = error.message || String(error);
      const exitCode = exitCodeOf(message);
      if (exitCode === CONTRACT_ERRORS.NOT_READY) {
        console.log('[BeeEngine] No reward to claim yet (contract exit_code 409, ERR_NOT_READY) — ' +
          'the epoch pays out once, so this is expected until the next epoch completes.');
        return { success: false, error: 'nothing to claim yet', nothingToClaim: true };
      }
      if (exitCode === CONTRACT_ERRORS.NOT_OWNER) {
        console.error('[BeeEngine] The Miner contract refused the reward claim with exit_code 402, ' +
          'ERR_NOT_OWNER: the mining key this app is signing with is NOT the key registered as ' +
          `_owner_pubkey for app id ${BEE_ENGINE_CONFIG.APP_ID} on ${this.minerAddress}. ` +
          'Tap submissions go through the same ownership check, so none of them can be accepted ' +
          'either. The saved pairing is stale — re-pair the wallet.');
        return { success: false, error: 'mining key is not the registered owner', notOwner: true };
      }
      console.error('[BeeEngine] Reward collection error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Read the MINER CONTRACT's on-chain NACKL balance (currency_id 1) via
   * multisig_balances(minerAddress) — not the user's own wallet balance.
   * The reference implementation (github.com/gosh-sh/bee-engine
   * examples/javascript/miner-react) reads the connected wallet's own
   * address instead, via a `Wallet` instance's get_multifactor_balances().
   * Doing the same here would need the wallet's address, which requires
   * adopting the reference's BeeConnect handshake — our simpler flow
   * (matching the docs' "Flow 1") only resolves the wallet NAME to a
   * miner contract address, not the wallet's own address. Until that's
   * adopted, this number reflects the miner contract, not the user's
   * personal wallet balance — flagged honestly rather than silently
   * conflating the two.
   *
   * Decimals ARE confirmed: the reference app formats NACKL with 9
   * decimals (formatNanoToDisplay(value, decimals=9, ...)).
   */
  async getBalance() {
    try {
      if (!this.minerAddress) throw new Error('Not paired yet');
      const result = await ipcRenderer.invoke('bee:getBalance', {
        endpoints: this.getEndpoints(),
        address: this.minerAddress
      });
      if (!result.success) throw new Error(result.error || 'Balance query failed');
      return { success: true, nacklRaw: result.nacklRaw };
    } catch (error) {
      console.error('[BeeEngine] Balance query error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resolve — and cache — the user's OWN multifactor wallet address.
   *
   * This is what the comment on getBalance() above said we couldn't have
   * without adopting BeeConnect. That turned out to be wrong: the SDK
   * exposes Wallet.get_multifactor_data_by_name(name), which takes exactly
   * the wallet name this app already collects at pairing and returns the
   * account's own `address`. No handshake, no QR, no extra pairing state.
   *
   * Cached in localStorage because it is derived from the wallet NAME and
   * therefore as stable as the pairing itself — re-resolving it on every
   * balance poll would be a network round trip for a constant.
   */
  async getWalletAddress({ refresh = false } = {}) {
    const key = BEE_ENGINE_CONFIG.STORAGE.WALLET_ADDRESS + this.walletName;
    if (!refresh) {
      const cached = localStorage.getItem(key);
      if (cached) return { success: true, address: cached, cached: true };
    }
    if (!this.anWalletName) return { success: false, error: 'No Acki Nacki wallet name stored' };
    try {
      const result = await ipcRenderer.invoke('bee:getWalletProfile', {
        endpoints: this.getEndpoints(),
        apiUrl: BEE_ENGINE_CONFIG.API_URL,
        appId: BEE_ENGINE_CONFIG.APP_ID,
        walletName: this.anWalletName
      });
      if (!result.success) throw new Error(result.error || 'Could not resolve wallet address');
      localStorage.setItem(key, result.address);
      this.walletAddress = result.address;
      return { success: true, address: result.address };
    } catch (error) {
      console.error('[BeeEngine] Wallet address resolve error:', error);
      return { success: false, error: error.message };
    }
  }

  /** The USER's own NACKL balance (raw, 9 decimals) — not the miner contract's. */
  async getWalletBalance() {
    const addr = await this.getWalletAddress();
    if (!addr.success) return addr;
    try {
      const result = await ipcRenderer.invoke('bee:getWalletBalance', {
        endpoints: this.getEndpoints(),
        apiUrl: BEE_ENGINE_CONFIG.API_URL,
        appId: BEE_ENGINE_CONFIG.APP_ID,
        multifactorAddress: addr.address
      });
      if (!result.success) throw new Error(result.error || 'Wallet balance query failed');
      // Two DIFFERENT balances live on this one result, and the interesting
      // one is not the obvious one. Verified live 2026-08-22 against this
      // wallet: ecc={"1":"20000000000"} (20 NACKL) while
      // popitgame={"1":"90774977053377"} (90,774.98 NACKL) — and the user
      // confirmed their wallet shows ~90,749 LOCKED against 20 unlocked.
      // So `ecc` is the spendable/unlocked figure and `popitgame` — despite
      // the name — is where mined NACKL accrues, locked. Mining never moves
      // `ecc` at all, which is why a balance built on it looked frozen at a
      // suspiciously round 20.0 no matter how much was mined.
      const lockedRaw = (result.popitgame && (result.popitgame['1'] ?? result.popitgame[1])) || null;
      return {
        success: true,
        lockedRaw,                       // mined/locked — the headline figure
        unlockedRaw: result.nacklRaw,    // spendable
        nacklRaw: lockedRaw != null ? lockedRaw : result.nacklRaw,
        ecc: result.ecc,
        popitgame: result.popitgame,
        address: addr.address
      };
    } catch (error) {
      console.error('[BeeEngine] Wallet balance error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Transaction history for the user's wallet, newest first.
   *
   * `miningCursor` is a SEPARATE pagination track the SDK maintains for
   * mining credits (next_mining_cursor), independent of ordinary transfers.
   */
  async getWalletHistory({ pageSize = 25, cursor = null, miningCursor = null, tokenId = '1' } = {}) {
    const addr = await this.getWalletAddress();
    if (!addr.success) return addr;
    try {
      const result = await ipcRenderer.invoke('bee:getWalletHistory', {
        endpoints: this.getEndpoints(),
        apiUrl: BEE_ENGINE_CONFIG.API_URL,
        appId: BEE_ENGINE_CONFIG.APP_ID,
        multifactorAddress: addr.address,
        pageSize, cursor, miningCursor, tokenId
      });
      if (!result.success) throw new Error(result.error || 'History query failed');
      return result;
    } catch (error) {
      console.error('[BeeEngine] History error:', error);
      return { success: false, error: error.message };
    }
  }

  getStatus() {
    return {
      authorized: this.isAuthorized,
      ownerVerified: this.ownerVerified,
      ownerCheckError: this.ownerCheckError,
      isMining: this.isMining,
      walletName: this.walletName,
      anWalletName: this.anWalletName,
      minerAddress: this.minerAddress,
      currentSession: this.currentSession
    };
  }

  /**
   * Restore a previous pairing from localStorage and rebuild the live
   * Miner instance in main so mining can resume without re-scanning the
   * QR code.
   */
  async restoreAuthorization(walletName) {
    try {
      // The file mirror is authoritative, not a fallback — same reasoning as
      // the launcher's wallet list (see launcher.js's pairingFilePath()
      // comment): reproduced live, an already-paired wallet reading null
      // from localStorage.getItem() while the exact same key sat intact in
      // the LevelDB store on disk at that moment. sendSync so this resolves
      // before anything downstream can act on a still-loading pairing.
      let keys = null, address = null, anWalletName = null;
      try {
        const mirrored = ipcRenderer.sendSync('pairing:readSync', walletName);
        if (mirrored && mirrored.miningKeys && mirrored.minerAddress) {
          keys = JSON.stringify(mirrored.miningKeys);
          address = mirrored.minerAddress;
          anWalletName = mirrored.anWalletName || null;
        }
      } catch (e) { /* fall through to localStorage below */ }

      if (!keys || !address) {
        // Nothing in the file yet — true first pairing, or a pre-mirror
        // install. Falls back to localStorage ONE TIME; the write sites
        // (generateMiningKeys / waitForKeyPropagation) seed the mirror going
        // forward so this branch stops being needed after the first read.
        const keysKey = BEE_ENGINE_CONFIG.STORAGE.MINING_KEYS + walletName;
        const addressKey = BEE_ENGINE_CONFIG.STORAGE.MINER_ADDRESS + walletName;
        const anWalletKey = BEE_ENGINE_CONFIG.STORAGE.AN_WALLET_NAME + walletName;
        keys = localStorage.getItem(keysKey);
        address = localStorage.getItem(addressKey);
        anWalletName = localStorage.getItem(anWalletKey);
      }

      if (!keys || !address) {
        return { success: false, error: 'No saved pairing found' };
      }

      this.walletName = walletName;
      this.anWalletName = anWalletName;
      this.miningKeys = JSON.parse(keys);
      this.minerAddress = address;
      // Keep the mirror current with whatever was actually loaded — a no-op
      // when it was the source in the first place, and backfills it on the
      // one-time localStorage fallback above.
      this._syncPairingMirror();

      const result = await ipcRenderer.invoke('bee:rebuildMinerInstance', {
        sessionKey: this.walletName,
        endpoints: this.getEndpoints(),
        appId: BEE_ENGINE_CONFIG.APP_ID,
        minerAddress: this.minerAddress,
        publicKey: this.miningKeys.public,
        secretKey: this.miningKeys.secret
      });
      if (!result.success) throw new Error(result.error || 'Could not rebuild miner instance');

      // Miner.new() succeeding is not evidence that the pairing is live. It
      // builds a signer from the stored keys and cancels any stale session on the
      // contract; it never asks the chain whether those keys are the registered
      // owner. So this used to set isAuthorized and print "Pairing restored"
      // regardless — and a stale pairing then ran a full session per window,
      // computing taps that the contract refused with 402 every single time.
      //
      // isAuthorized is still set even on a mismatch, deliberately. All the
      // read-only getters (getMinerData, getCurrentBlock, getBalance) gate on it
      // and none of them needs a signature, so refusing it would blank the whole
      // diagnostic UI at the exact moment the user needs to see it. Ownership
      // gets its own flag, and miner.html refuses to START MINING on that flag —
      // which is the only thing a stale key actually prevents.
      const owner = await this.verifyMiningOwner();
      this.isAuthorized = true;
      this.ownerVerified = owner.verified === true ? true : (owner.mismatch ? false : null);
      this.ownerCheckError = owner.error || null;

      if (this.ownerVerified === true) {
        console.log('[BeeEngine] Pairing restored from localStorage and confirmed on chain — ' +
          'our mining key is the registered owner for this app id.');
        return { success: true, message: 'Pairing restored', ownerVerified: true };
      }
      if (this.ownerVerified === false) {
        console.error('[BeeEngine] Pairing restored from localStorage but the chain DISAGREES: the ' +
          `mining key stored for "${walletName}" is not _owner_pubkey for app id ` +
          `${BEE_ENGINE_CONFIG.APP_ID} on ${this.minerAddress}. Every authenticated call — every ` +
          'tap submission and every reward claim — will be refused with exit_code 402 ' +
          '(ERR_NOT_OWNER) until the wallet is re-paired. Not starting a mining session: it would ' +
          'compute for a minute and be refused, once per window, indefinitely.');
        return {
          success: true,
          message: 'Pairing restored but the mining key is not the registered owner',
          ownerVerified: false,
          needsRePairing: true,
          error: owner.error || 'mining key is not the registered owner'
        };
      }
      console.warn('[BeeEngine] Pairing restored from localStorage, but the ownership check could ' +
        `not complete (${owner.error || 'no answer'}). Proceeding — a congested node fails this ` +
        'check exactly like a stale pairing does, and refusing to mine on that would ground the ' +
        'app every time mainnet is busy. The first submission settles it: exit_code 402 means the ' +
        'pairing really is stale, and that is now handled as such.');
      return { success: true, message: 'Pairing restored', ownerVerified: null };
    } catch (error) {
      console.error('[BeeEngine] Restore error:', error);
      return { success: false, error: error.message };
    }
  }

  clearWalletData(walletName) {
    try {
      localStorage.removeItem(BEE_ENGINE_CONFIG.STORAGE.MINING_KEYS + walletName);
      localStorage.removeItem(BEE_ENGINE_CONFIG.STORAGE.MINER_ADDRESS + walletName);
      localStorage.removeItem(BEE_ENGINE_CONFIG.STORAGE.AN_WALLET_NAME + walletName);

      if (this.walletName === walletName) {
        this.isAuthorized = false;
        this.ownerVerified = null;
        this.ownerCheckError = null;
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
