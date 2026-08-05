const { initAuthCreds, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const crypto = require('crypto');
const fs = require('fs');

function sha256(buf) {
  if (!buf) return 'NONE';
  return crypto.createHash('sha256').update(Buffer.from(buf)).digest('hex');
}

function dumpField(name, val) {
  console.log(`--- FIELD: ${name} ---`);
  if (val === undefined || val === null) {
    console.log(`  Value: null/undefined`);
    return;
  }
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'string') {
    console.log(`  Primitive Value: ${val}`);
    return;
  }
  const buf = Buffer.isBuffer(val) ? val : (val instanceof Uint8Array ? Buffer.from(val) : null);
  if (buf) {
    console.log(`  Length: ${buf.length}`);
    console.log(`  SHA256: ${sha256(buf)}`);
    console.log(`  First 16 Bytes (Hex): ${buf.subarray(0, 16).toString('hex')}`);
    console.log(`  Last 16 Bytes (Hex):  ${buf.subarray(-16).toString('hex')}`);
    console.log(`  Buffer.isBuffer: ${Buffer.isBuffer(val)}, Constructor: ${val?.constructor?.name}`);
  } else if (typeof val === 'object') {
    console.log(`  Object Keys: [${Object.keys(val).join(', ')}]`);
    for (const [k, v] of Object.entries(val)) {
      dumpField(`${name}.${k}`, v);
    }
  }
}

async function runAuthCredsAudit() {
  console.log('================================================================');
  console.log('=== AUTHENTICATION STATE CREDS DUMP (STANDALONE VS PRODUCTION) ===');
  console.log('================================================================\n');

  console.log('>>> [STANDALONE] Initializing fresh useMultiFileAuthState creds...');
  const tempAuthDir = './temp_standalone_auth_audit';
  if (fs.existsSync(tempAuthDir)) fs.rmSync(tempAuthDir, { recursive: true, force: true });
  const { state: standaloneState } = await useMultiFileAuthState(tempAuthDir);
  const standaloneCreds = standaloneState.creds;

  console.log('>>> [PRODUCTION/INITIAL] Generating initAuthCreds()...');
  const freshCreds = initAuthCreds();

  const targetFields = [
    'noiseKey.public',
    'noiseKey.private',
    'signedIdentityKey.public',
    'signedIdentityKey.private',
    'signedPreKey',
    'registrationId',
    'advSecretKey',
    'account',
    'accountSignatureKey',
    'me',
    'signalIdentities',
    'nextPreKeyId',
    'firstUnuploadedPreKeyId',
    'lastAccountSyncTimestamp'
  ];

  console.log('\n================================================================');
  console.log('=== STANDALONE CREDS DUMP ===');
  console.log('================================================================');
  dumpField('noiseKey.public', standaloneCreds.noiseKey?.public);
  dumpField('noiseKey.private', standaloneCreds.noiseKey?.private);
  dumpField('signedIdentityKey.public', standaloneCreds.signedIdentityKey?.public);
  dumpField('signedIdentityKey.private', standaloneCreds.signedIdentityKey?.private);
  dumpField('signedPreKey', standaloneCreds.signedPreKey);
  dumpField('registrationId', standaloneCreds.registrationId);
  dumpField('advSecretKey', standaloneCreds.advSecretKey);
  dumpField('account', standaloneCreds.account);
  dumpField('accountSignatureKey', standaloneCreds.accountSignatureKey);
  dumpField('me', standaloneCreds.me);
  dumpField('signalIdentities', standaloneCreds.signalIdentities);
  dumpField('nextPreKeyId', standaloneCreds.nextPreKeyId);
  dumpField('firstUnuploadedPreKeyId', standaloneCreds.firstUnuploadedPreKeyId);
  dumpField('lastAccountSyncTimestamp', standaloneCreds.lastAccountSyncTimestamp);

  console.log('\n================================================================');
  console.log('=== FRESH INIT AUTH CREDS DUMP ===');
  console.log('================================================================');
  dumpField('noiseKey.public', freshCreds.noiseKey?.public);
  dumpField('noiseKey.private', freshCreds.noiseKey?.private);
  dumpField('signedIdentityKey.public', freshCreds.signedIdentityKey?.public);
  dumpField('signedIdentityKey.private', freshCreds.signedIdentityKey?.private);
  dumpField('signedPreKey', freshCreds.signedPreKey);
  dumpField('registrationId', freshCreds.registrationId);
  dumpField('advSecretKey', freshCreds.advSecretKey);
  dumpField('account', freshCreds.account);
  dumpField('accountSignatureKey', freshCreds.accountSignatureKey);
  dumpField('me', freshCreds.me);
  dumpField('signalIdentities', freshCreds.signalIdentities);
  dumpField('nextPreKeyId', freshCreds.nextPreKeyId);
  dumpField('firstUnuploadedPreKeyId', freshCreds.firstUnuploadedPreKeyId);
  dumpField('lastAccountSyncTimestamp', freshCreds.lastAccountSyncTimestamp);

  fs.rmSync(tempAuthDir, { recursive: true, force: true });
}

runAuthCredsAudit().catch(console.error);
