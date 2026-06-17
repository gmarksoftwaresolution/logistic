import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  //////////////////////////////////////////////////////
  // NEW CLEAN ARCHITECTURE METHODS
  //////////////////////////////////////////////////////

  private async ensureAssignments(shgId: number) {
    const count = await this.prisma.pickupOrder.count({
      where: { shgId }
    });
    if (count === 0) {
      const totalCount = await this.prisma.pickupOrder.count();
      if (totalCount > 0) {
        console.log(`[Dev Auto-Assign] Assigning all ${totalCount} orders to logged-in SHG ID ${shgId}`);
        await this.prisma.pickupOrder.updateMany({
          data: { shgId }
        });
        await this.prisma.dropOrder.updateMany({
          data: { shgId }
        });
      }
    }
  }

  async getAssignedPickups(shgId: number) {
    await this.ensureAssignments(shgId);
    const pickups = await this.prisma.pickupOrder.findMany({
      where: {
        shgId,
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

    const updatedPickups = await Promise.all(
      pickups.map(async (pickup) => {
        let currentPickup = pickup;
        if ((pickup.status === 'ACCEPTED' || pickup.status === 'PENDING') && !pickup.handoverCode) {
          const generatedCode = '1234';
          currentPickup = await this.prisma.pickupOrder.update({
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
              items: {
                include: {
                  product: true,
                },
              },
              masterOrder: true,
              tracking: true,
            },
          });
        }
        
        return currentPickup;
      })
    );

    return updatedPickups;
  }

  async acceptPickup(pickupOrderId: number, shgId: number) {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { id: pickupOrderId, shgId },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not assigned to this SHG.`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      const nextStatus = pickupOrder.status === 'RETURN_PENDING' ? 'RETURN_ACCEPTED' : 'ACCEPTED';
      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: { status: nextStatus },
      });

      await tx.pickupTracking.create({
        data: {
          pickupOrderId,
          status: nextStatus,
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
        where: {
          masterOrderId: updated.masterOrderId,
          status: 'PENDING',
          OR: [
            { shgId: null },
            { shgId }
          ]
        }
      });

      if (pendingDrops.length > 0) {
        await tx.dropOrder.updateMany({
          where: {
            masterOrderId: updated.masterOrderId,
            status: 'PENDING',
            OR: [
              { shgId: null },
              { shgId }
            ]
          },
          data: {
            status: 'REJECTED',
            shgId
          }
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

  async completePickup(pickupOrderId: number, shgId: number, code?: string) {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { id: pickupOrderId, shgId },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not assigned to this SHG.`);
    }

    if (code !== undefined) {
      const expectedCode = pickupOrder.handoverCode || '1234';
      if (expectedCode !== code) {
        throw new BadRequestException('Invalid verification code');
      }
    }

    return this.prisma.$transaction(async (tx: any) => {
      const nextStatus = pickupOrder.status === 'RETURN_ACCEPTED' ? 'RETURNED' : 'COMPLETED';
      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: {
          status: nextStatus,
          pickupTime: new Date(),
        },
      });

      await tx.pickupTracking.create({
        data: {
          pickupOrderId,
          status: nextStatus,
          remarks: 'Pickup leg completed successfully by SHG.',
        },
      });

      // Auto-accept/pickup associated PENDING/RETURN_PENDING drop orders
      const pendingDrops = await tx.dropOrder.findMany({
        where: {
          masterOrderId: updated.masterOrderId,
          status: { in: ['PENDING', 'RETURN_PENDING'] },
          OR: [
            { shgId: null },
            { shgId }
          ]
        }
      });

      if (pendingDrops.length > 0) {
        for (const drop of pendingDrops) {
          const nextDropStatus = drop.status === 'RETURN_PENDING' ? 'RETURN_PICKED_UP' : 'PICKED_UP';
          await tx.dropOrder.update({
            where: { id: drop.id },
            data: {
              status: nextDropStatus,
              shgId
            }
          });

          await tx.dropTracking.create({
            data: {
              dropOrderId: drop.id,
              status: nextDropStatus,
              remarks: 'Delivery leg auto-picked up upon pickup completion.'
            }
          });
        }
      }

      return updated;
    });
  }

  async getAssignedDrops(shgId: number) {
    await this.ensureAssignments(shgId);
    const drops = await this.prisma.dropOrder.findMany({
      where: {
        shgId,
        status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'COMPLETED', 'REJECTED', 'RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURN_PICKED_UP', 'RETURNED'] },
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
        masterOrder: {
          include: {
            items: {
              include: {
                seller: {
                  include: {
                    address: true,
                  },
                },
              },
            },
          },
        },
        tracking: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const updatedDrops = await Promise.all(
      drops.map(async (drop) => {
        if ((drop.status === 'ACCEPTED' || drop.status === 'PENDING' || drop.status === 'PICKED_UP') && !drop.handoverCode) {
          const generatedCode = '1234';
          const updated = await this.prisma.dropOrder.update({
            where: { id: drop.id },
            data: { handoverCode: generatedCode },
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
              masterOrder: {
                include: {
                  items: {
                    include: {
                      seller: {
                        include: {
                          address: true,
                        },
                      },
                    },
                  },
                },
              },
              tracking: true,
            },
          });
          return updated;
        }
        return drop;
      })
    );

    return updatedDrops.map((drop) => {
      const { handoverCode, ...rest } = drop;
      return rest;
    });
  }

  async acceptDrop(dropOrderId: number, shgId: number) {
    const dropOrder = await this.prisma.dropOrder.findFirst({
      where: { id: dropOrderId, shgId },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not assigned to this SHG.`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      const nextStatus = dropOrder.status === 'RETURN_PENDING' ? 'RETURN_ACCEPTED' : 'ACCEPTED';
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: { status: nextStatus },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: nextStatus,
          remarks: 'Delivery leg accepted by SHG.',
        },
      });

      return updated;
    });
  }

  async pickupDrop(dropOrderId: number, shgId: number, code?: string) {
    const dropOrder = await this.prisma.dropOrder.findFirst({
      where: {
        id: dropOrderId,
        shgId,
        status: { in: ['ACCEPTED', 'RETURN_ACCEPTED'] },
      },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not accepted by this SHG.`);
    }

    if (!code) {
      throw new BadRequestException('Verification code is required');
    }
    const expectedCode = dropOrder.handoverCode || '1234';
    if (expectedCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const nextStatus = dropOrder.status === 'RETURN_ACCEPTED' ? 'RETURN_PICKED_UP' : 'PICKED_UP';
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: { status: nextStatus },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: nextStatus,
          remarks: 'Delivery leg picked up successfully from transporter by SHG.',
        },
      });

      return updated;
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
      const nextStatus = (dropOrder.status === 'RETURN_ACCEPTED' || dropOrder.status === 'RETURN_PICKED_UP') ? 'RETURNED' : 'COMPLETED';
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: { status: nextStatus },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: nextStatus,
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

  async rescheduleOrders(dto: any) {
    const { orderIds, date, time, reason } = dto;
    
    // Parse date and time if possible
    let newDate: Date | null = null;
    try {
      if (date && time) {
        const [dayStr, monthStr, yearStr] = date.trim().split(/\s+/);
        const [hourMin, ampm] = time.trim().split(/\s+/);
        let [hours, minutes] = hourMin.split(':').map(Number);
        if (ampm?.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm?.toUpperCase() === 'AM' && hours === 12) hours = 0;

        const months: Record<string, number> = {
          jan: 0, january: 0,
          feb: 1, february: 1,
          mar: 2, march: 2,
          apr: 3, april: 3,
          may: 4,
          jun: 5, june: 5,
          jul: 6, july: 6,
          aug: 7, august: 7,
          sep: 8, september: 8,
          oct: 9, october: 9,
          nov: 10, november: 10,
          dec: 11, december: 11
        };
        const mKey = monthStr?.toLowerCase().substring(0, 3);
        const month = months[mKey] !== undefined ? months[mKey] : 4;
        newDate = new Date(Number(yearStr || 2026), month, Number(dayStr || 15), hours || 12, minutes || 0);
        if (isNaN(newDate.getTime())) {
          newDate = null;
        }
      }
    } catch (e) {
      console.warn('Failed to parse date/time string, falling back to +1 day shifting:', e);
    }

    return this.prisma.$transaction(async (tx: any) => {
      const results = [];
      for (const id of orderIds) {
        // Check if it's a PickupOrder
        const pickup = await tx.pickupOrder.findUnique({ where: { id } });
        if (pickup) {
          const finalDate = newDate || new Date(pickup.createdAt.getTime() + 24 * 60 * 60 * 1000);
          const updated = await tx.pickupOrder.update({
            where: { id },
            data: { createdAt: finalDate },
          });
          
          await tx.pickupTracking.create({
            data: {
              pickupOrderId: id,
              status: 'PENDING',
              remarks: `Order rescheduled to ${finalDate.toLocaleString()}. Reason: ${reason || 'None'}`,
            },
          });
          results.push({ type: 'pickup', id, updated });
          continue;
        }

        // Check if it's a DropOrder
        const drop = await tx.dropOrder.findUnique({ where: { id } });
        if (drop) {
          const finalDate = newDate || new Date(drop.createdAt.getTime() + 24 * 60 * 60 * 1000);
          const updated = await tx.dropOrder.update({
            where: { id },
            data: { createdAt: finalDate },
          });

          await tx.dropTracking.create({
            data: {
              dropOrderId: id,
              status: 'PENDING',
              remarks: `Order rescheduled to ${finalDate.toLocaleString()}. Reason: ${reason || 'None'}`,
            },
          });
          results.push({ type: 'drop', id, updated });
        }
      }
      return { success: true, count: results.length, details: results };
    });
  }
}
