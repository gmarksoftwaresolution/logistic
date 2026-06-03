import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  //////////////////////////////////////////////////////
  // NEW CLEAN ARCHITECTURE METHODS
  //////////////////////////////////////////////////////

  async getAssignedPickups(shgId: number) {
    return this.prisma.pickupOrder.findMany({
      where: {
        shgId,
        status: { in: ['PENDING', 'ACCEPTED', 'REJECTED'] },
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
        tracking: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async acceptPickup(pickupOrderId: number, shgId: number) {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { id: pickupOrderId, shgId },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not assigned to this SHG.`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: { status: 'ACCEPTED' },
      });

      await tx.pickupTracking.create({
        data: {
          pickupOrderId,
          status: 'ACCEPTED',
          remarks: 'Pickup leg accepted by SHG.',
        },
      });

      return updated;
    });
  }

  async rejectPickup(pickupOrderId: number, shgId: number, reason: string = '') {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { id: pickupOrderId, shgId },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not assigned to this SHG.`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: { status: 'REJECTED' },
      });

      await tx.pickupTracking.create({
        data: {
          pickupOrderId,
          status: 'REJECTED',
          remarks: `Pickup leg rejected by SHG. Reason: ${reason}`,
        },
      });

      const pendingDrops = await tx.dropOrder.findMany({
        where: { masterOrderId: updated.masterOrderId, shgId, status: 'PENDING' }
      });

      if (pendingDrops.length > 0) {
        await tx.dropOrder.updateMany({
          where: { masterOrderId: updated.masterOrderId, shgId, status: 'PENDING' },
          data: { status: 'REJECTED' }
        });

        for (const drop of pendingDrops) {
          await tx.dropTracking.create({
            data: {
              dropOrderId: drop.id,
              status: 'REJECTED',
              remarks: `Delivery leg rejected due to pickup rejection. Reason: ${reason}`
            }
          });
        }
      }

      return updated;
    });
  }

  async completePickup(pickupOrderId: number, shgId: number) {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { id: pickupOrderId, shgId },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not assigned to this SHG.`);
    }

    return this.prisma.$transaction(async (tx: any) => {
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
          remarks: 'Pickup leg completed successfully by SHG.',
        },
      });

      // Auto-accept associated PENDING drop orders
      const pendingDrops = await tx.dropOrder.findMany({
        where: { masterOrderId: updated.masterOrderId, shgId, status: 'PENDING' }
      });

      if (pendingDrops.length > 0) {
        await tx.dropOrder.updateMany({
          where: { masterOrderId: updated.masterOrderId, shgId, status: 'PENDING' },
          data: { status: 'ACCEPTED' }
        });

        for (const drop of pendingDrops) {
          await tx.dropTracking.create({
            data: {
              dropOrderId: drop.id,
              status: 'ACCEPTED',
              remarks: 'Delivery leg auto-accepted upon pickup completion.'
            }
          });
        }
      }

      return updated;
    });
  }

  async getAssignedDrops(shgId: number) {
    return this.prisma.dropOrder.findMany({
      where: {
        shgId,
        status: { in: ['ACCEPTED', 'COMPLETED', 'REJECTED'] },
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
        tracking: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }



  async completeDrop(dropOrderId: number, shgId: number) {
    const dropOrder = await this.prisma.dropOrder.findFirst({
      where: { id: dropOrderId, shgId },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not assigned to this SHG.`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: { status: 'COMPLETED' },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: 'COMPLETED',
          remarks: 'Delivery leg completed successfully by SHG.',
        },
      });

      return updated;
    });
  }

  async rejectDrop(dropOrderId: number, shgId: number, reason: string = '') {
    const dropOrder = await this.prisma.dropOrder.findFirst({
      where: { id: dropOrderId, shgId },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not assigned to this SHG.`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: { status: 'REJECTED' },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: 'REJECTED',
          remarks: `Delivery leg rejected by SHG. Reason: ${reason}`,
        },
      });

      return updated;
    });
  }
}
