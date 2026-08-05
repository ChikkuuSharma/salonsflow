const http = require('https');

function request(options) {
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
    req.end();
  });
}

async function fetchTelemetry() {
  console.log('================================================================');
  console.log('=== FETCHING RAW PRODUCTION TELEMETRY FOR ATTEMPT 1 & 2 ===');
  console.log('================================================================\n');

  const hostname = 'api.salonsflow.in';
  const token = 'dev-bypass-token';

  const res = await request({
    hostname,
    path: '/api/v1/webhooks/whatsapp/debug',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log(`[${new Date().toISOString()}] Production Debug Endpoint Response (Status: ${res.status}):`);
  console.log(JSON.stringify(res.data, null, 2));
}

fetchTelemetry();
