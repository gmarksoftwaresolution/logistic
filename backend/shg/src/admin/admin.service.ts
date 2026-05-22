import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationStatus } from '@prisma/client';
import { RejectRequestDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }

  async getPendingRequests(status?: ApplicationStatus, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [requests, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              fullName: true,
              role: true,
              profilePhoto: true,
              uniqueCode: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      success: true,
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approveRequest(requestId: number) {
    const application = await this.prisma.application.findUnique({
      where: { id: requestId },
    });

    if (!application) {
      throw new NotFoundException(`Request/User with ID ${requestId} not found`);
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(`Request is already ${application.status.toLowerCase()}`);
    }

    // Update Application status
    await this.prisma.application.update({
      where: { id: requestId },
      data: {
        status: ApplicationStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Request approved successfully',
    };
  }

  async rejectRequest(requestId: number, dto: RejectRequestDto) {
    const application = await this.prisma.application.findUnique({
      where: { id: requestId },
    });

    if (!application) {
      throw new NotFoundException(`Request/User with ID ${requestId} not found`);
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(`Request is already ${application.status.toLowerCase()}`);
    }

    await this.prisma.application.update({
      where: { id: requestId },
      data: {
        status: ApplicationStatus.REJECTED,
        rejectionReason: dto.reason,
        rejectedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Request rejected successfully',
    };
  }
}
