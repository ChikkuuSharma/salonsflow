import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [PrismaModule, RemindersModule],
  controllers: [AdminController],
})
export class AdminModule {}
