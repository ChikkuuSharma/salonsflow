import { Module } from '@nestjs/common';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { ClerkWebhookService } from './clerk-webhook.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeWebhookService } from './stripe-webhook.service';
import { MissedCallController } from './missed-call.controller';
import { ReviewClickController } from './review-click.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, WhatsappModule],
  controllers: [
    ClerkWebhookController,
    StripeWebhookController,
    MissedCallController,
    ReviewClickController,
  ],
  providers: [ClerkWebhookService, StripeWebhookService],
  exports: [ClerkWebhookService, StripeWebhookService],
})
export class WebhooksModule {}
