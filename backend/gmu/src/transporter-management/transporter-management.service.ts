import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransporterManagementService {
  constructor(private prisma: PrismaService) {}

  async getRoutePartnerRequests() {
    return this.prisma.transporterMember.findMany({
      where: { type: 'ROUTE_PARTNER', status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRoutePartnerMembers() {
    return this.prisma.transporterMember.findMany({
      where: { type: 'ROUTE_PARTNER', status: 'APPROVED' },
      orderBy: { approvedAt: 'desc' },
    });
  }

  async getRoutePartnerRejected() {
    return this.prisma.transporterMember.findMany({
      where: { type: 'ROUTE_PARTNER', status: 'REJECTED' },
      orderBy: { rejectedAt: 'desc' },
    });
  }

  async getPersonalRequests() {
    return this.prisma.transporterMember.findMany({
      where: { type: 'PERSONAL', status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPersonalMembers() {
    return this.prisma.transporterMember.findMany({
      where: { type: 'PERSONAL', status: 'APPROVED' },
      orderBy: { approvedAt: 'desc' },
    });
  }

  async getPersonalRejected() {
    return this.prisma.transporterMember.findMany({
      where: { type: 'PERSONAL', status: 'REJECTED' },
      orderBy: { rejectedAt: 'desc' },
    });
  }

  async getTransporterById(id: string) {
    const transporter = await this.prisma.transporterMember.findUnique({
      where: { id },
    });
    if (!transporter) {
      throw new NotFoundException(`Transporter member with ID ${id} not found`);
    }
    return transporter;
  }

  async approveTransporter(id: string) {
    // Check if exists
    await this.getTransporterById(id);

    return this.prisma.transporterMember.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        rejectedAt: null,
      },
    });
  }

  async rejectTransporter(id: string) {
    // Check if exists
    await this.getTransporterById(id);

    return this.prisma.transporterMember.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        approvedAt: null,
      },
    });
  }
}
