# OneGrid — 5×5 On-Chain Grid Game on OneChain

**Claim cells. Win the pot. 60-second rounds.**

OneGrid is a fully on-chain grid game built on OneChain's Move-based Layer 1 infrastructure. Players pay OCT to claim cells on a 5×5 grid. When the 60-second round ends, a random occupied cell is selected — all players on the winning cell split the prize pool.

🌐 **Live Demo**: [onegrid.vercel.app](https://onegrid.vercel.app)  
🔍 **Explorer**: [onescan.cc/testnet](https://onescan.cc/testnet)  
📦 **Network**: OneChain OCT Testnet

---

## How It Works

1. **Pick a cell** — Choose any cell on the 5×5 grid
2. **Pay entry** — 0.1 OCT per cell (one cell per player per round)
3. **Wait** — Round lasts 60 seconds
4. **Win** — Random occupied cell wins. All players on it split the pot (minus 5% protocol fee)
5. **Repeat** — New round starts immediately

No wallet extension needed — burner wallets are generated in-browser and auto-funded from the testnet faucet.

---

## Architecture

```
┌─────────────────────────────────────────┐
│           Frontend (Next.js)            │
│  - Burner wallet (Ed25519 in localStorage)
│  - @onelabs/sui SDK for tx signing      │
│  - Real-time grid state polling         │
│  - OneChain brand theme                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      OneChain Testnet (Move/Sui)        │
│  - game.move (shared Grid object)       │
│  - 25 cells, 60s rounds, auto-payout    │
│  - AdminCap for resolver authorization  │
│  - Events: CellPicked, RoundResolved    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│        Resolver Bot (Node.js)           │
│  - Polls RPC every 3s                   │
│  - Resolves rounds when timer expires   │
│  - Skips empty rounds                   │
│  - Starts new rounds automatically      │
│  - Deployed on Railway                  │
└─────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Smart Contract | Move (Sui-compatible) |
| Blockchain | OneChain OCT Testnet |
| Frontend | Next.js + React + Tailwind |
| Wallet | Ed25519 burner (in-browser) |
| SDK | @onelabs/sui, @onelabs/dapp-kit |
| Resolver | Node.js + @onelabs/sui |
| Hosting | Vercel (frontend) + Railway (resolver) |

---

## Project Structure

```
onegrid/
├── contracts/
│   ├── sources/
│   │   └── game.move          # Main game contract
│   └── Move.toml              # Move package config
├── frontend/
│   └── app.jsx                # React frontend
├── resolver/
│   ├── resolver.mjs           # Resolver bot
│   ├── keygen.mjs             # Keypair generator
│   ├── faucet.mjs             # Testnet faucet helper
│   ├── .env.example           # Config template
│   └── package.json
└── README.md
```

---

## Quick Start

### 1. Generate Admin Keypair

```bash
cd resolver
npm install
node keygen.mjs
```

### 2. Fund Admin Address

```bash
node faucet.mjs <YOUR_ADDRESS>
```

### 3. Build & Deploy Contract

```bash
cd contracts
one move build
one client publish --gas-budget 100000000
```

Save the Package ID, Grid Object ID, and AdminCap Object ID from the output.

### 4. Configure & Start Resolver

```bash
cd resolver
cp .env.example .env
# Edit .env with your contract addresses and admin key
node resolver.mjs
```

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Contract Details

### Deployed Contract

- **Network**: OneChain OCT Testnet
- **Native Token**: OCT
- **RPC**: `https://rpc-testnet.onelabs.cc:443`
- **Explorer**: `https://onescan.cc/testnet`

### Game Parameters

| Parameter | Value |
|-----------|-------|
| Grid Size | 5×5 (25 cells) |
| Round Duration | 60 seconds |
| Entry Fee | 0.1 OCT |
| Protocol Fee | 5% |
| Max Players Per Cell | Unlimited |
| Players Per Round | 1 cell per player |

### Key Functions

```move
// Player: claim a cell
public entry fun pick_cell(grid, cell, payment, clock, ctx)

// Resolver: end round, pick winner, auto-pay
public entry fun resolve_round(grid, clock, admin_cap, ctx)

// Resolver: skip round with 0 players
public entry fun skip_empty_round(grid, clock, admin_cap)

// Resolver: clear data between rounds
public entry fun clear_round_data(grid, admin_cap)

// Resolver: start new round
public entry fun start_round(grid, clock, admin_cap)
```

### Events

| Event | Description |
|-------|-------------|
| `RoundStarted` | New round begins with start/end timestamps |
| `CellPicked` | Player claims a cell |
| `RoundResolved` | Round ends, winning cell + payout info |
| `WinningsPaid` | Individual winner payout |
| `EmptyRoundSkipped` | Empty round skipped by resolver |

---

## OneChain Ecosystem Integration

- **Native OCT token** for entry fees and payouts
- **Move smart contracts** deployed on OneChain testnet
- **@onelabs/sui SDK** for all blockchain interactions
- **onescan.cc** explorer for transaction verification
- **OneChain faucet** for testnet funding
- Brand colors from official OneChain media kit

---

## License

MIT

---

**Built for OneHack 3.0 — AI & GameFi Edition**
