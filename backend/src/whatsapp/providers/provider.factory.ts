import { Provider } from '@nestjs/common';
import { WHATSAPP_PROVIDER_TOKEN } from '../interfaces/whatsapp-provider.interface';
import { WhatsappWebJsProvider } from './whatsapp-webjs.provider';
import { BaileysProvider } from './baileys.provider';

export const WhatsappProviderFactory: Provider = {
  provide: WHATSAPP_PROVIDER_TOKEN,
  useFactory: (baileysProvider: BaileysProvider, webJsProvider: WhatsappWebJsProvider) => {
    const providerType = process.env.WHATSAPP_PROVIDER_TYPE || 'baileys';
    
    if (providerType === 'whatsapp-web-js') {
      return webJsProvider;
    }
    
    return baileysProvider;
  },
  inject: [BaileysProvider, WhatsappWebJsProvider],
};
