// Resilient JSON file reads/writes shared by every plain-file mirror in
// this app (the wallet list, per-wallet pairing data, and settings).
//
// Lives in its own module rather than inside launcher.js so the recovery
// behaviour can be tested directly, without booting Electron. The bug it
// exists for is not reproducible on demand, so the tests are the only way
// to know the fallback path actually works before shipping it.
const fs = require('fs');
const path = require('path');
/**
 * Resilient JSON reads/writes for every plain-file mirror below.
 *
 * Diagnosed 2026-08-29 from a live failure: the launcher read wallets.json,
 * got a run of NUL bytes back, failed to parse, and fell back to an empty
 * list — so a user with two wallets was shown none. The file was never
 * damaged: 274 bytes of valid JSON, mtime unchanged from two days earlier,
 * and it read back perfectly minutes later from another process. The READ
 * failed, not the file.
 *
 * The machine had an unclean shutdown (Kernel-Power 41 + EventLog 6008) at
 * 14:52 that afternoon, four hours before the bad read — the fourth in
 * seven days. After a hard power loss NTFS can hand back a file whose size
 * and timestamp are intact but whose data was never committed, and the
 * uncommitted region reads as zeros: exactly the shape we caught. The same
 * machine produced an equally inexplicable transient "file does not exist"
 * for this same file on 2026-08-23, the day after two more unclean
 * shutdowns.
 *
 * So a single fs call on this machine proves nothing. Retry briefly (the
 * bad window is short), check for the zero-fill signature explicitly rather
 * than only catching a parse throw, and keep a .bak of the last content
 * that actually parsed. Callers get {ok, value} and MUST NOT treat a failed
 * read as "the user has no data" — conflating those two IS the bug.
 */
const JSON_READ_ATTEMPTS = 5;

function readJsonOnce(p) {
  if (!fs.existsSync(p)) return { ok: false, reason: 'missing' };
  const raw = fs.readFileSync(p, 'utf8');
  if (raw.length === 0) return { ok: false, reason: 'empty file' };
  // The zero-fill signature. Caught only by accident before, as a confusing
  // "Unexpected token" parse error that read like the file was garbage.
  if (raw.indexOf('\u0000') !== -1) {
    return { ok: false, reason: `zero-filled (${raw.length} bytes) — unclean-shutdown signature` };
  }
  return { ok: true, value: JSON.parse(raw) };
}

// Busy-wait, not async: every caller is a synchronous IPC reply or runs
// before any window exists, so there is nothing to yield to. Kept to a few
// short spins for exactly that reason.
function sleepSync(ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) { /* spin */ }
}

function readJsonResilient(p, label) {
  const bak = p + '.bak';
  const haveBackup = fs.existsSync(bak);

  // A missing primary with no backup either is a genuinely fresh profile,
  // not a failure — return at once rather than spinning on every launch.
  // A missing primary WHEN a backup exists is the suspicious case: this
  // file demonstrably held good content once, and a vanishing act is the
  // precise symptom seen on 2026-08-23. That one is worth retrying.
  if (!fs.existsSync(p) && !haveBackup) return { ok: false, reason: 'missing', fresh: true };

  let lastReason = 'unknown';
  for (let attempt = 1; attempt <= JSON_READ_ATTEMPTS; attempt++) {
    try {
      const r = readJsonOnce(p);
      if (r.ok) {
        if (attempt > 1) {
          console.warn(`[launcher] ${label}: read succeeded on attempt ${attempt} after ` +
            `"${lastReason}" — transient filesystem failure, the data itself is fine.`);
        }
        return r;
      }
      lastReason = r.reason;
    } catch (e) {
      lastReason = e.message;
    }
    if (attempt < JSON_READ_ATTEMPTS) sleepSync(attempt * 40);
  }

  // Primary is unreadable. Fall back to the last content that parsed.
  try {
    const r = readJsonOnce(bak);
    if (r.ok) {
      console.error(`[launcher] ${label}: primary unreadable after ${JSON_READ_ATTEMPTS} ` +
        `attempts ("${lastReason}") — using ${path.basename(bak)} instead.`);
      // Deliberately NOT restoring the primary from the backup here. Today's
      // primary recovered on its own within the hour; overwriting it with a
      // possibly-older backup would destroy content we merely could not read
      // yet. The next legitimate write replaces it atomically anyway.
      return { ok: true, value: r.value, recovered: true };
    }
  } catch (e) { /* backup unusable too — fall through to the honest failure */ }

  console.error(`[launcher] ${label}: UNREADABLE after ${JSON_READ_ATTEMPTS} attempts ` +
    `("${lastReason}") and no usable backup. Reporting failure — NOT an empty result.`);
  return { ok: false, reason: lastReason };
}

/**
 * Write via temp file + rename, with the previous good content kept as .bak.
 *
 * A plain writeFileSync truncates and then writes, leaving a window in which
 * a reader sees a half-written file — and, more importantly here, leaving
 * the data in the page cache where an unclean shutdown turns it into the
 * zero-fill above. fsync before the rename forces it to the physical disk,
 * and rename-over is atomic on NTFS, so a reader gets either the whole old
 * file or the whole new one and never anything in between.
 */
function writeJsonAtomic(p, value) {
  const text = JSON.stringify(value, null, 2);
  // Preserve the outgoing content first — but only if it still parses.
  // Copying a corrupt primary over a good backup would throw away the one
  // clean copy left, which is the opposite of the point.
  try {
    if (readJsonOnce(p).ok) fs.copyFileSync(p, p + '.bak');
  } catch (e) { /* nothing worth preserving */ }

  const tmp = p + '.tmp';
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, text);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  // Rename-over can transiently fail on Windows with EPERM/EBUSY when
  // something else momentarily holds the target open — a virus scanner
  // reading the file it just saw change is the obvious candidate on this
  // machine, and is the same class of interference as the failed reads
  // above. Retry briefly; the window is short. Without this the write is
  // silently dropped and a .tmp file is left behind for good.
  let renamed = false;
  let lastErr = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      fs.renameSync(tmp, p);
      renamed = true;
      break;
    } catch (e) {
      lastErr = e;
      if (attempt < 5) sleepSync(attempt * 30);
    }
  }
  if (!renamed) {
    try { fs.unlinkSync(tmp); } catch (e) { /* leave it; the next write reuses it */ }
    throw lastErr || new Error('could not replace ' + p);
  }
}

module.exports = {
  JSON_READ_ATTEMPTS,
  readJsonOnce,
  readJsonResilient,
  writeJsonAtomic,
};
