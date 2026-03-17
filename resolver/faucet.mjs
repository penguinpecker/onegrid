/**
 * Request testnet OCT from OneChain faucet
 * 
 * Usage: node faucet.mjs <address>
 *        node faucet.mjs  (uses ADMIN_SECRET_KEY to derive address)
 */

import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { fromBase64 } from '@onelabs/sui/utils';

const FAUCET_URL = 'https://faucet-testnet.onelabs.cc:443/gas';

let address = process.argv[2];

if (!address && process.env.ADMIN_SECRET_KEY) {
  const keypair = Ed25519Keypair.fromSecretKey(fromBase64(process.env.ADMIN_SECRET_KEY));
  address = keypair.getPublicKey().toSuiAddress();
}

if (!address) {
  console.error('Usage: node faucet.mjs <address>');
  console.error('   or: ADMIN_SECRET_KEY=... node faucet.mjs');
  process.exit(1);
}

console.log(`[FAUCET] Requesting OCT for ${address}...`);

try {
  const res = await fetch(FAUCET_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      FixedAmountRequest: { recipient: address },
    }),
  });

  const data = await res.json();

  if (data.error) {
    console.error(`[FAUCET] ❌ Error: ${data.error}`);
  } else if (data.transferredGasObjects) {
    const total = data.transferredGasObjects.reduce((sum, o) => sum + o.amount, 0);
    console.log(`[FAUCET] ✅ Received ${total / 1_000_000_000} OCT`);
    console.log(`[FAUCET] Tx: ${data.transferredGasObjects[0]?.transferTxDigest}`);
  } else {
    console.log(`[FAUCET] Response:`, JSON.stringify(data));
  }
} catch (e) {
  console.error(`[FAUCET] ❌ Failed: ${e.message}`);
}
