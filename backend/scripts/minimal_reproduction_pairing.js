const { default: makeWASocket, fetchLatestBaileysVersion, Browsers, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const pino = require('pino');

async function runMinimalReproduction() {
  const targetPhone = process.argv[2] || '919876543210';
  const cleanPhone = targetPhone.replace(/\D/g, '');

  console.log('================================================================');
  console.log(`=== MINIMAL STANDALONE PAIRING REPRODUCTION (+${cleanPhone}) ===`);
  console.log('================================================================\n');

  console.log(`Node.js Version: ${process.version}`);
  console.log(`Working Directory: ${process.cwd()}`);

  const authDir = './minimal_auth_reproduction_dir';
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
  }

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Baileys Protocol Version: ${version.join('.')} (isLatest: ${isLatest})`);

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    version,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'info' })
  });

  sock.ev.on('creds.update', saveCreds);

  let pairingCodeRequested = false;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const time = new Date().toISOString();

    console.log(`[${time}] [CONNECTION_UPDATE] Connection: ${connection || 'none'}, QR: ${qr ? 'PRESENT' : 'ABSENT'}`);

    if (lastDisconnect) {
      console.log(`[${time}] [DISCONNECT_REASON] Error:`, JSON.stringify(lastDisconnect.error));
    }

    if (qr && !pairingCodeRequested) {
      pairingCodeRequested = true;
      console.log(`[${time}] [REQUEST_PAIRING_CODE] Triggering requestPairingCode for +${cleanPhone}...`);
      try {
        const rawCode = await sock.requestPairingCode(cleanPhone);
        const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;

        console.log('\n================================================================');
        console.log(`🎉 REPRODUCTION PAIRING CODE: [ ${formattedCode} ]`);
        console.log('================================================================');
        console.log('--> Waiting for real user to enter code on mobile phone (180s)...\n');
      } catch (err) {
        console.error(`[${time}] [REQUEST_PAIRING_CODE_ERROR] Failed: ${err.message}`, err.stack);
      }
    }

    if (connection === 'open') {
      console.log('\n================================================================');
      console.log('✅ MINIMAL REPRODUCTION PAIRING SUCCESSFUL! MOBILE LINKED!');
      console.log('================================================================');
      console.log(`User JID: ${sock.user?.id}`);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.data?.statusCode;
      console.log(`\n❌ MINIMAL REPRODUCTION CONNECTION CLOSED! StatusCode: ${statusCode}`);
    }
  });
}

runMinimalReproduction().catch(console.error);
