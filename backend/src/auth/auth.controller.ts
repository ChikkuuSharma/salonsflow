import { Controller, Post, Body, Req, UseGuards, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AppService } from '../app.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from './clerk-auth.guard';

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

    let cred = await this.prisma.adminCredential.findUnique({
      where: { adminId },
    });

    // Bootstrap default admin in database on first run if missing
    if (!cred && adminId === 'admin') {
      cred = await this.prisma.adminCredential.create({
        data: { adminId: 'admin', password: 'admin123' },
      });
    }

    if (cred && cred.password === password) {
      return { token: `dev-bypass-token-superadmin-${adminId}` };
    }

    throw new UnauthorizedException('Invalid admin credentials.');
  }

  @Post('super-admin/register')
  async superAdminRegister(@Body() body: any) {
    const { adminId, password, setupKey } = body;
    if (!adminId || !password) {
      throw new UnauthorizedException('Admin ID and Password are required.');
    }

    const adminCount = await this.prisma.adminCredential.count();
    const envSecret = process.env.SUPER_ADMIN_SETUP_SECRET;

    // If super admin accounts already exist, block public self-registration
    if (adminCount > 0) {
      if (!envSecret || setupKey !== envSecret) {
        throw new UnauthorizedException('Public Super Admin registration is disabled. Please contact system administrator.');
      }
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

  @UseGuards(ClerkAuthGuard)
  @Post('super-admin/change-password')
  async superAdminChangePassword(@Req() req: any, @Body() body: any) {
    const { adminId, oldPassword, newPassword } = body;
    if (!adminId || !oldPassword || !newPassword) {
      throw new UnauthorizedException('Admin ID, Old Password, and New Password are required.');
    }

    if (req.user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Super Admin authentication is required to update admin credentials.');
    }

    if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long.');
    }

    const cred = await this.prisma.adminCredential.findUnique({
      where: { adminId },
    });

    if (!cred || cred.password !== oldPassword) {
      throw new UnauthorizedException('Current super admin password is incorrect. Verify old password before updating.');
    }

    await this.prisma.adminCredential.update({
      where: { adminId },
      data: { password: newPassword },
    });
    return { success: true, message: 'Super admin password updated successfully.' };
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

    return {
      success: true,
      token: `dev-bypass-token-user-${user.id}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        salonId: salon.id,
      },
    };
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
    const isSeeded = await this.appService.isDemoSalonSeeded();
    if (!isSeeded) {
      await this.appService.resetAndSeedDemoSalon();
    }
    return { token: 'dev-bypass-token-demo' };
  }

  @Post('demo/reset')
  async demoReset() {
    await this.appService.resetAndSeedDemoSalon();
    return { success: true };
  }
}
