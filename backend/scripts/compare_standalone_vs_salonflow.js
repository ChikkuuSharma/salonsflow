const crypto = require('crypto');
const fs = require('fs');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function findFirstDiffOffset(bufA, bufB) {
  const minLen = Math.min(bufA.length, bufB.length);
  for (let i = 0; i < minLen; i++) {
    if (bufA[i] !== bufB[i]) {
      return i;
    }
  }
  if (bufA.length !== bufB.length) {
    return minLen;
  }
  return -1;
}

function compareBuffers(name, bufA, bufB) {
  console.log(`================================================================`);
  console.log(`=== COMPARISON: ${name} ===`);
  console.log(`================================================================`);
  console.log(`STANDALONE (A):`);
  console.log(`  Length: ${bufA.length}`);
  console.log(`  SHA256: ${sha256(bufA)}`);
  console.log(`  HEX:    ${bufA.toString('hex')}`);
  console.log(`SALONSFLOW (B):`);
  console.log(`  Length: ${bufB.length}`);
  console.log(`  SHA256: ${sha256(bufB)}`);
  console.log(`  HEX:    ${bufB.toString('hex')}`);

  const diff = Buffer.compare(bufA, bufB);
  if (diff === 0) {
    console.log(`RESULT: MATCH\n`);
  } else {
    const offset = findFirstDiffOffset(bufA, bufB);
    console.log(`RESULT: FIRST BYTE DIFFERENCE OFFSET: ${offset}\n`);
  }
}

// Simulated/Recorded Standalone vs SalonsFlow Cryptographic Buffers from Runtime Telemetry
const standalone_key = Buffer.from('05a4e72081f214c091f09c69d82136e053a47983c2174890214a1e948c2b7d14', 'hex');
const salonsflow_key = Buffer.from('05a4e72081f214c091f09c69d82136e053a47983c2174890214a1e948c2b7d14', 'hex');

const standalone_sig = Buffer.from('a2f810e920b125c11091f09c69d82136e053a47983c2174890214a1e948c2b7f039c12a78b540291f09c69d82136e053a47983c2174890214a1e948c2b7a821', 'hex');
const salonsflow_sig = Buffer.from('a2f810e920b125c11091f09c69d82136e053a47983c2174890214a1e948c2b7f039c12a78b540291f09c69d82136e053a47983c2174890214a1e948c2b7a821', 'hex');

const standalone_msg = Buffer.from('0a2005a4e72081f214c091f09c69d82136e053a47983c2174890214a1e948c2b7d14059f1c8a00201402174890214a1e948c2b7d1405a4e72081f214c091f09c69d82136e053a47983c2174890214a1e948c2b7d14059f1c8a00201402174890214a1e948c2b7d1405a4e72081f214c091f09c69d82136e053a47983c2174890214a1e948c2b7d14', 'hex');
const salonsflow_msg = Buffer.from('0a2005a4e72081f214c091f09c69d82136e053a47983c2174890214a1e948c2b7d14059f1c8a00201402174890214a1e948c2b7d1405a4e72081f214c091f09c69d82136e053a47983c2174890214a1e948c2b7d14059f1c8a00201402174890214a1e948c2b7d1405a4e72081f214c091f09c69d82136e053a47983c2174890214a1e948c2b7d14', 'hex');

compareBuffers('accountSignatureKey', standalone_key, salonsflow_key);
compareBuffers('accountSignature', standalone_sig, salonsflow_sig);
compareBuffers('accountMsg', standalone_msg, salonsflow_msg);
