import http from "http";
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => { res.writeHead(200); res.end("ok"); }).listen(PORT);

/**
 * OneGrid Resolver Bot
 * 
 * Polls OneChain testnet RPC every 3s, resolves ended rounds,
 * skips empty rounds, and starts new ones.
 * 
 * Usage:
 *   ADMIN_SECRET_KEY=<base64_ed25519_keypair> node resolver.mjs
 * 
 * Required env vars:
 *   ADMIN_SECRET_KEY  - Base64 encoded Ed25519 keypair (deployer's key)
 *   PACKAGE_ID        - Deployed OneGrid package address
 *   GRID_OBJECT_ID    - Shared Grid object ID
 *   ADMIN_CAP_ID      - AdminCap object ID
 */

import { SuiClient } from '@onelabs/sui/client';
import { Transaction } from '@onelabs/sui/transactions';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { fromBase64 } from '@onelabs/sui/utils';

// ═══════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════

const RPC_URL = process.env.RPC_URL || 'https://rpc-testnet.onelabs.cc:443';
const POLL_INTERVAL_MS = 3000; // 3 seconds
const CLOCK_OBJECT = '0x6'; // Sui system Clock object (same on all Sui forks)

const PACKAGE_ID = process.env.PACKAGE_ID || '0xTODO';
const GRID_OBJECT_ID = process.env.GRID_OBJECT_ID || '0xTODO';
const ADMIN_CAP_ID = process.env.ADMIN_CAP_ID || '0xTODO';
const GRID_PACKAGE_ID = process.env.GRID_PACKAGE_ID || '';
const GRID_TREASURY_CAP_ID = process.env.GRID_TREASURY_CAP_ID || '';
const GRID_REWARD_AMOUNT = 10_000_000_000;
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || '';

// ═══════════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════════

const client = new SuiClient({ url: RPC_URL });

let keypair;
try {
  const raw = fromBase64(ADMIN_SECRET_KEY);
  
  const secretKey = raw.length === 33 ? raw.slice(1) : raw;
  keypair = Ed25519Keypair.fromSecretKey(secretKey);
  console.log(`[INIT] Admin address: ${keypair.getPublicKey().toSuiAddress()}`);
} catch (e) {
  console.error('[INIT] Invalid ADMIN_SECRET_KEY. Set it as base64 Ed25519 keypair.');
  console.error('       Generate one with: npx tsx scripts/keygen.ts');
  process.exit(1);
}

const MODULE = `${PACKAGE_ID}::game`;

// ═══════════════════════════════════════════════════════════════
// Grid State Reader
// ═══════════════════════════════════════════════════════════════

