import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as express from 'express';
import Stripe from 'stripe';
import { StripeWebhookService } from './stripe-webhook.service';

@Controller('api/v1/webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);
  private readonly stripe: InstanceType<typeof Stripe>;

  constructor(private readonly stripeWebhookService: StripeWebhookService) {
    this.stripe = new Stripe(process.env.STRIPE_API_KEY || 'dummy_key', {
      apiVersion: '2022-11-15' as any,
    });
  }

  @Post()
  async handleWebhook(
    @Req() req: express.Request & { rawBody?: Buffer },
    @Res() res: express.Response,
    @Headers('stripe-signature') signature?: string,
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: any;

    if (!webhookSecret) {
      this.logger.warn(
        'STRIPE_WEBHOOK_SECRET is not configured. Bypassing signature verification (Mock/Bypass Mode).',
      );
      event = req.body;
    } else {
      if (!signature) {
        this.logger.error('Missing stripe-signature header');
        throw new BadRequestException('Missing stripe-signature header');
      }

      const rawBody = req.rawBody;
      if (!rawBody) {
        this.logger.error('Raw body not available for signature verification');
        throw new BadRequestException('Raw request body is missing');
      }

      try {
        event = this.stripe.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret,
        );
      } catch (err) {
        this.logger.error(
          `Webhook signature verification failed: ${err.message}`,
        );
        throw new BadRequestException(
          `Webhook signature verification failed: ${err.message}`,
        );
      }
    }

    if (!event || !event.type) {
      throw new BadRequestException(
        'Invalid webhook event payload shape. Missing "type".',
      );
    }

    this.logger.log(`Received Stripe Webhook event: ${event.type}`);

    try {
      const dataObject = event.data?.object;
      if (!dataObject) {
        throw new BadRequestException(
          'Invalid webhook event payload shape. Missing event.data.object',
        );
      }

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.stripeWebhookService.handleSubscriptionCreatedOrUpdated(
            dataObject,
          );
          break;
        case 'customer.subscription.deleted':
          await this.stripeWebhookService.handleSubscriptionDeleted(dataObject);
          break;
        default:
          this.logger.log(`Unhandled Stripe event type: ${event.type}`);
      }

      return res.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      this.logger.error(
        `Failed to handle Stripe webhook event: ${error.message}`,
      );
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Failed to process event',
        details: error.message,
      });
    }
  }
}
