import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [ScheduleModule.forRoot(), WhatsappModule],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
