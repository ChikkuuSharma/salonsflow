import { Provider } from '@nestjs/common';
import { WHATSAPP_PROVIDER_TOKEN } from '../interfaces/whatsapp-provider.interface';
import { WhatsappWebJsProvider } from './whatsapp-webjs.provider';

export const WhatsappProviderFactory: Provider = {
  provide: WHATSAPP_PROVIDER_TOKEN,
  useFactory: (webJsProvider: WhatsappWebJsProvider) => {
    const providerType = process.env.WHATSAPP_PROVIDER_TYPE || 'whatsapp-web-js';
    
    if (providerType === 'whatsapp-web-js') {
      return webJsProvider;
    }
    
    return webJsProvider;
  },
  inject: [WhatsappWebJsProvider],
};
