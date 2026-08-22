/**
 * Acki Nacki Miner contract exit codes, and how to read one out of an SDK error.
 *
 * Source: contracts/mvsystem/modifiers/errors.sol in github.com/ackinacki/ackinacki
 * (`versionErrors = "6.2.0"`, abstract contract Errors, all uint16). Read from the
 * repository rather than inferred from behaviour — every previous reading of 402 in
 * this codebase was a guess from context, and every one of them was wrong.
 *
 * Why this file exists: the two entry points this app uses are
 *
 *   function setCommitData(uint256 id, uint64 easyNumber, uint64 tapNumber,
 *                          uint64 workerId, bytes data)
 *       public onlyOwnerPubkey(_owner_pubkey[id]) accept
 *
 *   function getReward(uint256 id)
 *       public onlyOwnerPubkey(_owner_pubkey[id]) accept
 *
 * and `onlyOwnerPubkey` is `require(msg.pubkey() == rootpubkey, ERR_NOT_OWNER)`.
 * So BOTH of them answer 402 for the same single cause — the signing key is not the
 * key registered for our app id — and 402 says nothing whatsoever about taps,
 * windows, allowances or rewards. Codes that DO mean those things are separate and
 * are listed below, which is the point: a refusal is only actionable if you can
 * tell which refusal it is.
 *
 * Deliberately not a complete transcription of errors.sol. Only the codes this app
 * can actually provoke are here, so that a name in this table is a name we can
 * defend. The signer/Groth16 range (501–514), the recovery pair (600/601) and the
 * card range (700–705) belong to contract paths the miner never calls.
 */

const CONTRACT_ERRORS = {
  // Ownership. The modifier every authenticated call goes through.
  NOT_OWNER: 402,          // ERR_NOT_OWNER — msg.pubkey() != _owner_pubkey[appId]
  INVALID_SENDER: 407,     // ERR_INVALID_SENDER

  // Message-level refusals: retryable, or fixable by re-sending.
  MESSAGE_EXPIRED: 403,    // ERR_MESSAGE_EXPIRED
  MESSAGE_HUGE_EXPIREAT: 404,
  MESSAGE_IS_EXIST: 405,   // ERR_MESSAGE_IS_EXIST — a duplicate, already in flight
  LOW_VALUE: 406,          // ERR_LOW_VALUE
  LOW_BALANCE: 408,        // ERR_LOW_BALANCE — the miner contract is out of gas money

  // State refusals.
  NOT_READY: 409,          // ERR_NOT_READY — getReward()'s "nothing to pay out yet"
  WRONG_DATA: 410,         // ERR_WRONG_DATA — setCommitData()'s "a commit is already
                           //   present", i.e. the previous session has not settled
  BUSY: 411,               // ERR_BUSY
  ALREADY_PLAY: 401,       // ERR_ALREADY_PLAY
  FULL_TAPS: 419           // ERR_FULL_TAPS — MAX_LEN_TAPS exceeded. THIS is the real
                           //   "the allowance for this window is spent"; 402 never was.
};

/**
 * Pull the numeric exit code out of an SDK / TVM error string.
 *
 * The SDK surfaces the transaction's compute phase as serialised Rust, so the
 * figure arrives as `"exit_code": Number(402)`. It also appears bare as
 * `exit_code=52` in some of the wasm's own messages and as `exit_code: 402` in
 * others, so all three shapes are accepted rather than one.
 *
 * Returns null when there is no exit code in the message at all — which is itself
 * meaningful: a refusal with no exit code did not reach the contract's compute
 * phase, so it is transport, not a verdict. Callers must not treat null as 0.
 */
