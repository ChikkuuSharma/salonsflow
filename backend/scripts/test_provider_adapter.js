const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { WhatsappGatewayService } = require('../dist/src/whatsapp/whatsapp-gateway.service');

async function testProviderAdapter() {
  console.log('================================================================');
  console.log('=== TESTING IWHATSAPPPROVIDER (WHATSAPP-WEB.JS ADAPTER) ===');
  console.log('================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  const gatewayService = app.get(WhatsappGatewayService);

  const testSalonId = '1b1053f5-cd4f-47d8-9e9e-9509e21c80c7';

  console.log(`[${new Date().toISOString()}] [PROVIDER_TEST] Requesting QR code via IWhatsappProvider...`);
  
  try {
    const res = await gatewayService.generateQrCodeSynchronously(testSalonId, true);
    console.log('\n================================================================');
    console.log('🎉 PROVIDER ADAPTER QR RESPONSE:', JSON.stringify({ status: res.status, qrLength: res.qr?.length }, null, 2));
    if (res.qr) {
      console.log('QR Code Data URL Prefix:', res.qr.substring(0, 60) + '...');
    }
    console.log('================================================================\n');
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [PROVIDER_TEST_ERROR] Failed:`, err);
  }

  await app.close();
}

testProviderAdapter().catch(console.error);
