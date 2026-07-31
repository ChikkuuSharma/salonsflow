const { default: makeWASocket, fetchLatestBaileysVersion, Browsers, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const readline = require('readline');
const fs = require('fs');
const pino = require('pino');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function startStandalonePairing() {
  console.log('================================================================');
  console.log('=== MINIMAL STANDALONE BAILEYS PAIRING TEST HARNESS (v7.0.0) ===');
  console.log('================================================================\n');

  // Step 1: Clean up previous test auth
  const authDir = './standalone_auth_session';
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
    console.log(`[${new Date().toISOString()}] Wiped previous standalone auth store.`);
  }

  // Step 2: Prompt for target phone number
  const rawPhone = await question('Enter target WhatsApp phone number with country code (e.g. 919876543210): ');
  const cleanPhone = rawPhone.replace(/\D/g, '');

  if (!cleanPhone || cleanPhone.length < 10) {
    console.error('Invalid phone number format. Must be at least 10 digits with country code.');
    process.exit(1);
  }

  // Step 3: Fetch latest Baileys protocol version
  let version = [2, 3000, 1043857760];
  try {
    const latest = await fetchLatestBaileysVersion();
    if (latest && latest.version) {
      version = latest.version;
    }
  } catch (err) {
    console.log(`[${new Date().toISOString()}] Version fetch warning: ${err.message}`);
  }
  console.log(`[${new Date().toISOString()}] Using Baileys protocol version: ${version.join('.')}`);

  // Step 4: Initialize Auth State
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  // Step 5: Create WASocket instance
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

  // Step 6: Socket connection update event listener
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] [CONNECTION_UPDATE] Connection: ${connection || 'none'}, QR: ${qr ? 'PRESENT' : 'ABSENT'}`);

    if (qr && !pairingRequested) {
      pairingRequested = true;
      console.log(`[${timestamp}] [PAIRING_REQUEST_START] Requesting pairing code for ${cleanPhone}...`);
      try {
        const rawCode = await sock.requestPairingCode(cleanPhone);
        const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;

        console.log('\n================================================================');
        console.log(`🎉 STANDALONE PAIRING CODE GENERATED: [ ${formattedCode} ]`);
        console.log('================================================================');
        console.log('--> Open WhatsApp on mobile phone');
        console.log('--> Linked Devices -> Link a Device -> Link with phone number instead');
        console.log(`--> Enter 8-digit code: ${formattedCode}`);
        console.log('--> HOLDING SOCKET ALIVE IN TERMINAL... (Do NOT close window)\n');
      } catch (err) {
        console.error(`[${timestamp}] [PAIRING_REQUEST_ERROR] Failed: ${err.message}`);
      }
    }

    if (connection === 'open') {
      const userJid = sock.user?.id.split(':')[0];
      console.log('\n================================================================');
      console.log(`✅ LINK SUCCESSFUL! CONNECTED AS WHATSAPP USER: +${userJid}`);
      console.log('================================================================\n');
      rl.close();
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(`[${timestamp}] [SOCKET_CLOSED] StatusCode: ${statusCode}, LoggedOut: ${isLoggedOut}, Error: ${lastDisconnect?.error?.message}`);
    }
  });
}

startStandalonePairing();
