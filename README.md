<p align="center">
  <img src="https://img.shields.io/badge/OneChain-Testnet-467DFF?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzQ2N0RGRiIvPjwvc3ZnPg==" alt="OneChain" />
  <img src="https://img.shields.io/badge/Move-Smart_Contracts-BFC1FF?style=for-the-badge" alt="Move" />
  <img src="https://img.shields.io/badge/GameFi-On--Chain-2BDEAC?style=for-the-badge" alt="GameFi" />
  <img src="https://img.shields.io/badge/$GRID-Reward_Token-FE587B?style=for-the-badge" alt="GRID Token" />
</p>

# OneGrid — 5×5 On-Chain Grid Game on OneChain

**Claim cells. Win the pot. Earn $GRID. 60-second rounds.**

OneGrid is a fully on-chain GameFi protocol built on [OneChain](https://onelabs.cc)'s Move-based Layer 1. Players pay OCT to claim cells on a 5×5 grid. When the 60-second round ends, a pseudorandom winning cell is selected — all players on that cell split the prize pool and receive $GRID reward tokens.

🌐 **Live**: [onegrid-zeta.vercel.app](https://onegrid-zeta.vercel.app)
🔍 **Explorer**: [onescan.cc/testnet](https://onescan.cc/testnet)
📦 **Network**: OneChain OCT Testnet
🎮 **Hackathon**: OneHack 3.0 — AI & GameFi Edition

---

## Demo

https://github.com/user-attachments/assets/PLACEHOLDER

> *60-second gameplay demo: connect OneWallet → claim cell → round resolves → OCT paid + GRID minted*

---

## How It Works

1. **Connect** — Click "Play Now" to connect [OneWallet](https://one-wallet.cc) via `@onelabs/dapp-kit`
2. **Pick a cell** — Choose any cell on the 5×5 grid (0.1 OCT entry fee)
3. **Wait** — Round lasts 60 seconds. Other players can claim cells too
4. **Win** — Resolver bot picks a random occupied cell using on-chain entropy (tx digest hash). All players on the winning cell split 95% of the pot
5. **Earn $GRID** — Winners automatically receive 10 $GRID reward tokens
6. **Repeat** — New round starts immediately via the autonomous resolver bot

---

## Deployed Contracts

### Game Contract (`onegrid::game`)

| | Address |
|---|---|
| **Package** | [`0x5046a468...125b7d3e`](https://onescan.cc/testnet/object/0x5046a46898293f47c591502e57c1132910e11775ac9eaf39c09b39e0125b7d3e) |
| **Grid (Shared Object)** | [`0xd6613555...2e6f897e`](https://onescan.cc/testnet/object/0xd66135557caab54c0ab9e656e61a62f78f33a608c51ef6e26f98b5482e6f897e) |
| **AdminCap** | `0x8c8113a7...499ec6de0` |

### $GRID Reward Token (`onegrid::grid_token`)

| | Address |
|---|---|
| **Package** | [`0x5f3877b2...0af55a87`](https://onescan.cc/testnet/object/0x5f3877b2aa2dcb7e63233b10bcbe0fcfe22e0325ac49da1f33ebd6810af55a87) |
| **Coin Type** | `0x5f3877b2...0af55a87::grid_token::GRID_TOKEN` |
| **TreasuryCap** | `0x29ed7317...c8a8e9eb` |
| **CoinMetadata** | `0xc2d6868f...23a13969` |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│                                                         │
│  • @onelabs/dapp-kit — OneWallet ConnectButton          │
│  • @onelabs/sui — transaction building & signing        │
│  • /api/rpc proxy — bypasses CORS on testnet RPC        │
│  • Real-time grid state polling (3s interval)           │
│  • Round history from on-chain events (localStorage)    │
│  • OneChain brand theme                                 │
│                    Vercel                                │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│               ONECHAIN TESTNET (Move L1)                │
│                                                         │
│  game.move                                              │
│  ├── Grid (shared object) — 25 cells, round state       │
│  ├── pick_cell() — player claims cell, pays 0.1 OCT     │
│  ├── resolve_round() — pseudo-random winner selection    │
│  ├── Auto-payout — 95% to winners, 5% protocol fee      │
│  └── Events: CellPicked, RoundResolved, WinningsPaid    │
│                                                         │
│  grid_token.move                                        │
│  ├── GRID_TOKEN — reward token (9 decimals)             │
│  └── mint_reward() — 10 GRID minted per win             │
│                                                         │
│  RPC: rpc-testnet.onelabs.cc:443                        │
│  Explorer: onescan.cc/testnet                           │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│               RESOLVER BOT (Node.js)                    │
│                                                         │
│  • Polls grid state every 3s via RPC                    │
│  • Resolves rounds when 60s timer expires               │
│  • Skips empty rounds (0 players)                       │
│  • Clears round data + starts new round automatically   │
│  • Mints 10 $GRID to each winner after resolution       │
│  • Health endpoint on PORT for Railway                  │
│                    Railway                               │
└─────────────────────────────────────────────────────────┘
```

---

## OneChain Native Integration

OneGrid deeply integrates with OneChain's ecosystem products and SDKs:

| Product | Integration |
|---|---|
| **OneWallet** | Browser extension wallet connection via `@onelabs/dapp-kit` `ConnectButton`. Players connect, sign transactions, and view $GRID tokens directly in OneWallet |
| **@onelabs/dapp-kit** | `SuiClientProvider`, `WalletProvider`, `useCurrentAccount`, `useSuiClient`, `useSignAndExecuteTransaction` — full React hook integration following OneChain's official `OneChainProviderWrapper` pattern |
| **@onelabs/sui** | `SuiClient` for RPC calls, `Transaction` for PTB construction, `Ed25519Keypair` for resolver bot signing |
| **OCT Token** | Native gas token used for entry fees (0.1 OCT), winner payouts (95% pot), and all transaction gas |
| **$GRID Token** | Custom `Coin<GRID_TOKEN>` created via `coin::create_currency` — 10 GRID minted to winners per round |
| **OneScan** | Transaction links to `onescan.cc/testnet` in the round history table |
| **Testnet Faucet** | Auto-funding for new players via `faucet-testnet.onelabs.cc` |

---

## Game Parameters

| Parameter | Value |
|---|---|
| Grid Size | 5×5 (25 cells) |
| Round Duration | 60 seconds |
| Entry Fee | 0.1 OCT |
| Protocol Fee | 5% (500 BPS) |
| Winner Selection | Pseudo-random via `tx_context::digest` hash |
| Max Players Per Cell | Unlimited |
| Cells Per Player Per Round | 1 |
| $GRID Reward Per Win | 10 GRID |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Move (OneChain / Sui-compatible) |
| Blockchain | OneChain OCT Testnet (L1, Move-based) |
| Frontend | Next.js 15 + React 19 |
| Wallet | OneWallet + @onelabs/dapp-kit |
| SDK | @onelabs/sui v1.26.2, @onelabs/dapp-kit v0.15.6 |
| State Queries | @tanstack/react-query v5 |
| Resolver Bot | Node.js 22 + @onelabs/sui |
| Frontend Hosting | Vercel |
| Bot Hosting | Railway (Docker) |

---

## Project Structure

```
onegrid/
├── contracts/
│   ├── sources/
│   │   └── game.move                 # Main game contract (Grid, rounds, payouts)
│   ├── grid_token/
│   │   ├── sources/
│   │   │   └── grid_token.move       # $GRID reward token (Coin<GRID_TOKEN>)
│   │   └── Move.toml
│   └── Move.toml
├── frontend/
│   ├── app/
│   │   ├── api/rpc/
│   │   │   └── route.js              # RPC proxy (CORS bypass)
│   │   ├── layout.js                 # Root layout + fonts
│   │   ├── page.js                   # Game UI + wallet + history
│   │   └── providers.js              # OneChain dapp-kit providers
│   ├── next.config.mjs
│   └── package.json
├── resolver/
│   ├── resolver.mjs                  # Autonomous resolver bot
│   ├── keygen.mjs                    # Ed25519 keypair generator
│   ├── faucet.mjs                    # Testnet faucet helper
│   ├── health.mjs                    # HTTP health check
│   ├── Dockerfile                    # Railway deployment
│   ├── .env.example                  # Config template
│   └── package.json
├── .gitignore
├── LICENSE
└── README.md
```

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [OneChain CLI](https://github.com/one-chain-labs/onechain/releases) (`one` binary)
- [OneWallet](https://one-wallet.cc) browser extension

### 1. Clone & Install

```bash
git clone https://github.com/penguinpecker/onegrid.git
cd onegrid
```

### 2. Deploy Contracts

```bash
# Generate admin keypair
cd resolver && npm install && node keygen.mjs

# Fund admin wallet
node faucet.mjs <YOUR_ADDRESS>

# Deploy game contract
cd ../contracts
one move build
one client publish --gas-budget 200000000

# Deploy GRID token
cd grid_token
one move build
one client publish --gas-budget 200000000
```

Save the Package IDs, Grid Object ID, AdminCap ID, and TreasuryCap ID from the outputs.

### 3. Start Resolver Bot

```bash
cd resolver
cp .env.example .env
# Edit .env with your contract addresses and admin key
node --env-file=.env resolver.mjs
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to play.

---

## Resolver Bot Configuration

```env
# Admin keypair (base64 Ed25519 from CLI keystore)
ADMIN_SECRET_KEY=

# Game contract
PACKAGE_ID=0x5046a46898293f47c591502e57c1132910e11775ac9eaf39c09b39e0125b7d3e
GRID_OBJECT_ID=0xd66135557caab54c0ab9e656e61a62f78f33a608c51ef6e26f98b5482e6f897e
ADMIN_CAP_ID=0x8c8113a7deb0c9c93492c9abf1f87defcefa6e8bf0fd83836b6eabe499ec6de0

# GRID token
GRID_PACKAGE_ID=0x5f3877b2aa2dcb7e63233b10bcbe0fcfe22e0325ac49da1f33ebd6810af55a87
GRID_TREASURY_CAP_ID=0x29ed7317ec0c29f8e4754a1d9a0bad53f6f88b28d84169615620a5e4c8a8e9eb

# RPC
RPC_URL=https://rpc-testnet.onelabs.cc:443
```

---

## Smart Contract Details

### game.move — Core Game Logic

**Key Functions:**

```move
public entry fun pick_cell(grid, cell_index, payment, clock, ctx)
public entry fun resolve_round(grid, clock, admin_cap, ctx)
public entry fun skip_empty_round(grid, clock, admin_cap)
public entry fun clear_round_data(grid, admin_cap)
public entry fun start_round(grid, clock, admin_cap)
```

**Winner Selection Algorithm:**

The winning cell is determined pseudo-randomly using the transaction digest as entropy:

```
seed = bytes_of(tx_context::digest(ctx))
hash = first 8 bytes of seed → u64
winning_index = hash % occupied_cell_count
winning_cell = occupied_cells[winning_index]
```

This is manipulation-resistant since the digest depends on the resolver's transaction which is separate from player actions.

**Events:**

| Event | Fields | Description |
|---|---|---|
| `RoundStarted` | round_id, start_ms, end_ms | New round begins |
| `CellPicked` | round_id, player, cell_index | Player claims cell |
| `RoundResolved` | round_id, winning_cell, winners_count, total_pot, payout_per_winner | Round ends |
| `WinningsPaid` | round_id, player, amount | Individual payout |
| `EmptyRoundSkipped` | round_id | No players, skip |

### grid_token.move — $GRID Reward Token

```move
public entry fun mint_reward(cap, amount, recipient, round_id, ctx)
```

10 GRID (10,000,000,000 MIST) minted to each winner after round resolution by the resolver bot.

---

## Deployment

### Frontend → Vercel

1. Import `penguinpecker/onegrid` on [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `frontend`
3. Deploy — auto-detects Next.js

### Resolver Bot → Railway

```bash
cd resolver
railway login
railway init
railway variables set ADMIN_SECRET_KEY="..."
railway variables set PACKAGE_ID="..."
railway variables set GRID_OBJECT_ID="..."
railway variables set ADMIN_CAP_ID="..."
railway variables set GRID_PACKAGE_ID="..."
railway variables set GRID_TREASURY_CAP_ID="..."
railway variables set RPC_URL="https://rpc-testnet.onelabs.cc:443"
railway up
```

---

## OneChain Resources

| Resource | URL |
|---|---|
| OneChain Website | [onelabs.cc](https://onelabs.cc) |
| Developer Docs | [docs.onelabs.cc](https://docs.onelabs.cc) |
| TypeScript SDK Docs | [doc-testnet.onelabs.cc](https://doc-testnet.onelabs.cc) |
| Testnet Explorer | [onescan.cc/testnet](https://onescan.cc/testnet) |
| Testnet RPC | `https://rpc-testnet.onelabs.cc:443` |
| Testnet Faucet | `https://faucet-testnet.onelabs.cc:443/gas` |
| OneWallet | [one-wallet.cc](https://one-wallet.cc) |
| GitHub | [github.com/one-chain-labs](https://github.com/one-chain-labs) |
| Telegram | [t.me/hello_onechain](https://t.me/hello_onechain) |

---

## Roadmap

### Phase 1 — Hackathon MVP ✅
- [x] Move game contract with 5×5 grid, 60s rounds, auto-payout
- [x] $GRID reward token minted to winners
- [x] OneWallet integration via @onelabs/dapp-kit
- [x] Autonomous resolver bot (Railway)
- [x] Live frontend with round history (Vercel)
- [x] RPC proxy for CORS

### Phase 2 — Post-Hackathon
- [ ] Mainnet deployment
- [ ] Variable grid sizes (3×3, 7×7, 10×10)
- [ ] Configurable entry fees and round durations
- [ ] $GRID staking for boosted rewards
- [ ] Leaderboard with player stats
- [ ] OneDEX liquidity pool for $GRID
- [ ] Mobile-optimized UI

### Phase 3 — Ecosystem
- [ ] Tournament mode with larger prize pools
- [ ] Multi-round campaigns with cumulative $GRID rewards
- [ ] DAO governance via $GRID token holders
- [ ] Integration with OneRWA for real-world prize pools
- [ ] Cross-chain play via OneTransfer

---

## Security

- **Admin-only resolution**: Only the holder of `AdminCap` can resolve rounds and mint $GRID. The admin keypair is stored securely as an environment variable on Railway, never committed to git
- **Pseudo-random fairness**: Winner selection uses the transaction digest as entropy, which is determined at execution time and cannot be predicted or manipulated by players
- **No reentrancy**: Move's ownership model prevents reentrancy by design
- **One cell per player**: Contract enforces one cell per address per round
- **Immutable metadata**: $GRID CoinMetadata is frozen on deploy
- **No private keys in repo**: `.gitignore` excludes `.env`, keystore files, and CLI config

---

## Contributing

Contributions welcome. Please open an issue or pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/awesome`)
3. Commit changes (`git commit -m 'Add awesome feature'`)
4. Push to branch (`git push origin feature/awesome`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 penguinpecker

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Acknowledgments

- [OneChain](https://onelabs.cc) — Layer 1 blockchain infrastructure
- [OneHack 3.0](https://dorahacks.io/hackathon/onehackathon) — AI & GameFi hackathon
- [Sui / MystenLabs](https://sui.io) — Move language and object model
- [DoraHacks](https://dorahacks.io) — Hackathon platform

---

<p align="center">
  <b>Built for <a href="https://dorahacks.io/hackathon/onehackathon">OneHack 3.0 — AI & GameFi Edition</a></b><br/>
  <sub>by <a href="https://github.com/penguinpecker">@penguinpecker</a></sub>
</p>
