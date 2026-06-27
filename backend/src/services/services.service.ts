import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    salonId: string,
    data: { name: string; price: number; durationMins: number; isActive?: boolean },
  ) {
    if (!data.name || data.price === undefined || data.durationMins === undefined) {
      throw new BadRequestException('Missing name, price, or durationMins parameter.');
    }

    return this.prisma.service.create({
      data: {
        salonId,
        name: data.name,
        price: data.price,
        durationMins: data.durationMins,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findAll(salonId: string) {
    return this.prisma.service.findMany({
      where: { salonId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, salonId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, salonId },
    });

    if (!service) {
      throw new NotFoundException('Service not found or unauthorized.');
    }

    return service;
  }

  async update(
    id: string,
    salonId: string,
    data: { name?: string; price?: number; durationMins?: number; isActive?: boolean },
  ) {
    // Confirm service exists and belongs to the tenant first (IDOR validation)
    await this.findOne(id, salonId);

    return this.prisma.service.update({
      where: { id },
      data: {
        name: data.name,
        price: data.price,
        durationMins: data.durationMins,
        isActive: data.isActive,
      },
    });
  }

  async remove(id: string, salonId: string) {
    // Confirm service exists and belongs to the tenant first (IDOR validation)
    await this.findOne(id, salonId);

    // Guard: Check for appointments references to prevent cascading data loss
    const appointmentsCount = await this.prisma.appointment.count({
      where: { serviceId: id },
    });

    if (appointmentsCount > 0) {
      throw new BadRequestException(
        'Cannot delete service because it is referenced by existing appointments. Please disable it instead.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Clean up rebooking rules
      await tx.rebookingRule.deleteMany({
        where: { serviceId: id },
      });

      // Clean up rebooking recommendations
      await tx.rebookingRecommendation.deleteMany({
        where: { serviceId: id },
      });

      // Clean up commission rates mapped to this service
      await tx.commission.deleteMany({
        where: { serviceId: id },
      });

      // Clean up staff services mapped to this service
      await tx.staffService.deleteMany({
        where: { serviceId: id },
      });

      // Clean up waiting list entries for this service
      await tx.waitingList.deleteMany({
        where: { serviceId: id },
      });

      // Finally, delete the service
      return tx.service.delete({
        where: { id },
      });
    });
  }
}
