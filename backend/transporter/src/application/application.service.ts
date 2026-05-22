import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ApplicationService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Application not found');
    }

    return {
      applicationStatus: user.applicationStatus,
      transporterId: user.uniqueCode || 'PENDING',
      requestId: user.id, // Replaced integer requestId with UUID
      rejectionReason: user.rejectionReason,
      currentStep: `STEP_${user.currentStep}`,
    };
  }
}
