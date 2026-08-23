# Dastic

A desktop miner for [Acki Nacki](https://ackinacki.com) NACKL, built on the
Bee Engine SDK. Runs several wallets at once, keeps mining while minimised, and
reports what actually landed on chain rather than what it hoped would land.

> **Not affiliated with Acki Nacki.** Independent open-source project.

---

## What it does

- **Multi-wallet.** Each wallet gets its own window; the tray shows every wallet
  green (mining) or red (idle) at a glance.
- **Mines in the background.** Chromium timer throttling is disabled for the
  mining context and app suspension is blocked while a session is live — the
  display is still allowed to sleep, so the machine stays cool.
- **Honest accounting.** Taps are only counted once the chain confirms them
  (`session_accepted`), and the tap ledger is reconciled against the account's
  on-chain `tap_sum`. A submission that fails is reported as failed.
- **Real earnings, not estimates.** Mining payouts are read from your wallet's
  actual transaction history, grouped by date, and scoped to the current 24h
  epoch — not inferred from balance changes.
- **Locked balance.** Mined NACKL accrues to your wallet's *locked* balance, so
  that is the headline figure, with the spendable balance shown beneath it.

## Languages

English, Русский, 中文 and Español. Pick one from the selector in the launcher
header or in a miner window's Settings; the choice applies everywhere and
persists. Console and diagnostic logs stay in English on purpose — they are the
main tool for diagnosing a problem remotely, and a log the maintainer cannot
read is worse than no log.

Adding a language means one new block in `i18n.js`; anything left untranslated
falls back to English rather than showing a raw key.

## Requirements

- Windows (the build target; the code itself is not Windows-specific)
- An Acki Nacki wallet with a registered miner

## Install

Download `Dastic Setup <version>.exe` from
[Releases](../../releases) and run it.

## Run from source

```bash
npm install
npm start
```

Windows users can also double-click `Start-Dastic.bat`.

To build the installer:

```bash
npm run build
```

The output lands in `dist/`.

## Configuration

Everything has a working default; override via a `.env` file
(see `.env.example`) or real environment variables.

| Variable | Default | Purpose |
|---|---|---|
| `BEE_APP_ID` | — | Your app id on the Miner contract |
| `BEE_MAINNET_ENDPOINT` | `https://mainnet.ackinacki.org` | Comma-separated GraphQL endpoints |
| `BEE_TESTNET_ENDPOINT` | `https://shellnet.ackinacki.org` | Testnet endpoints |
| `BEE_API_URL` | `https://app-backend.ackinacki.org/api` | bee-infra backend the SDK's `Wallet` needs |

## Pairing

Add a wallet in the launcher, then enter your Acki Nacki wallet name. The app
generates a mining key, waits for the contract to confirm it as the registered
owner for its app id, and starts mining. The key is stored locally and never
leaves your machine.

If the contract later refuses submissions with `exit_code 402`
(`ERR_NOT_OWNER`) several times in a row, the pairing has been replaced —
re-pair from the reconnect screen.

## How mining works here

The Bee Engine worker computes taps for a set duration, submits a session root,
waits for the chain's `SessionInterval` event addressed to that worker, submits
the proof, and then receives `session_accepted` or `session_rejected`. Dastic
chains these bursts to fill the per-session tap allowance and aligns them to the
global tap window.

Two failure modes are worth knowing about, because both are normal on a busy
mainnet and neither means anything is wrong with your wallet:

- **`QUEUE_OVERFLOW` / "Message queue is full"** — the node shed the message
  under load. Retryable; the burst chain moves on.
- **A failed root submission corrupts the Miner instance.** The SDK reports
  `miner_state_corrupted` and permanently consumes a seed; since `can_start()`
  is false whenever the seed queue is empty, ignoring this eventually wedges
  mining for good. Dastic reads that flag and rebuilds the Miner from live
  contract state.

## Rewards

Mining rewards go to the miner account's owner. The app id is an authorisation
key only — it does not route any share of anyone's rewards to whoever built the
app. Running this software earns *you* nothing from other people's mining.

## Privacy

Mining keys, wallet names and session data stay in the app's local storage. The
app talks to the Acki Nacki GraphQL endpoint and the bee-infra backend, and
nowhere else. There is no telemetry.

## Licence

MIT — see [LICENSE](LICENSE).
