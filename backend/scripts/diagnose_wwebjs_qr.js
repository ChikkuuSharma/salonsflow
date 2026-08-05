const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');

async function diagnose() {
  console.log('================================================================');
  console.log('=== TESTING WEBVERSIONCACHE FIX FOR WHATSAPP-WEB.JS ===');
  console.log('================================================================\n');

  const testSalonId = 'fa87453e-5315-4f62-8945-6e2dce9f4a49';

  console.log(`[${new Date().toISOString()}] Instantiating whatsapp-web.js Client with webVersionCache...`);

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: testSalonId,
      dataPath: path.join(process.cwd(), 'whatsapp_sessions'),
    }),
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version-history/main/html/2.3000.1018904586-alpha.html',
    },
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
      ],
    },
  });

  client.on('qr', (qrRaw) => {
    console.log(`\n🎉 [EVENT: QR] Raw QR Code String Received (Length: ${qrRaw.length})!`);
    console.log('QR Code Prefix:', qrRaw.substring(0, 50) + '...');
  });

  client.on('ready', () => {
    console.log(`\n🎉 [EVENT: READY] Client is READY!`);
  });

  client.on('authenticated', () => {
    console.log(`\n🎉 [EVENT: AUTHENTICATED] Authenticated!`);
  });

  client.on('auth_failure', (msg) => {
    console.error(`\n🔴 [EVENT: AUTH_FAILURE] Msg:`, msg);
  });

  client.on('disconnected', (reason) => {
    console.log(`\n🔴 [EVENT: DISCONNECTED] Reason:`, reason);
  });

  console.log(`[${new Date().toISOString()}] Initializing Puppeteer Chrome...`);
  await client.initialize();
  console.log(`[${new Date().toISOString()}] client.initialize() promise resolved! Waiting for QR event...`);

  await new Promise((resolve) => setTimeout(resolve, 25000));
  await client.destroy();
  console.log('Diagnosis complete.');
}

diagnose().catch((err) => {
  console.error('Diagnosis Error:', err);
});
