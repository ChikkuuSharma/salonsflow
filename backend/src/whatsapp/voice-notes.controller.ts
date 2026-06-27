import {
  Controller,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/voice-notes')
@UseGuards(ClerkAuthGuard)
export class VoiceNotesController {
  constructor(private readonly prisma: PrismaService) {}

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
  async getVoiceNotes(@Req() req: any) {
    const salonId = await this.getSalonId(req);
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
