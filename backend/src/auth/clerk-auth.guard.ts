import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    if (token && token.startsWith('dev-bypass-token')) {
      try {
        let targetRole: 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'RECEPTIONIST' = 'SUPER_ADMIN';
        let clerkId = 'dev-bypass-user-id';
        let email = 'dev@salonflow.com';
        let name = 'Devender Sharma';
        let targetSalonId: string | null = null;

        if (token === 'dev-bypass-token-owner') {
          targetRole = 'OWNER';
          clerkId = 'dev-bypass-user-owner';
          email = 'owner@salonflow.com';
          name = 'Owner User';
        } else if (token === 'dev-bypass-token-manager') {
          targetRole = 'MANAGER';
          clerkId = 'dev-bypass-user-manager';
          email = 'manager@salonflow.com';
          name = 'Manager User';
        } else if (token === 'dev-bypass-token-receptionist') {
          targetRole = 'RECEPTIONIST';
          clerkId = 'dev-bypass-user-receptionist';
          email = 'receptionist@salonflow.com';
          name = 'Receptionist User';
        } else if (token.startsWith('dev-bypass-token-superadmin')) {
          targetRole = 'SUPER_ADMIN';
          let adminId = 'admin';
          if (token.startsWith('dev-bypass-token-superadmin-')) {
            adminId = token.substring('dev-bypass-token-superadmin-'.length);
          }
          clerkId = `dev-bypass-user-superadmin-${adminId}`;
          email = `${adminId}@salonsflow.com`;
          name = adminId.charAt(0).toUpperCase() + adminId.slice(1);
        } else if (token === 'dev-bypass-token-demo') {
          targetRole = 'OWNER';
          clerkId = 'dev-bypass-user-demo';
          email = 'demo@salonflow.com';
          name = 'Demo Owner';
        } else if (token.startsWith('dev-bypass-token-impersonate-')) {
          targetSalonId = token.substring('dev-bypass-token-impersonate-'.length);
          const salonExists = await this.prisma.salon.findUnique({
            where: { id: targetSalonId },
          });
          if (!salonExists) {
            throw new UnauthorizedException('Impersonated salon does not exist');
          }
          targetRole = 'OWNER';

          // Try to find an existing user for this salon to inherit details
          const existingUser = await this.prisma.user.findFirst({
            where: { salonId: targetSalonId },
            orderBy: { role: 'asc' },
          });

          if (existingUser) {
            clerkId = existingUser.clerkId;
            email = existingUser.email;
            name = existingUser.name;
            targetRole = existingUser.role;
          } else {
            clerkId = `dev-bypass-user-impersonate-${targetSalonId}`;
            email = `owner-${targetSalonId.substring(0, 8)}@salonsflow.com`;
            name = `Impersonated Owner (${salonExists.name})`;
          }
        } else if (token.startsWith('dev-bypass-token-user-')) {
          const userId = token.substring('dev-bypass-token-user-'.length);
          const dbUser = await this.prisma.user.findUnique({
            where: { id: userId },
          });
          if (!dbUser) {
            throw new UnauthorizedException('Authenticated user does not exist');
          }
          await this.selfHealSalon(dbUser.salonId);
          (request as any).user = {
            sub: dbUser.clerkId,
            email: dbUser.email,
            role: dbUser.role,
            salonId: dbUser.salonId,
          };
          return true;
        }

        let dbUser = await this.prisma.user.findUnique({
          where: { clerkId },
        });

        if (dbUser) {
          // Verify if the salon associated with the user still exists in the database
          const salonExists = await this.prisma.salon.findUnique({
            where: { id: dbUser.salonId },
          });
          if (!salonExists) {
            this.logger.warn(`Stale user found for non-existent salon ID ${dbUser.salonId}. Recreating user...`);
            await this.prisma.user.delete({
              where: { id: dbUser.id },
            });
            dbUser = null;
          }
        }

        if (!dbUser) {
          try {
            // Find default salon first
            let defaultSalon = await this.prisma.salon.findFirst({
              where: { whatsappNumber: '+919999999999' },
            });

            if (!defaultSalon) {
              defaultSalon = await this.prisma.salon.create({
                data: {
                  name: 'Demo Salon',
                  whatsappNumber: '+919999999999',
                  address: '123 Main St, New Delhi',
                  aiPrompt: 'You are Elegance Salon AI assistant. Be friendly and schedule appointments.',
                  subscription: {
                    create: {
                      plan: 'PRO',
                      status: 'ACTIVE',
                    },
                  },
                },
              });
            }

            let uniqueEmail = email;
            const existingEmailUser = await this.prisma.user.findUnique({
              where: { email },
            });
            if (existingEmailUser) {
              uniqueEmail = `${clerkId}@salonsflow.com`;
            }

            dbUser = await this.prisma.user.create({
              data: {
                clerkId,
                name,
                email: uniqueEmail,
                role: targetRole,
                salonId: targetSalonId || defaultSalon.id,
              },
            });
            this.logger.log(
              `Created ${targetRole} User for development bypass with email ${uniqueEmail}`,
            );
          } catch (createErr: any) {
            if (createErr.code === 'P2002') {
              dbUser = await this.prisma.user.findUnique({
                where: { clerkId },
              });
              if (!dbUser) throw createErr;
            } else {
              throw createErr;
            }
          }
        }
        // Self-heal demo/bypass salon subscription, services, and staff on-the-fly
        if (dbUser && dbUser.salonId) {
          await this.selfHealSalon(dbUser.salonId);
        }

        // Attach user info with salonId directly to request
        (request as any).user = {
          sub: clerkId,
          email: dbUser.email,
          role: dbUser.role,
          salonId: dbUser.salonId,
        };

        return true;
      } catch (err) {
        this.logger.error(
          `Failed to handle development bypass database check: ${err.message}`,
        );
        throw new UnauthorizedException(
          'Development authentication bypass failed',
        );
      }
    }

    try {
      // Verify the JWT with Clerk
      const payload = await clerkClient.verifyToken(token);

      // Attach user information to the request object
      (request as any).user = payload;

      return true;
    } catch (err) {
      this.logger.error(`Clerk authentication failed: ${err.message}`);
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }
  }

  private async selfHealSalon(salonId: string) {
    try {
      // 1. Verify/seed active PRO subscription
      const sub = await this.prisma.subscription.findUnique({
        where: { salonId },
      });
      if (!sub) {
        this.logger.warn(`Healing: Creating active PRO subscription for demo salon ${salonId}...`);
        await this.prisma.subscription.create({
          data: {
            salonId,
            plan: 'PRO',
            status: 'ACTIVE',
          },
        });
      } else if (sub.plan !== 'PRO' || sub.status !== 'ACTIVE') {
        this.logger.warn(`Healing: Updating subscription to active PRO for demo salon ${salonId}...`);
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            plan: 'PRO',
            status: 'ACTIVE',
          },
        });
      }

      // 2. Verify/seed default services
      const serviceCount = await this.prisma.service.count({
        where: { salonId },
      });
      if (serviceCount === 0) {
        this.logger.warn(`Healing: Seeding default services for demo salon ${salonId}...`);
        await this.prisma.service.createMany({
          data: [
            { salonId, name: 'Premium Haircut', durationMins: 30, price: 300 },
            { salonId, name: 'Hair Spa', durationMins: 45, price: 1200 },
            { salonId, name: 'Shaving & Styling', durationMins: 20, price: 150 },
            { salonId, name: 'Facial Clean Up', durationMins: 40, price: 500 },
          ],
        });
      }

      // 3. Verify/seed default staff
      const staffCount = await this.prisma.staff.count({
        where: { salonId },
      });
      if (staffCount === 0) {
        this.logger.warn(`Healing: Seeding default staff for demo salon ${salonId}...`);
        await this.prisma.staff.createMany({
          data: [
            { salonId, name: 'Amit Verma', isAvailable: true },
            { salonId, name: 'Neha Sharma', isAvailable: true },
          ],
        });
      }
    } catch (healErr) {
      this.logger.error(`Failed to self-heal default salon data: ${healErr.message}`);
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
