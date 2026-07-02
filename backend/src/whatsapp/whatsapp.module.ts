import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { VoiceNotesController } from './voice-notes.controller';
import { WhatsappGatewayService } from './whatsapp-gateway.service';
import { AiModule } from '../ai/ai.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AiModule, AppointmentsModule, PrismaModule],
  providers: [WhatsappService, WhatsappGatewayService],
  controllers: [WhatsappController, VoiceNotesController],
  exports: [WhatsappService, WhatsappGatewayService],
})
export class WhatsappModule {}
