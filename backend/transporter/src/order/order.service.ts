import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  //////////////////////////////////////////////////////
  // NEW CLEAN ARCHITECTURE METHODS
  //////////////////////////////////////////////////////

  async getAssignedPickups(transporterId: number) {
    return this.prisma.pickupOrder.findMany({
      where: {
        transporterId,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
      include: {
        seller: {
          select: {
            fullName: true,
            phoneNumber: true,
            address: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        masterOrder: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async acceptPickup(pickupOrderId: number, transporterId: number) {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { id: pickupOrderId, transporterId },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not assigned to this transporter.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: { status: 'ACCEPTED' },
      });

      await tx.pickupTracking.create({
        data: {
          pickupOrderId,
          status: 'ACCEPTED',
          remarks: 'Pickup leg accepted by transporter.',
        },
      });

      return updated;
    });
  }

  async completePickup(pickupOrderId: number, transporterId: number) {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { id: pickupOrderId, transporterId },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not assigned to this transporter.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: {
          status: 'COMPLETED',
          pickupTime: new Date(),
        },
      });

      await tx.pickupTracking.create({
        data: {
          pickupOrderId,
          status: 'COMPLETED',
          remarks: 'Pickup leg completed successfully by transporter.',
        },
      });

      return updated;
    });
  }

  async getAssignedDrops(transporterId: number) {
    return this.prisma.dropOrder.findMany({
      where: {
        transporterId,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
      include: {
        buyer: {
          select: {
            fullName: true,
            phoneNumber: true,
            address: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        masterOrder: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async acceptDrop(dropOrderId: number, transporterId: number) {
    const dropOrder = await this.prisma.dropOrder.findFirst({
      where: { id: dropOrderId, transporterId },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not assigned to this transporter.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: { status: 'ACCEPTED' },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: 'ACCEPTED',
          remarks: 'Delivery leg accepted by transporter.',
        },
      });

      return updated;
    });
  }

  async completeDrop(dropOrderId: number, transporterId: number) {
    const dropOrder = await this.prisma.dropOrder.findFirst({
      where: { id: dropOrderId, transporterId },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not assigned to this transporter.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: { status: 'COMPLETED' },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: 'COMPLETED',
          remarks: 'Delivery leg completed successfully by transporter.',
        },
      });

      return updated;
    });
  }
}
