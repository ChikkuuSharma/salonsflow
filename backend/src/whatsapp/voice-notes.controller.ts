import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SalonId } from '../auth/salon-id.decorator';

@Controller('api/v1/voice-notes')
@UseGuards(ClerkAuthGuard)
export class VoiceNotesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getVoiceNotes(@SalonId() salonId: string) {
    return this.prisma.voiceNote.findMany({
      where: {
        message: {
          conversation: {
            salonId,
          },
        },
      },
      include: {
        message: {
          include: {
            conversation: {
              include: {
                customer: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