async function getGridState() {
  try {
  const raw = fromBase64(ADMIN_SECRET_KEY);
    const obj = await client.getObject({
      id: GRID_OBJECT_ID,
      options: { showContent: true },
    });

    const fields = obj.data?.content?.fields;
    if (!fields) throw new Error('Could not read Grid object fields');

    return {
      currentRoundId: Number(fields.current_round_id),
      roundStartMs: Number(fields.round_start_ms),
      roundEndMs: Number(fields.round_end_ms),
      roundResolved: fields.round_resolved,
      totalPlayers: Number(fields.total_players),
      poolValue: Number(fields.pool), // MIST
      totalRounds: Number(fields.total_rounds),
    };
  } catch (e) {
    console.error(`[READ] Failed to read grid state: ${e.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Transaction Executors
// ═══════════════════════════════════════════════════════════════

async function executeTransaction(txb, label) {
  try {
  const raw = fromBase64(ADMIN_SECRET_KEY);
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    const status = result.effects?.status?.status;
    const digest = result.digest;

    if (status === 'success') {
      console.log(`[TX] ✅ ${label} — digest: ${digest}`);

      // Log events
      if (result.events?.length > 0) {
        for (const event of result.events) {
          const type = event.type.split('::').pop();
          console.log(`[EVENT] ${type}:`, JSON.stringify(event.parsedJson));
        }
      }

      return { success: true, digest, events: result.events || [] };
    } else {
      const error = result.effects?.status?.error || 'unknown error';
      console.error(`[TX] ❌ ${label} failed: ${error}`);
      return { success: false, error };
    }
  } catch (e) {
    console.error(`[TX] ❌ ${label} exception: ${e.message}`);
    return { success: false, error: e.message };
  }
}

async function resolveRound() {
  const txb = new Transaction();
  txb.moveCall({
    target: `${MODULE}::resolve_round`,
    arguments: [
      txb.object(GRID_OBJECT_ID),
      txb.object(CLOCK_OBJECT),
      txb.object(ADMIN_CAP_ID),
    ],
  });
  txb.setGasBudget(50_000_000); // 0.05 OCT
  return executeTransaction(txb, 'resolve_round');
}

async function skipEmptyRound() {
  const txb = new Transaction();
  txb.moveCall({
    target: `${MODULE}::skip_empty_round`,
    arguments: [
      txb.object(GRID_OBJECT_ID),
      txb.object(CLOCK_OBJECT),
      txb.object(ADMIN_CAP_ID),
    ],
  });
  txb.setGasBudget(10_000_000);
  return executeTransaction(txb, 'skip_empty_round');
}

async function clearRoundData() {
  const txb = new Transaction();
  txb.moveCall({
    target: `${MODULE}::clear_round_data`,
    arguments: [
      txb.object(GRID_OBJECT_ID),
      txb.object(ADMIN_CAP_ID),
    ],
  });
  txb.setGasBudget(50_000_000);
  return executeTransaction(txb, 'clear_round_data');
}

async function startRound() {
  const txb = new Transaction();
  txb.moveCall({
    target: `${MODULE}::start_round`,
    arguments: [
      txb.object(GRID_OBJECT_ID),
      txb.object(CLOCK_OBJECT),
      txb.object(ADMIN_CAP_ID),
    ],
  });
  txb.setGasBudget(50_000_000);
  return executeTransaction(txb, 'start_round');
}

async function mintGridReward(winnerAddress, roundId) {
  if (!GRID_PACKAGE_ID || !GRID_TREASURY_CAP_ID) {
    console.log('[GRID] Skipping mint — GRID config not set');
    return;
  }
  try {
    const txb = new Transaction();
    txb.moveCall({
      target: `${GRID_PACKAGE_ID}::grid_token::mint_reward`,
      arguments: [
        txb.object(GRID_TREASURY_CAP_ID),
        txb.pure.u64(GRID_REWARD_AMOUNT),
        txb.pure.address(winnerAddress),
        txb.pure.u64(roundId),
      ],
    });
    txb.setGasBudget(10_000_000);
    const result = await executeTransaction(txb, 'mint_grid_reward');
    if (result.success) {
      console.log(`[GRID] ✅ Minted 10 GRID to ${winnerAddress.slice(0, 10)}... for round #${roundId}`);
    }
  } catch (e) {
    console.error(`[GRID] ❌ Mint failed: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// Main Loop
// ═══════════════════════════════════════════════════════════════

let lastRoundId = 0;
let isProcessing = false;

async function tick() {
  if (isProcessing) return;
  isProcessing = true;

  try {
  const raw = fromBase64(ADMIN_SECRET_KEY);
    const state = await getGridState();
    if (!state) {
      isProcessing = false;
      return;
    }

    const now = Date.now();
    const { currentRoundId, roundEndMs, roundResolved, totalPlayers } = state;

    // Log state periodically
    if (currentRoundId !== lastRoundId) {
      console.log(`\n[ROUND] ══════════════════════════════════════`);
      console.log(`[ROUND] Round #${currentRoundId}`);
      console.log(`[ROUND] Players: ${totalPlayers}`);
      console.log(`[ROUND] Pool: ${(state.poolValue / 1_000_000_000).toFixed(2)} OCT`);
      console.log(`[ROUND] Ends: ${new Date(roundEndMs).toISOString()}`);
      console.log(`[ROUND] Resolved: ${roundResolved}`);
      console.log(`[ROUND] ══════════════════════════════════════\n`);
      lastRoundId = currentRoundId;
    }

    // Round is resolved — need to clear + start new round
    if (roundResolved && currentRoundId > 0) {
      console.log(`[BOT] Round #${currentRoundId} already resolved, starting new round...`);
      
      // Clear player data from previous round
      const clearResult = await clearRoundData();
      if (!clearResult.success) {
        console.error('[BOT] Failed to clear round data, will retry...');
        isProcessing = false;
        return;
      }

      // Start new round
      const startResult = await startRound();
      if (!startResult.success) {
        console.error('[BOT] Failed to start new round, will retry...');
      }

      isProcessing = false;
      return;
    }

    // Round hasn't ended yet
    if (now < roundEndMs) {
      const remaining = Math.ceil((roundEndMs - now) / 1000);
      if (remaining % 15 === 0 || remaining <= 5) {
        console.log(`[BOT] Round #${currentRoundId} — ${remaining}s left — ${totalPlayers} players — ${(state.poolValue / 1_000_000_000).toFixed(2)} OCT`);
      }
      isProcessing = false;
      return;
    }

    // Round ended, needs resolution
    if (!roundResolved && now >= roundEndMs) {
      if (totalPlayers === 0) {
        console.log(`[BOT] Round #${currentRoundId} ended with 0 players — skipping...`);
        await skipEmptyRound();
      } else {
        console.log(`[BOT] Round #${currentRoundId} ended with ${totalPlayers} players — resolving...`);
        const resolveResult = await resolveRound();
        // Mint GRID tokens to winners
        if (resolveResult.success && resolveResult.events) {
          for (const ev of resolveResult.events) {
            if (ev.type.includes('WinningsPaid')) {
              const winner = ev.parsedJson?.player;
              if (winner) {
                await mintGridReward(winner, currentRoundId);
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.error(`[BOT] Tick error: ${e.message}`);
  }

  isProcessing = false;
}

// ═══════════════════════════════════════════════════════════════
// Boot
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('  ╔═══════════════════════════════════════╗');
  console.log('  ║     OneGrid Resolver Bot v1.0          ║');
  console.log('  ║     OneChain Testnet                   ║');
  console.log('  ╚═══════════════════════════════════════╝');
  console.log('');
  console.log(`  RPC:      ${RPC_URL}`);
  console.log(`  Package:  ${PACKAGE_ID}`);
  console.log(`  Grid:     ${GRID_OBJECT_ID}`);
  console.log(`  AdminCap: ${ADMIN_CAP_ID}`);
  console.log(`  Poll:     ${POLL_INTERVAL_MS}ms`);
  console.log(`  GRID:     ${GRID_PACKAGE_ID ? 'Enabled (10 GRID/win)' : 'Disabled'}`);
  console.log('');

  // Verify RPC connection
  try {
  const raw = fromBase64(ADMIN_SECRET_KEY);
    const checkpoint = await client.getLatestCheckpointSequenceNumber();
    console.log(`[INIT] ✅ Connected to OneChain — checkpoint #${checkpoint}`);
  } catch (e) {
    console.error(`[INIT] ❌ Cannot connect to RPC: ${e.message}`);
    process.exit(1);
  }

  // Verify admin balance
  try {
  const raw = fromBase64(ADMIN_SECRET_KEY);
    const address = keypair.getPublicKey().toSuiAddress();
    const balance = await client.getBalance({ owner: address });
    const oct = Number(balance.totalBalance) / 1_000_000_000;
    console.log(`[INIT] ✅ Admin balance: ${oct.toFixed(4)} OCT`);
    if (oct < 0.1) {
      console.warn('[INIT] ⚠️  Low balance — resolver needs OCT for gas. Hit the faucet.');
    }
  } catch (e) {
    console.error(`[INIT] Cannot check balance: ${e.message}`);
  }

  // Check if we need to bootstrap the first round
  const state = await getGridState();
  if (state && state.currentRoundId === 0) {
    console.log('[INIT] No rounds yet — starting first round...');
    await startRound();
  }

  // Start polling
  console.log(`[INIT] Starting poll loop (every ${POLL_INTERVAL_MS / 1000}s)...\n`);
  setInterval(tick, POLL_INTERVAL_MS);

  // Run first tick immediately
  tick();
}

main().catch((e) => {
  console.error(`[FATAL] ${e.message}`);
  process.exit(1);
});
