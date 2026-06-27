import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class ClerkWebhookService {
  private readonly logger = new Logger(ClerkWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process Clerk user.created Webhook payload atomically
   */
  async handleUserCreated(payload: any) {
    const data = payload?.data;
    if (!data || !data.id || !data.email_addresses?.[0]?.email_address) {
      throw new Error(
        'Invalid Clerk webhook payload. Missing user id or email.',
      );
    }

    const clerkId = data.id;
    const email = data.email_addresses[0].email_address;
    const firstName = data.first_name || '';
    const lastName = data.last_name || '';
    const name =
      [firstName, lastName].filter(Boolean).join(' ') || 'Salon Owner';

    this.logger.log(
      `Processing Clerk signup for user: ${email} (clerkId: ${clerkId})`,
    );

    // 1. Check if user already exists to guarantee webhook idempotency
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ clerkId }, { email }],
      },
      include: {
        salon: true,
      },
    });

    if (existingUser) {
      this.logger.warn(
        `User with clerkId: ${clerkId} or email: ${email} already exists in database.`,
      );
      return {
        user: existingUser,
        salon: existingUser.salon,
        alreadyExisted: true,
      };
    }

    // 2. Resolve WhatsApp phone number for the new Salon
    let phone = data.phone_numbers?.[0]?.phone_number;
    if (!phone) {
      // Loop to ensure we generate a truly unique placeholder phone number to prevent @unique constraint index crash
      let isUnique = false;
      while (!isUnique) {
        const randomDigits = Math.floor(
          1000000000 + Math.random() * 9000000000,
        );
        phone = `+91${randomDigits}`;
        const conflict = await this.prisma.salon.findUnique({
          where: { whatsappNumber: phone },
        });
        if (!conflict) {
          isUnique = true;
        }
      }
    }

    // 3. Atomically create Salon and User in a transaction
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const salonName = `${name}'s Salon`;

        // Create the Salon
        const salon = await tx.salon.create({
          data: {
            name: salonName,
            whatsappNumber: phone,
            aiPrompt: `You are the AI Receptionist for "${salonName}". Be polite and helpful. Help clients book appointments and answer FAQs.`,
          },
        });

        // Create the User (Role: OWNER)
        const user = await tx.user.create({
          data: {
            clerkId,
            email,
            name,
            salonId: salon.id,
            role: Role.OWNER,
          },
        });

        return { user, salon };
      });

      this.logger.log(`Successfully provisioned Salon and User for ${email}`);
      return { ...result, alreadyExisted: false };
    } catch (err) {
      this.logger.error(
        `Error in atomic Clerk user provisioning transaction: ${err.message}`,
      );
      throw err;
    }
  }
}
