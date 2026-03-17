/**
 * Generate a new Ed25519 keypair for OneGrid admin/resolver
 * 
 * Usage: node keygen.mjs
 * 
 * Outputs:
 *   - Address (for faucet funding)
 *   - Secret key (base64, for ADMIN_SECRET_KEY env var)
 */

import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { toBase64 } from '@onelabs/sui/utils';

const keypair = new Ed25519Keypair();
const address = keypair.getPublicKey().toSuiAddress();
const secretKey = keypair.getSecretKey();

console.log('');
console.log('  ╔═══════════════════════════════════════╗');
console.log('  ║     OneGrid Keypair Generator          ║');
console.log('  ╚═══════════════════════════════════════╝');
console.log('');
console.log(`  Address:    ${address}`);
console.log(`  Secret Key: ${toBase64(secretKey)}`);
console.log('');
console.log('  Next steps:');
console.log('  1. Fund this address: node faucet.mjs ' + address);
console.log('  2. Set env var:       export ADMIN_SECRET_KEY="' + toBase64(secretKey) + '"');
console.log('  3. Deploy contract:   one move build && one client publish');
console.log('');
console.log('  ⚠️  SAVE THE SECRET KEY — it cannot be recovered!');
console.log('');
