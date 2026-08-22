# Dastic

A desktop miner for **NACKL** on the [Acki Nacki](https://ackinacki.com) network,
built on the official [Bee Engine SDK](https://www.npmjs.com/package/@teamgosh/bee-sdk).
Pair an Acki Nacki wallet, and Dastic mines it — in the background, across
multiple wallets, with the chain itself as the source of truth for every number
it shows.

> Not affiliated with or endorsed by Acki Nacki. Mining rewards are paid by the
> Acki Nacki Miner contract directly to your own wallet; this app never takes a
> cut and has no fee hook of any kind.

## What it does

- **Mines while minimised.** Chromium's background throttling is disabled for the
  mining window and a power-save blocker keeps the process alive — while still
  letting your display sleep, so the machine stays cool.
- **Multiple wallets at once.** Each wallet gets its own window; the tray lists
  every one with a green/red mining indicator.
- **Real balances, not estimates.** Mined NACKL is **locked**, and locked NACKL
  does not appear in a wallet's spendable balance. Dastic shows the locked figure
  as the headline number, with spendable underneath.
- **Real per-round earnings.** Payouts are read from your wallet's actual
  transaction ledger (`tx_type: "Mining"`), grouped by date — not inferred from
  balance changes.
- **Everything is epoch-scoped.** Taps and payouts reset when the chain's own 24h
  epoch rolls over, keyed on the contract's epoch-start block rather than a local
  clock, so it stays correct across restarts.

## Requirements

- Windows (the release ships an NSIS installer; the source runs anywhere Electron does)
- An [Acki Nacki wallet](https://ackinacki.com) with a registered wallet name
- Node.js 18+ **only if running from source**

## Install

Download the latest `Dastic Setup x.y.z.exe` from
[Releases](../../releases) and run it.

### From source

```bash
git clone <this-repo>
cd dastic
npm install
npm start
```

### Build the installer

```bash
npm run build      # -> dist/Dastic Setup x.y.z.exe
```

## First run

1. Open Dastic. The wallet list starts empty.
2. **+ Add Wallet** — the name here is just a local label.
3. Launch it, enter your **Acki Nacki wallet name**, and confirm the pairing in
   your wallet app. Dastic generates a mining key and waits for the contract to
   register it as the owner for this app id.
4. Mining starts on its own and continues each tap window.

Pairing is stored locally. If the chain later refuses your key
(`exit_code 402 / ERR_NOT_OWNER`) — which happens if the wallet is re-paired from
another device — Dastic tells you to reconnect rather than mining into a wall.

## Configuration

Copy `.env.example` to `.env`:

| Variable | Default | Purpose |
|---|---|---|
| `BEE_APP_ID` | — | Your app id on the Miner contract. **Required.** |
| `BEE_MAINNET_ENDPOINT` | `https://mainnet.ackinacki.org` | Comma-separated GraphQL endpoints |
| `BEE_API_URL` | `https://app-backend.ackinacki.org/api` | bee-infra backend (wallet balance/history) |

`.env` is gitignored. Mining keys live in Electron's `userData` directory, never
in the repo.

## How mining actually works here

A tap window is ~332 s (1000 blocks). Each session is allowed **70 taps**, which
Dastic delivers as one or more submissions, spacing taps across the window so the
work fits.

The SDK's own submission path is:

```
compute (duration_ms)
  -> wait for no other worker submitting
  -> submit_session_root
  -> wait for the chain's SessionInterval event for THIS worker id
  -> submit_session_proof
  -> session_accepted / session_rejected
```

Two failure modes matter, and Dastic handles both explicitly:

- **`QUEUE_OVERFLOW` ("Message queue is full")** — mainnet shedding load. The
  message never reaches the contract. Retryable, and common.
- **`miner_state_corrupted`** — when a root submission fails, the SDK marks its
  own instance unusable and permanently consumes a seed. Since `can_start()` is
  `!active_worker && !seeds.is_empty()`, a couple of these drain the seed queue
  and wedge mining *forever*. Dastic reads that flag and rebuilds the Miner from
  live contract state, which is the only real recovery — `stop()` does not touch
  seeds.

## Known limits

- Mining runs in a single shared bridge process, so wallets **time-share one CPU
  core**. Adding wallets cannot overheat the machine, but each gets roughly `1/N`
  of the tap throughput.
- Because of that, a crash in the bridge affects every wallet at once.
- Rewards depend on ecosystem activation on the Acki Nacki side; a brand-new
  wallet that has never interacted with an ecosystem app may not accrue.

## Licence

MIT — see [LICENSE](LICENSE).
