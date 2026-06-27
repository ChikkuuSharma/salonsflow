import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AppService } from '../app.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('super-admin/login')
  async superAdminLogin(@Body() body: any) {
    const { adminId, password } = body;
    if (!adminId || !password) {
      throw new UnauthorizedException('Admin ID and Password are required.');
    }

    const credentialsCount = await this.prisma.adminCredential.count();
    if (credentialsCount === 0) {
      // Fallback to default credentials if none are created yet
      if (adminId === 'admin' && password === 'admin123') {
        return { token: 'dev-bypass-token-superadmin-admin' };
      }
    } else {
      const cred = await this.prisma.adminCredential.findUnique({
        where: { adminId },
      });
      if (cred && cred.password === password) {
        return { token: `dev-bypass-token-superadmin-${adminId}` };
      }
    }
    throw new UnauthorizedException('Invalid admin credentials.');
  }

  @Post('super-admin/register')
  async superAdminRegister(@Body() body: any) {
    const { adminId, password } = body;
    if (!adminId || !password) {
      throw new UnauthorizedException('Admin ID and Password are required.');
    }
    
    const existing = await this.prisma.adminCredential.findUnique({
      where: { adminId },
    });
    if (existing) {
      throw new UnauthorizedException('Admin ID already exists.');
    }

    await this.prisma.adminCredential.create({
      data: { adminId, password },
    });
    return { success: true };
  }

  @Post('super-admin/change-password')
  async superAdminChangePassword(@Body() body: any) {
    const { adminId, oldPassword, newPassword } = body;
    if (!adminId || !oldPassword || !newPassword) {
      throw new UnauthorizedException('Admin ID, Old Password, and New Password are required.');
    }

    const credentialsCount = await this.prisma.adminCredential.count();
    if (credentialsCount === 0) {
      if (adminId === 'admin' && oldPassword === 'admin123') {
        await this.prisma.adminCredential.create({
          data: { adminId, password: newPassword },
        });
        return { success: true };
      }
    } else {
      const cred = await this.prisma.adminCredential.findUnique({
        where: { adminId },
      });
      if (cred && cred.password === oldPassword) {
        await this.prisma.adminCredential.update({
          where: { adminId },
          data: { password: newPassword },
        });
        return { success: true };
      }
    }
    throw new UnauthorizedException('Invalid old admin credentials.');
  }

  @Post('owner/login')
  async ownerLogin(@Body() body: any) {
    const { email, password } = body;
    if (!email || !password) {
      throw new UnauthorizedException('Email and Password are required.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        password,
        role: 'OWNER',
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid owner credentials.');
    }

    return { token: `dev-bypass-token-user-${user.id}` };
  }

  @Post('owner/register')
  async ownerRegister(@Body() body: any) {
    const { name, email, password, salonName, whatsappNumber } = body;
    if (!name || !email || !password || !salonName || !whatsappNumber) {
      throw new UnauthorizedException('All fields (name, email, password, salonName, whatsappNumber) are required.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new UnauthorizedException('Email is already registered.');
    }

    const existingSalon = await this.prisma.salon.findUnique({
      where: { whatsappNumber },
    });
    if (existingSalon) {
      throw new UnauthorizedException('WhatsApp number is already registered to a salon.');
    }

    // Create salon
    const salon = await this.prisma.salon.create({
      data: {
        name: salonName,
        whatsappNumber,
        isProfileComplete: true,
      },
    });

    // Create default subscription plan for the new salon
    await this.prisma.subscription.create({
      data: {
        salonId: salon.id,
        plan: 'FREE',
        status: 'ACTIVE',
      },
    });

    // Create user with OWNER role
    const user = await this.prisma.user.create({
      data: {
        clerkId: `dev-bypass-user-owner-${email}`,
        name,
        email,
        password,
        role: 'OWNER',
        salonId: salon.id,
      },
    });

    return { success: true };
  }

  @Post('owner/change-password')
  async ownerChangePassword(@Body() body: any) {
    const { email, oldPassword, newPassword } = body;
    if (!email || !oldPassword || !newPassword) {
      throw new UnauthorizedException('Email, Old Password, and New Password are required.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        password: oldPassword,
        role: 'OWNER',
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid old owner credentials.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: newPassword },
    });

    return { success: true };
  }

  @Post('demo/login')
  async demoLogin() {
    await this.appService.resetAndSeedDemoSalon();
    return { token: 'dev-bypass-token-demo' };
  }

  @Post('demo/reset')
  async demoReset() {
    await this.appService.resetAndSeedDemoSalon();
    return { success: true };
  }
}
