const http = require('http');

async function testLocalHttpPairing() {
  console.log('================================================================');
  console.log('=== HTTP TEST FOR LOCAL NESTJS SERVER (http://localhost:3000) ===');
  console.log('================================================================\n');

  const salonId = '1b1053f5-cd4f-47d8-9e9e-9509e21c80c7';
  const phone = '919876543210';
  const postData = JSON.stringify({ phoneNumber: phone });

  const req = http.request({
    hostname: '127.0.0.1',
    port: 3001,
    path: `/api/v1/webhooks/whatsapp/pairing-code?salonId=${salonId}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  }, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('================================================================');
      console.log('🎉 LOCAL HTTP PAIRING CODE RESPONSE (Status:', res.statusCode, '):', body);
      console.log('================================================================\n');
    });
  });

  req.on('error', (e) => {
    console.error('HTTP Request Error:', e.message);
  });

  req.write(postData);
  req.end();
}

testLocalHttpPairing();
