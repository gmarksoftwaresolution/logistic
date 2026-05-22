import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ApplicationStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getRequests(status?: ApplicationStatus) {
    return this.prisma.user.findMany({
      where: status ? { applicationStatus: status } : {},
      include: {
        address: true,
        drivingDetail: true,
        bankDetails: true,
      },
    });
  }

  async approveRequest(requestId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: requestId },
      include: { drivingDetail: true }
    });

    if (!user) {
      throw new NotFoundException('Application request not found');
    }

    if (user.applicationStatus === ApplicationStatus.APPROVED) {
      throw new BadRequestException('Application already approved');
    }

    if (user.applicationStatus === ApplicationStatus.REJECTED) {
      throw new BadRequestException('Cannot approve a rejected application');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        applicationStatus: ApplicationStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    // Make sure transporter details are saved in the TransporterDetail table upon approval as well
    await this.prisma.transporterDetail.upsert({
      where: { userId: user.id },
      update: {
        transporterCode: user.uniqueCode || updated.uniqueCode,
        experienceYears: user.drivingDetail?.drivingExperience || null
      },
      create: {
        userId: user.id,
        transporterCode: user.uniqueCode || updated.uniqueCode,
        experienceYears: user.drivingDetail?.drivingExperience || null
      }
    });

    return {
      success: true,
      message: 'Application processed successfully',
      transporterId: updated.uniqueCode,
      status: updated.applicationStatus,
    };
  }

  async rejectRequest(requestId: number, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: requestId },
    });

    if (!user) {
      throw new NotFoundException('Application request not found');
    }

    if (
      user.applicationStatus !== ApplicationStatus.PENDING &&
      user.applicationStatus !== ApplicationStatus.UNDER_REVIEW &&
      user.applicationStatus !== ApplicationStatus.COMPLETED
    ) {
      throw new BadRequestException('Application already processed');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        applicationStatus: ApplicationStatus.REJECTED,
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Application processed successfully',
      status: updated.applicationStatus,
    };
  }
}
