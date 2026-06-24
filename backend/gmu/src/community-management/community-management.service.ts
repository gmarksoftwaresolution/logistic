import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunityManagementService {
  constructor(private prisma: PrismaService) {}

  async getShgRequests() {
    return this.prisma.communityMember.findMany({
      where: { type: 'SHG', status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getShgMembers() {
    return this.prisma.communityMember.findMany({
      where: { type: 'SHG', status: 'APPROVED' },
      orderBy: { approvedAt: 'desc' },
    });
  }

  async getShgRejected() {
    return this.prisma.communityMember.findMany({
      where: { type: 'SHG', status: 'REJECTED' },
      orderBy: { rejectedAt: 'desc' },
    });
  }

  async getIndividualRequests() {
    return this.prisma.communityMember.findMany({
      where: { type: 'INDIVIDUAL', status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getIndividualMembers() {
    return this.prisma.communityMember.findMany({
      where: { type: 'INDIVIDUAL', status: 'APPROVED' },
      orderBy: { approvedAt: 'desc' },
    });
  }

  async getIndividualRejected() {
    return this.prisma.communityMember.findMany({
      where: { type: 'INDIVIDUAL', status: 'REJECTED' },
      orderBy: { rejectedAt: 'desc' },
    });
  }

  async getMemberById(id: string) {
    const member = await this.prisma.communityMember.findUnique({
      where: { id },
    });
    if (!member) {
      throw new NotFoundException(`Community member with ID ${id} not found`);
    }
    return member;
  }

  async approveMember(id: string) {
    // Check if member exists
    await this.getMemberById(id);

    return this.prisma.communityMember.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        rejectedAt: null,
      },
    });
  }

  async rejectMember(id: string) {
    // Check if member exists
    await this.getMemberById(id);

    return this.prisma.communityMember.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        approvedAt: null,
      },
    });
  }
}
