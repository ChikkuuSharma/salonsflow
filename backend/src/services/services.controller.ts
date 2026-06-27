import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Req,
  Param,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@Controller('api/v1/services')
@UseGuards(ClerkAuthGuard)
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Securely extract SalonId with User fallback lookup
   */
  private async getSalonId(req: any): Promise<string> {
    let salonId = req.user?.salonId;
    if (!salonId) {
      const dbUser = await this.prisma.user.findUnique({
        where: { clerkId: req.user.sub },
      });
      if (!dbUser) {
        throw new UnauthorizedException('User record not found in database.');
      }
      salonId = dbUser.salonId;
    }
    return salonId;
  }

  @Get()
  async findAll(@Req() req: any) {
    const salonId = await this.getSalonId(req);
    return this.servicesService.findAll(salonId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const salonId = await this.getSalonId(req);
    return this.servicesService.findOne(id, salonId);
  }

  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      price: number;
      durationMins: number;
      isActive?: boolean;
    },
  ) {
    const salonId = await this.getSalonId(req);
    return this.servicesService.create(salonId, body);
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      price?: number;
      durationMins?: number;
      isActive?: boolean;
    },
  ) {
    const salonId = await this.getSalonId(req);
    return this.servicesService.update(id, salonId, body);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const salonId = await this.getSalonId(req);
    return this.servicesService.remove(id, salonId);
  }
}
