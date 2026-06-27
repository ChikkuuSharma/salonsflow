import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
    private readonly whatsappService: WhatsappService,
  ) {}

  /**
   * Broadcast a campaign template to target customers and record campaign stats
   */
  async create(
    salonId: string,
    name: string,
    content: string,
    targetSegment: string,
  ) {
    this.logger.log(
      `Creating campaign "${name}" for salon: ${salonId} (segment: ${targetSegment})`,
    );

    // Verify subscription status is not suspended
    const subscription = await this.prisma.subscription.findUnique({
      where: { salonId },
    });
    if (subscription && subscription.status === SubscriptionStatus.SUSPENDED) {
      throw new BadRequestException(
        'Campaign broadcasts disabled. Salon subscription is suspended.',
      );
    }

    if (
      !['all_customers', 'inactive_30_days', 'frequent_visitors'].includes(
        targetSegment,
      )
    ) {
      throw new BadRequestException(
        'Invalid target segment value. Choose from: all_customers, inactive_30_days, frequent_visitors',
      );
    }

    // Fetch targeted customers
    const customers = await this.customersService.findAll(
      salonId,
      undefined,
      targetSegment,
    );

    // Save campaign in DB
    const campaign = await this.prisma.campaign.create({
      data: {
        salonId,
        name,
        content,
        targetSegment,
        sentCount: customers.length,
      },
    });

    // Send messages via WhatsApp Cloud API concurrently
    await Promise.all(
      customers.map(async (customer) => {
        try {
          await this.whatsappService.sendMessage(customer.phone, content);
        } catch (error) {
          this.logger.error(
            `Failed to broadcast message to customer ${customer.id} (${customer.phone}): ${error.message}`,
          );
        }
      }),
    );

    return campaign;
  }

  /**
   * List all campaigns for a specific salon
   */
  async findAll(salonId: string) {
    this.logger.log(`Fetching campaigns history for salon: ${salonId}`);
    return this.prisma.campaign.findMany({
      where: {
        salonId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
