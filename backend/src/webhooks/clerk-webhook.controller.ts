import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Headers,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as express from 'express';
import { ClerkWebhookService } from './clerk-webhook.service';

@Controller('api/v1/webhooks/clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);
  private readonly webhookSecret =
    process.env.CLERK_WEBHOOK_SECRET || 'salonflow_clerk_secret';

  constructor(private readonly clerkWebhookService: ClerkWebhookService) {}

  /**
   * Handle Incoming Webhook Events from Clerk
   */
  @Post()
  async handleWebhook(
    @Body() body: any,
    @Headers('x-clerk-secret') clientSecret: string,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    // 1. Verify webhook secret
    if (clientSecret !== this.webhookSecret) {
      this.logger.warn(
        `Unauthorized Clerk webhook trigger attempt from IP: ${req.ip}`,
      );
      throw new UnauthorizedException(
        'Invalid or missing Clerk webhook secret.',
      );
    }

    // 2. Validate payload shape
    if (!body || !body.type) {
      throw new BadRequestException(
        'Invalid webhook event payload shape. Missing "type".',
      );
    }

    this.logger.log(`Received Clerk Webhook event type: ${body.type}`);

    // 3. Process the event
    if (body.type === 'user.created') {
      try {
        const result = await this.clerkWebhookService.handleUserCreated(body);

        if (result.alreadyExisted) {
          return res.status(HttpStatus.OK).json({
            message:
              'User already exists. Idempotent request processed successfully.',
            user: result.user,
            salon: result.salon,
          });
        }

        return res.status(HttpStatus.CREATED).json({
          message: 'Successfully provisioned new Salon and OWNER User.',
          user: result.user,
          salon: result.salon,
        });
      } catch (error) {
        this.logger.error(
          `Failed to handle user.created webhook event: ${error.message}`,
        );
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process user creation event.',
          details: error.message,
        });
      }
    }

    // Acknowledge other event types to prevent retry loops
    return res.status(HttpStatus.OK).json({
      message: `Event type "${body.type}" acknowledged but not processed.`,
    });
  }
}
