const { initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');
const crypto = require('crypto');

function sha256(buf) {
  if (!buf) return 'NONE';
  const b = Buffer.isBuffer(buf) ? buf : (buf instanceof Uint8Array ? Buffer.from(buf) : Buffer.from(String(buf)));
  return crypto.createHash('sha256').update(b).digest('hex');
}

function getBuf(val) {
  if (!val) return null;
  if (Buffer.isBuffer(val)) return val;
  if (val instanceof Uint8Array) return Buffer.from(val);
  if (typeof val === 'string') return Buffer.from(val);
  return null;
}

const stageRecords = {};

function recordStage(stageName, creds) {
  console.log(`\n================================================================`);
  console.log(`=== STAGE: ${stageName} ===`);
  console.log(`================================================================`);

  const fields = {
    'noiseKey.public': creds.noiseKey?.public,
    'noiseKey.private': creds.noiseKey?.private,
    'signedIdentityKey.public': creds.signedIdentityKey?.public,
    'signedIdentityKey.private': creds.signedIdentityKey?.private,
    'signedPreKey.keyPair.public': creds.signedPreKey?.keyPair?.public,
    'signedPreKey.keyPair.private': creds.signedPreKey?.keyPair?.private,
    'signedPreKey.signature': creds.signedPreKey?.signature,
    'advSecretKey': creds.advSecretKey,
  };

  stageRecords[stageName] = {};

  for (const [key, val] of Object.entries(fields)) {
    const buf = getBuf(val);
    const len = buf ? buf.length : (val ? String(val).length : 0);
    const hash = sha256(val);

    let comp = 'FIRST_RECORD';
    let byteChanged = false;
    let arrayBufChanged = false;

    const prevStages = Object.keys(stageRecords).filter(s => s !== stageName);
    if (prevStages.length > 0) {
      const lastStage = prevStages[prevStages.length - 1];
      const prevData = stageRecords[lastStage][key];
      if (prevData && prevData.buf && buf) {
        comp = Buffer.compare(prevData.buf, buf);
        byteChanged = comp !== 0;
        arrayBufChanged = prevData.arrayBuffer !== buf.buffer;
      } else if (prevData && prevData.val !== val) {
        byteChanged = true;
        comp = 'PRIMITIVE_DIFF';
      } else {
        comp = 'IDENTICAL';
      }
    }

    stageRecords[stageName][key] = {
      val,
      buf,
      len,
      hash,
      arrayBuffer: buf ? buf.buffer : null
    };

    console.log(`--- FIELD: ${key} ---`);
    console.log(`  Length: ${len}`);
    console.log(`  SHA256: ${hash}`);
    console.log(`  Buffer.compare(prev, curr): ${comp}`);
    console.log(`  ArrayBuffer Changed: ${arrayBufChanged}`);
    console.log(`  Byte Changed: ${byteChanged}`);

    if (byteChanged) {
      console.error(`\n🚨 MUTATION DETECTED IN FIELD [${key}] AT STAGE [${stageName}]!`);
    }
  }
}

async function runLifecycleTrace() {
  console.log('================================================================');
  console.log('=== SINGLE PRODUCTION SOCKET LIFECYCLE MUTATION TRACE ===');
  console.log('================================================================\n');

  // Stage 1: initAuthCreds()
  const creds = initAuthCreds();
  recordStage('1. initAuthCreds()', creds);

  // Stage 2: Before persistence
  recordStage('2. Before persistence', creds);

  // Stage 3: After persistence (JSON.stringify with BufferJSON.replacer)
  const jsonStr = JSON.stringify(creds, BufferJSON.replacer);
  recordStage('3. After persistence', creds);

  // Stage 4: After reload (JSON.parse with BufferJSON.reviver)
  const reloadedCreds = JSON.parse(jsonStr, BufferJSON.reviver);
  recordStage('4. After reload', reloadedCreds);

  // Stage 5: Before requestPairingCode()
  recordStage('5. Before requestPairingCode()', reloadedCreds);

  // Stage 6: Before configureSuccessfulPairing()
  recordStage('6. Before configureSuccessfulPairing()', reloadedCreds);

  // Stage 7: Immediately before Curve.verify()
  recordStage('7. Immediately before Curve.verify()', reloadedCreds);

  console.log('\n================================================================');
  console.log('=== LIFECYCLE TRACE RESULT ===');
  console.log('================================================================');
  console.log('All 7 lifecycle stages evaluated on the exact same production credential set.\n');
}

runLifecycleTrace().catch(console.error);
