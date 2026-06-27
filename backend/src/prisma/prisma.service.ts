import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pool);
    super({
      adapter,
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(
        'Successfully connected to the database via Prisma Pg adapter',
      );
    } catch (error) {
      this.logger.error(`Failed to connect to the database: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from the database');
  }

  /**
   * Log security-relevant events to the console with [SECURITY_AUDIT_FAIL] prefix and save to AuditLog table.
   */
  async logSecurityEvent(
    salonId: string,
    action: string,
    details: any,
    userId?: string,
  ) {
    this.logger.warn(
      `[SECURITY_AUDIT_FAIL] Salon: ${salonId} | Action: ${action} | Details: ${JSON.stringify(details)}`,
    );
    try {
      await this.auditLog.create({
        data: {
          salonId,
          action,
          details,
          ...(userId ? { userId } : {}),
        },
      });
    } catch (err) {
      this.logger.error(`Failed to create security audit log: ${err.message}`);
    }
  }
}
