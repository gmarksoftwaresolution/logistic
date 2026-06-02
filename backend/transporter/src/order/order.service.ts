import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  //////////////////////////////////////////////////////
  // NEW CLEAN ARCHITECTURE METHODS
  //////////////////////////////////////////////////////

  private async ensureAssignments(transporterId: number) {
    const count = await this.prisma.pickupOrder.count({
      where: { transporterId }
    });
    if (count === 0) {
      const totalCount = await this.prisma.pickupOrder.count();
      if (totalCount > 0) {
        console.log(`[Dev Auto-Assign] Assigning all ${totalCount} orders to logged-in transporter ID ${transporterId}`);
        await this.prisma.pickupOrder.updateMany({
          data: { transporterId }
        });
        await this.prisma.dropOrder.updateMany({
          data: { transporterId }
        });
      }
    }
  }

  async getAssignedPickups(transporterId: number) {
    await this.ensureAssignments(transporterId);
    return this.prisma.pickupOrder.findMany({
      where: {
        transporterId,
        // Include COMPLETED so the frontend can show them in the Drop tab
        status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED'] },
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
    const pickupOrder = await this.prisma.pickupOrder.findUnique({
      where: { id: pickupOrderId },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: { 
          status: 'ACCEPTED',
          transporterId, // Align on-the-fly for smooth dev/testing flow
        },
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
    const pickupOrder = await this.prisma.pickupOrder.findUnique({
      where: { id: pickupOrderId },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: {
          status: 'COMPLETED',
          pickupTime: new Date(),
          transporterId, // Align on-the-fly for smooth dev/testing flow
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
    await this.ensureAssignments(transporterId);
    return this.prisma.dropOrder.findMany({
      where: {
        transporterId,
        // Include COMPLETED so the frontend can track completed deliveries
        status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED'] },
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
    const dropOrder = await this.prisma.dropOrder.findUnique({
      where: { id: dropOrderId },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: { 
          status: 'ACCEPTED',
          transporterId, // Align on-the-fly for smooth dev/testing flow
        },
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
    const dropOrder = await this.prisma.dropOrder.findUnique({
      where: { id: dropOrderId },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: { 
          status: 'COMPLETED',
          transporterId, // Align on-the-fly for smooth dev/testing flow
        },
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
