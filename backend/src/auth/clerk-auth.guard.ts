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

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