function exitCodeOf(message) {
  const text = message == null ? '' : String(message);
  const m = text.match(/exit_code\\?"?\s*[:=]\s*(?:Number\()?(\d+)/i);
  return m ? Number(m[1]) : null;
}

/**
 * Is this failure the node shedding load rather than the contract deciding?
 *
 * Kept next to the exit-code table because the distinction is the same
 * distinction: congestion means the message never executed and re-sending it is
 * legitimate, whereas an exit code means it executed and was judged. Mixing them
 * up in either direction is expensive — retrying a verdict burns a 60s worker to
 * be told no again, and giving up on congestion throws away a window that was
 * never refused.
 *
 * exit_code 410 is listed here on purpose despite being a real contract verdict:
 * "a commit is already present" clears by itself as the previous session settles,
 * so the correct response is a retry, which is what the congestion path does.
 */
function isCongestion(message) {
  const text = message == null ? '' : String(message);
  if (/QUEUE_OVERFLOW|queue is full|pool timed out|timed out|timeout|connection reset|dns error/i.test(text)) {
    return true;
  }
  return exitCodeOf(text) === CONTRACT_ERRORS.WRONG_DATA;
}

/**
 * A human sentence for one exit code, and whether the app should keep trying.
 *
 * `fatal` means no amount of retrying inside this app can change the answer —
 * something outside it has to change first (a re-pair, a top-up). `retryable`
 * means the same submission could succeed later. A code that is neither is a
 * verdict on THIS submission only: stop the current batch, let the next session
 * start fresh.
 */
function describeExitCode(code) {
  switch (code) {
    case CONTRACT_ERRORS.NOT_OWNER:
      return {
        name: 'ERR_NOT_OWNER',
        fatal: true,
        retryable: false,
        needsRePairing: true,
        message: 'the mining key this app signs with is not the key registered as the owner of ' +
          'this miner slot, so the contract refuses every authenticated call — the saved pairing ' +
          'is stale and the wallet has to be re-paired'
      };
    case CONTRACT_ERRORS.FULL_TAPS:
      return {
        name: 'ERR_FULL_TAPS',
        fatal: false,
        retryable: false,
        windowSpent: true,
        message: 'the tap allowance for this window is full (MAX_LEN_TAPS) — nothing more will be ' +
          'accepted until the window rolls over'
      };
    case CONTRACT_ERRORS.NOT_READY:
      return {
        name: 'ERR_NOT_READY',
        fatal: false,
        retryable: true,
        message: 'the contract has nothing ready for this call yet'
      };
    case CONTRACT_ERRORS.WRONG_DATA:
      return {
        name: 'ERR_WRONG_DATA',
        fatal: false,
        retryable: true,
        message: 'a commit from the previous session is still present on the contract — this clears ' +
          'as that session settles'
      };
    case CONTRACT_ERRORS.MESSAGE_EXPIRED:
      return {
        name: 'ERR_MESSAGE_EXPIRED',
        fatal: false,
        retryable: true,
        message: 'the message reached the contract after its expiry — the round trip was too slow, ' +
          'which is a congestion symptom'
      };
    case CONTRACT_ERRORS.MESSAGE_IS_EXIST:
      return {
        name: 'ERR_MESSAGE_IS_EXIST',
        fatal: false,
        retryable: false,
        message: 'this exact message is already on the contract — it was sent twice'
      };
    case CONTRACT_ERRORS.LOW_BALANCE:
      return {
        name: 'ERR_LOW_BALANCE',
        fatal: true,
        retryable: false,
        message: 'the miner contract does not hold enough to pay for the call — it needs topping up'
      };
    case CONTRACT_ERRORS.LOW_VALUE:
      return {
        name: 'ERR_LOW_VALUE',
        fatal: true,
        retryable: false,
        message: 'the value attached to the call is below what the contract requires'
      };
    case CONTRACT_ERRORS.BUSY:
      return {
        name: 'ERR_BUSY',
        fatal: false,
        retryable: true,
        message: 'the contract is busy with another operation'
      };
    case CONTRACT_ERRORS.INVALID_SENDER:
      return {
        name: 'ERR_INVALID_SENDER',
        fatal: true,
        retryable: false,
        needsRePairing: true,
        message: 'the contract does not accept this sender'
      };
    case null:
    case undefined:
      return null;
    default:
      // An exit code we have not characterised. Say so instead of inventing a
      // meaning for it — the last three runs were spent undoing exactly that.
      return {
        name: `exit_code ${code}`,
        fatal: false,
        retryable: false,
        message: `the contract executed the message and refused it with exit_code ${code}, which ` +
          'this app does not have a documented reading for'
      };
  }
}

module.exports = { CONTRACT_ERRORS, exitCodeOf, isCongestion, describeExitCode };
