import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { InstagramModule } from './instagram/instagram.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { RemindersModule } from './reminders/reminders.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CustomersModule } from './customers/customers.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { SalonsModule } from './salons/salons.module';
import { ReviewsModule } from './reviews/reviews.module';
import { RebookingsModule } from './rebookings/rebookings.module';
import { CommissionsModule } from './commissions/commissions.module';
import { PosModule } from './pos/pos.module';
import { AdminModule } from './admin/admin.module';
import { ServicesModule } from './services/services.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    WhatsappModule,
    InstagramModule,
    AppointmentsModule,
    RemindersModule,
    AnalyticsModule,
    WebhooksModule,
    CustomersModule,
    CampaignsModule,
    SalonsModule,
    ReviewsModule,
    RebookingsModule,
    CommissionsModule,
    PosModule,
    AdminModule,
    ServicesModule,
    ReportsModule,
  ],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule {}
