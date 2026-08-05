const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { WhatsappGatewayService } = require('../dist/src/whatsapp/whatsapp-gateway.service');

async function testLocalGatewayPairing() {
  console.log('================================================================');
  console.log('=== LOCAL NESTJS GATEWAY SERVICE PAIRING TEST ===');
  console.log('================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  const gatewayService = app.get(WhatsappGatewayService);

  const testSalonId = '1b1053f5-cd4f-47d8-9e9e-9509e21c80c7';
  const testPhone = '919876543210';

  console.log(`[${new Date().toISOString()}] [LOCAL_TEST_START] Requesting pairing code for salonId [${testSalonId}]...`);
  
  try {
    const res = await gatewayService.generatePairingCode(testSalonId, testPhone, true);
    console.log('\n================================================================');
    console.log('🎉 LOCAL NESTJS PAIRING CODE GENERATED:', JSON.stringify(res, null, 2));
    console.log('================================================================\n');
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [LOCAL_TEST_ERROR] Failed:`, err);
  }

  // Hold open for 120 seconds to observe connection updates
  console.log('--> Holding local NestJS application context active for 120 seconds...\n');
  await new Promise((resolve) => setTimeout(resolve, 120000));
  await app.close();
}

testLocalGatewayPairing().catch(console.error);
