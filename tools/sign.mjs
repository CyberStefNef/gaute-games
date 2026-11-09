// Signs dist/catalogue.json with the Ed25519 key in CATALOGUE_SIGNING_KEY (PKCS#8
// PEM, a GitHub Actions secret). Gaute only imports a catalogue whose signature
// verifies against its built-in public key.
import { createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './games.mjs';

const pem = process.env.CATALOGUE_SIGNING_KEY;
if (!pem) throw Error('CATALOGUE_SIGNING_KEY is not set.');
const key = createPrivateKey(pem);
const file = path.join(ROOT, 'dist/catalogue.json');
const signature = sign(null, readFileSync(file), key).toString('base64');
writeFileSync(file + '.sig', signature + '\n');
const publicKey = createPublicKey(key).export({ type: 'spki', format: 'der' }).toString('base64');
console.log(`Signed catalogue.json (public key ${publicKey}).`);
