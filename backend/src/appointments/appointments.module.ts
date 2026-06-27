import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { WaitingListController } from './waiting-list.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WaitingListService } from './waiting-list.service';
import { RecoveryService } from './recovery.service';

@Module({
  imports: [PrismaModule],
  controllers: [AppointmentsController, WaitingListController],
  providers: [AppointmentsService, WaitingListService, RecoveryService],
  exports: [AppointmentsService, WaitingListService, RecoveryService],
})
export class AppointmentsModule {}
