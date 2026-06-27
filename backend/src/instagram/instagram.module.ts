import { Module } from '@nestjs/common';
import { InstagramService } from './instagram.service';
import { InstagramController } from './instagram.controller';
import { AiModule } from '../ai/ai.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AiModule, AppointmentsModule, PrismaModule],
  providers: [InstagramService],
  controllers: [InstagramController],
  exports: [InstagramService],
})
export class InstagramModule {}
