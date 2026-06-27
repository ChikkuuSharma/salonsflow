import { Module } from '@nestjs/common';
import { RebookingsService } from './rebookings.service';
import { RebookingsController } from './rebookings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, WhatsappModule, AiModule],
  providers: [RebookingsService],
  controllers: [RebookingsController],
  exports: [RebookingsService],
})
export class RebookingsModule {}
