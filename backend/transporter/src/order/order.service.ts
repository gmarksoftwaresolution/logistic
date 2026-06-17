import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  //////////////////////////////////////////////////////
  // NEW CLEAN ARCHITECTURE METHODS
  //////////////////////////////////////////////////////

  private async ensureAssignments(transporterId: number) {
    // 1. Auto-assign any unassigned orders (transporterId is null) to the logged-in transporter
    const unassignedPickupsCount = await this.prisma.pickupOrder.count({
      where: { transporterId: null }
    });
    if (unassignedPickupsCount > 0) {
      console.log(`[Dev Auto-Assign] Assigning ${unassignedPickupsCount} unassigned pickup orders to logged-in transporter ID ${transporterId}`);
      await this.prisma.pickupOrder.updateMany({
        where: { transporterId: null },
        data: { transporterId }
      });
    }

    const unassignedDropsCount = await this.prisma.dropOrder.count({
      where: { transporterId: null }
    });
    if (unassignedDropsCount > 0) {
      console.log(`[Dev Auto-Assign] Assigning ${unassignedDropsCount} unassigned drop orders to logged-in transporter ID ${transporterId}`);
      await this.prisma.dropOrder.updateMany({
        where: { transporterId: null },
        data: { transporterId }
      });
    }

    // 2. Fallback: if transporter still has 0 assigned pickup orders, assign all existing orders to this transporter
    const count = await this.prisma.pickupOrder.count({
      where: { transporterId }
    });
    if (count === 0) {
      const totalCount = await this.prisma.pickupOrder.count();
      if (totalCount > 0) {
        console.log(`[Dev Auto-Assign Fallback] Assigning all ${totalCount} orders to logged-in transporter ID ${transporterId}`);
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
    const pickups = await this.prisma.pickupOrder.findMany({
      where: {
        OR: [
          { transporterId },
          { transporterId: null },
        ],
        // Include COMPLETED so the frontend can show them in the Drop tab
        status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURNED'] },
      },
      include: {
        seller: {
          select: {
            fullName: true,
            phoneNumber: true,
            address: true,
          },
        },
        shg: {
          include: {
            shgDetail: true,
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

    const updatedPickups = await Promise.all(
      pickups.map(async (pickup) => {
        if ((pickup.status === 'ACCEPTED' || pickup.status === 'PENDING' || pickup.status === 'RETURN_ACCEPTED' || pickup.status === 'RETURN_PENDING') && !pickup.handoverCode) {
          const generatedCode = '1234';
          const updated = await this.prisma.pickupOrder.update({
            where: { id: pickup.id },
            data: { handoverCode: generatedCode },
            include: {
              seller: {
                select: {
                  fullName: true,
                  phoneNumber: true,
                  address: true,
                },
              },
              shg: {
                include: {
                  shgDetail: true,
                },
              },
              items: {
                include: {
                  product: true,
                },
              },
              masterOrder: true,
            },
          });
          return updated;
        }
        return pickup;
      })
    );

    return updatedPickups.map((pickup) => {
      if (pickup.status === 'COMPLETED') {
        return pickup;
      }
      const { handoverCode, ...rest } = pickup;
      return rest;
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
      const generatedCode = '1234';
      const nextStatus = pickupOrder.status === 'RETURN_PENDING' ? 'RETURN_ACCEPTED' : 'ACCEPTED';
      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: { 
          status: nextStatus,
          transporterId, // Align on-the-fly for smooth dev/testing flow
          handoverCode: generatedCode,
        },
      });

      await tx.pickupTracking.create({
        data: {
          pickupOrderId,
          status: nextStatus,
          remarks: 'Pickup leg accepted by transporter.',
        },
      });

      // Automatically accept and assign the associated delivery leg (DropOrder) if it exists and is PENDING
      const associatedDrops = await tx.dropOrder.findMany({
        where: {
          masterOrderId: pickupOrder.masterOrderId,
          status: 'PENDING',
        },
      });

      if (associatedDrops.length > 0) {
        await tx.dropOrder.updateMany({
          where: {
            masterOrderId: pickupOrder.masterOrderId,
            status: 'PENDING',
          },
          data: {
            status: nextStatus === 'RETURN_ACCEPTED' ? 'RETURN_ACCEPTED' : 'ACCEPTED',
            transporterId,
            handoverCode: generatedCode,
          },
        });

        for (const drop of associatedDrops) {
          await tx.dropTracking.create({
            data: {
              dropOrderId: drop.id,
              status: nextStatus === 'RETURN_ACCEPTED' ? 'RETURN_ACCEPTED' : 'ACCEPTED',
              remarks: 'Delivery leg accepted automatically via pickup acceptance.',
            },
          });
        }
      }

      return updated;
    });
  }

  async completePickup(pickupOrderId: number, transporterId: number, code?: string) {
    const pickupOrder = await this.prisma.pickupOrder.findUnique({
      where: { id: pickupOrderId },
      include: { seller: true },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not found.`);
    }

    const isFromGmuHub = pickupOrder.seller?.fullName?.toLowerCase().includes('gmu') || 
                         pickupOrder.seller?.fullName?.toLowerCase().includes('hub') ||
                         pickupOrder.seller?.phoneNumber === '9999999992';

    if (!isFromGmuHub) {
      if (!code) {
        throw new BadRequestException('Verification code is required');
      }
      const expectedCode = pickupOrder.handoverCode || '1234';
      if (expectedCode !== code) {
        throw new BadRequestException('Invalid verification code');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const nextStatus = pickupOrder.status === 'RETURN_ACCEPTED' ? 'RETURNED' : 'COMPLETED';
      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: {
          status: nextStatus,
          pickupTime: new Date(),
          transporterId, // Align on-the-fly for smooth dev/testing flow
        },
      });

      await tx.pickupTracking.create({
        data: {
          pickupOrderId,
          status: nextStatus,
          remarks: 'Pickup leg completed successfully by transporter.',
        },
      });

      return updated;
    });
  }

  async getAssignedDrops(transporterId: number) {
    await this.ensureAssignments(transporterId);
    const drops = await this.prisma.dropOrder.findMany({
      where: {
        OR: [
          { transporterId },
          { transporterId: null },
        ],
        // Include COMPLETED so the frontend can track completed deliveries
        status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'COMPLETED', 'REJECTED', 'RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURN_PICKED_UP', 'RETURNED'] },
      },
      select: {
        id: true,
        dropOrderNumber: true,
        masterOrderId: true,
        buyerId: true,
        shgId: true,
        transporterId: true,
        status: true,
        deliveryAddress: true,
        createdAt: true,
        handoverCode: true,
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

    const updatedDrops = await Promise.all(
      drops.map(async (drop) => {
        let currentDrop = drop;
        if ((drop.status === 'ACCEPTED' || drop.status === 'PENDING' || drop.status === 'RETURN_ACCEPTED' || drop.status === 'RETURN_PENDING') && !drop.handoverCode) {
          const generatedCode = '1234';
          currentDrop = await this.prisma.dropOrder.update({
            where: { id: drop.id },
            data: { handoverCode: generatedCode },
            select: {
              id: true,
              dropOrderNumber: true,
              masterOrderId: true,
              buyerId: true,
              shgId: true,
              transporterId: true,
              status: true,
              deliveryAddress: true,
              createdAt: true,
              handoverCode: true,
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
          });
        }
        
        return currentDrop;
      })
    );

    const mappedDrops = updatedDrops.map((drop) => {
      let finalDrop = drop;
      if (drop.status === 'REJECTED' || drop.status === 'RETURN_PENDING' || drop.status === 'RETURN_ACCEPTED' || drop.status === 'RETURN_PICKED_UP') {
        finalDrop = {
          ...drop,
          status: 'ACCEPTED',
          deliveryAddress: 'Gadhinglaj Hub',
          buyer: {
            fullName: 'Gadhinglaj Hub Contact',
            phoneNumber: '+91 99999 88888',
            address: {
              village: 'Gadhinglaj',
              pincode: '416502',
            }
          }
        };
      } else if (drop.status === 'RETURNED') {
        finalDrop = {
          ...drop,
          status: 'COMPLETED',
        };
      } else if (drop.status === 'PICKED_UP') {
        finalDrop = {
          ...drop,
          status: 'ACCEPTED',
        };
      } else {
        finalDrop = drop;
      }

      const { handoverCode, ...rest } = finalDrop;
      return rest;
    });

    return mappedDrops;
  }



  async completeDrop(dropOrderId: number, transporterId: number, code?: string) {
    const dropOrder = await this.prisma.dropOrder.findUnique({
      where: { id: dropOrderId },
      include: { buyer: true },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not found.`);
    }

    const isReturnDrop = ['REJECTED', 'RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURN_PICKED_UP'].includes(dropOrder.status);

    const isToGmuHub = isReturnDrop ||
                       dropOrder.deliveryAddress?.toLowerCase().includes('gmu') || 
                       dropOrder.deliveryAddress?.toLowerCase().includes('hub') ||
                       dropOrder.buyer?.fullName?.toLowerCase().includes('gmu') ||
                       dropOrder.buyer?.fullName?.toLowerCase().includes('hub') ||
                       dropOrder.buyer?.phoneNumber === '9999999992';

    if (!isToGmuHub) {
      if (!code) {
        throw new BadRequestException('Verification code is required');
      }
      const expectedCode = dropOrder.handoverCode || '5678';
      if (expectedCode !== code) {
        throw new BadRequestException('Invalid verification code');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const nextStatus = (dropOrder.status === 'RETURN_ACCEPTED' || dropOrder.status === 'RETURN_PICKED_UP' || dropOrder.status === 'REJECTED') ? 'RETURNED' : 'COMPLETED';
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: { 
          status: nextStatus,
          transporterId, // Align on-the-fly for smooth dev/testing flow
        },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: nextStatus,
          remarks: 'Delivery leg completed successfully by transporter.',
        },
      });

      return updated;
    });
  }

  async rejectPickup(pickupOrderId: number, transporterId: number, remarks?: string) {
    const pickupOrder = await this.prisma.pickupOrder.findUnique({
      where: { id: pickupOrderId },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not found.`);
    }

    if (pickupOrder.status !== 'PENDING' && pickupOrder.transporterId !== transporterId) {
      throw new BadRequestException('This order is not assigned to you.');
    }

    return this.prisma.$transaction(async (tx) => {
      let nextStatus: string;
      if (pickupOrder.status === 'PENDING') {
        nextStatus = 'REJECTED';
      } else if (pickupOrder.status === 'ACCEPTED') {
        nextStatus = 'REJECTED';
      } else if (pickupOrder.status === 'COMPLETED') {
        nextStatus = 'RETURN_PENDING';
      } else {
        throw new BadRequestException(`Cannot reject order in its current status (${pickupOrder.status})`);
      }

      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: {
          status: nextStatus,
          transporterId,
        },
      });

      await tx.pickupTracking.create({
        data: {
          pickupOrderId,
          status: nextStatus,
          remarks: remarks || `Pickup leg rejected by transporter. Status changed to ${nextStatus}.`,
        },
      });

      // Reject the associated delivery leg (DropOrder) if it exists
      const associatedDrops = await tx.dropOrder.findMany({
        where: {
          masterOrderId: pickupOrder.masterOrderId,
          status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP'] },
        },
      });

      if (associatedDrops.length > 0) {
        await tx.dropOrder.updateMany({
          where: {
            masterOrderId: pickupOrder.masterOrderId,
            status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP'] },
          },
          data: {
            status: nextStatus,
          },
        });

        for (const drop of associatedDrops) {
          await tx.dropTracking.create({
            data: {
              dropOrderId: drop.id,
              status: nextStatus,
              remarks: remarks ? `Delivery leg rejected due to pickup rejection: ${remarks}` : `Delivery leg rejected due to pickup rejection.`,
            },
          });
        }
      }

      return updated;
    });
  }

  async rejectDrop(dropOrderId: number, transporterId: number, remarks?: string) {
    const dropOrder = await this.prisma.dropOrder.findUnique({
      where: { id: dropOrderId },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not found.`);
    }

    if (dropOrder.status !== 'PENDING' && dropOrder.transporterId !== transporterId) {
      throw new BadRequestException('This order is not assigned to you.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Find the associated pickup order to see if it was completed (picked up)
      const associatedPickup = await tx.pickupOrder.findFirst({
        where: { masterOrderId: dropOrder.masterOrderId }
      });
      const isPickupCompleted = associatedPickup?.status === 'COMPLETED';

      let nextStatus: string;
      if (dropOrder.status === 'PENDING') {
        nextStatus = 'REJECTED';
      } else if (dropOrder.status === 'ACCEPTED') {
        nextStatus = isPickupCompleted ? 'RETURN_PENDING' : 'REJECTED';
      } else {
        throw new BadRequestException(`Cannot reject drop order in its current status (${dropOrder.status})`);
      }

      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: {
          status: nextStatus,
          transporterId,
        },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: nextStatus,
          remarks: remarks || `Drop leg rejected by transporter. Status changed to ${nextStatus}.`,
        },
      });

      // Synchronize the associated pickup order status if it hasn't been completed yet
      if (associatedPickup && associatedPickup.status !== 'COMPLETED') {
        await tx.pickupOrder.update({
          where: { id: associatedPickup.id },
          data: { status: nextStatus },
        });

        await tx.pickupTracking.create({
          data: {
            pickupOrderId: associatedPickup.id,
            status: nextStatus,
            remarks: `Pickup leg status synchronized to ${nextStatus} due to drop leg rejection.`,
          },
        });
      }

      return updated;
    });
  }
}


