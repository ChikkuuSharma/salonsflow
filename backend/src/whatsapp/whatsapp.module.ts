import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { VoiceNotesController } from './voice-notes.controller';
import { WhatsappGatewayService } from './whatsapp-gateway.service';
import { AiModule } from '../ai/ai.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsappWebJsProvider } from './providers/whatsapp-webjs.provider';
import { BaileysProvider } from './providers/baileys.provider';
import { WhatsappProviderFactory } from './providers/provider.factory';

@Module({
  imports: [AiModule, AppointmentsModule, PrismaModule],
  providers: [
    WhatsappService,
    WhatsappGatewayService,
    BaileysProvider,
    WhatsappWebJsProvider,
    WhatsappProviderFactory,
  ],
  controllers: [WhatsappController, VoiceNotesController],
  exports: [WhatsappService, WhatsappGatewayService, BaileysProvider, WhatsappWebJsProvider],
})
export class WhatsappModule {}
