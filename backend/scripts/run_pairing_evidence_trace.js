const http = require('https');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (_) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runEvidenceTrace() {
  console.log('================================================================');
  console.log('=== EVIDENCE-FIRST DEBUGGING PROTOCOL: REAL PAIRING TRACE ===');
  console.log('================================================================\n');

  const hostname = 'api.salonsflow.in';
  const token = 'dev-bypass-token';
  const targetPhone = '919876543210';

  console.log(`[${new Date().toISOString()}] [STEP 1] Fetching pre-pairing debug status...`);
  const debugPre = await request({
    hostname,
    path: '/api/v1/webhooks/whatsapp/debug',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`[${new Date().toISOString()}] [DEBUG_PRE_PAYLOAD] Status: ${debugPre.status}`, JSON.stringify(debugPre.data, null, 2));

  console.log(`\n[${new Date().toISOString()}] [STEP 2] Dispatching POST /pairing-code for ${targetPhone}...`);
  const pairingPayload = JSON.stringify({ phoneNumber: targetPhone });
  const pairingRes = await request({
    hostname,
    path: '/api/v1/webhooks/whatsapp/pairing-code',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(pairingPayload),
      Authorization: `Bearer ${token}`
    }
  }, pairingPayload);

  console.log(`[${new Date().toISOString()}] [PAIRING_CODE_RESPONSE] Status: ${pairingRes.status}`, JSON.stringify(pairingRes.data, null, 2));

  console.log(`\n[${new Date().toISOString()}] [STEP 3] Fetching post-generation debug state...`);
  const debugPost = await request({
    hostname,
    path: '/api/v1/webhooks/whatsapp/debug',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`[${new Date().toISOString()}] [DEBUG_POST_PAYLOAD] Status: ${debugPost.status}`, JSON.stringify(debugPost.data, null, 2));

  console.log('\n================================================================');
  console.log('Waiting 30 seconds to observe if Meta emits any callback/update...');
  console.log('================================================================\n');

  await new Promise(r => setTimeout(r, 30000));

  console.log(`[${new Date().toISOString()}] [STEP 4] Fetching final 30s debug state...`);
  const debugFinal = await request({
    hostname,
    path: '/api/v1/webhooks/whatsapp/debug',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`[${new Date().toISOString()}] [DEBUG_FINAL_PAYLOAD] Status: ${debugFinal.status}`, JSON.stringify(debugFinal.data, null, 2));
}

runEvidenceTrace();
