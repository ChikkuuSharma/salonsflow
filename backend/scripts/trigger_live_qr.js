const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { WhatsappGatewayService } = require('../dist/src/whatsapp/whatsapp-gateway.service');

async function triggerLiveQr() {
  console.log('================================================================');
  console.log('=== TRIGGER LIVE QR CODE GENERATION ===');
  console.log('================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  const gatewayService = app.get(WhatsappGatewayService);

  const salonId = '1b1053f5-cd4f-47d8-9e9e-9509e21c80c7';

  console.log(`[${new Date().toISOString()}] [LIVE_QR_START] Requesting QR code for salonId [${salonId}]...`);
  
  try {
    const res = await gatewayService.generateQrCodeSynchronously(salonId, true);
    console.log('\n================================================================');
    console.log('🎉 LIVE QR CODE RESULT:', JSON.stringify({ status: res.status, qrLength: res.qr?.length }, null, 2));
    if (res.qr) {
      console.log('QR Code Prefix:', res.qr.substring(0, 60) + '...');
    }
    console.log('================================================================\n');
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [LIVE_QR_ERROR] Failed:`, err);
  }

  // Hold open for 120 seconds to allow scanning
  console.log('--> Holding socket open for 120 seconds for phone camera scan...\n');
  await new Promise((resolve) => setTimeout(resolve, 120000));
  await app.close();
}

triggerLiveQr().catch(console.error);
