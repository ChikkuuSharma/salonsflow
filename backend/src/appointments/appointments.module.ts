import { Module, forwardRef } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { WaitingListController } from './waiting-list.controller';
import { PublicBookingsController } from './public-bookings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WaitingListService } from './waiting-list.service';
import { RecoveryService } from './recovery.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, forwardRef(() => WhatsappModule)],
  controllers: [AppointmentsController, WaitingListController, PublicBookingsController],
  providers: [AppointmentsService, WaitingListService, RecoveryService],
  exports: [AppointmentsService, WaitingListService, RecoveryService],
})
export class AppointmentsModule {}
