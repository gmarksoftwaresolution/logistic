import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApplicationService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: number) {
    const application = await this.prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            fullName: true,
            role: true,
            currentStep: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found. Please complete signup first.');
    }

    let message = 'Application is under review.';
    if (application.status === 'PENDING') {
      message = 'Your application is under review. Expected response within 24-48 hours.';
    } else if (application.status === 'APPROVED') {
      message = 'Your application has been approved! Welcome aboard.';
    } else if (application.status === 'REJECTED') {
      message = 'Your application was not approved. Please contact support for details.';
    }

    return {
      success: true,
      requestId: application.id,
      status: application.status,
      message,
      applicant: {
        fullName: application.user.fullName,
        userType: application.user.role,
      },
      createdAt: application.createdAt,
    };
  }
}
