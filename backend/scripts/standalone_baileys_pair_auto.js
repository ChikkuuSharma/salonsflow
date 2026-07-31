const { default: makeWASocket, fetchLatestBaileysVersion, Browsers, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const pino = require('pino');

async function startAutoPairing() {
  const targetPhone = process.argv[2] || '919876543210';
  const cleanPhone = targetPhone.replace(/\D/g, '');

  console.log('================================================================');
  console.log(`=== STANDALONE BAILEYS PAIRING TEST FOR: +${cleanPhone} ===`);
  console.log('================================================================\n');

  const authDir = './standalone_auth_session';
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
  }

  const { version } = await fetchLatestBaileysVersion();
  console.log(`[${new Date().toISOString()}] Baileys protocol version: ${version.join('.')}`);

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    version,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);

  let pairingRequested = false;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] [STANDALONE_UPDATE] Connection: ${connection || 'none'}, QR: ${qr ? 'PRESENT' : 'ABSENT'}`);

    if (qr && !pairingRequested) {
      pairingRequested = true;
      console.log(`[${timestamp}] [STANDALONE_REQUEST_START] Requesting pairing code for +${cleanPhone}...`);
      try {
        const rawCode = await sock.requestPairingCode(cleanPhone);
        const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;

        console.log('\n================================================================');
        console.log(`🎉 STANDALONE PAIRING CODE GENERATED: [ ${formattedCode} ]`);
        console.log('================================================================');
        console.log('--> Holding standalone socket open in memory for 180 seconds...\n');
      } catch (err) {
        console.error(`[${timestamp}] [STANDALONE_REQUEST_ERROR] Failed: ${err.message}`);
      }
    }

    if (connection === 'open') {
      const userJid = sock.user?.id.split(':')[0];
      console.log('\n================================================================');
      console.log(`✅ STANDALONE LINK SUCCESSFUL! CONNECTED AS: +${userJid}`);
      console.log('================================================================\n');
      process.exit(0);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log(`[${timestamp}] [STANDALONE_CLOSED] StatusCode: ${statusCode}, Error: ${lastDisconnect?.error?.message}`);
    }
  });
}

startAutoPairing();
