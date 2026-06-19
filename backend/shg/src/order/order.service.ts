import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) { }

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

  async getAssignedPickups(shgId: number, mobileNumber?: string) {
    await this.ensureAssignments(shgId);
    
    // 1. Regular Pickup Orders (seller -> SHG)
    const pickups = await this.prisma.pickupOrder.findMany({
      where: {
        shgId,
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

    // 2. Inbound Drop Orders (transporter -> SHG, e.g. GMU -> SHG deliveries where buyerId is the SHG)
    // We treat this as a pickup from the transporter
    const inboundDrops = await this.prisma.dropOrder.findMany({
      where: {
        shgId,
        buyerId: shgId, // Buyer is the SHG
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
        masterOrder: {
          include: {
            pickupOrders: true,
          }
        },
        tracking: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Ensure handover codes are generated for inbound drops
    const updatedInboundDrops = await Promise.all(
      inboundDrops.map(async (drop) => {
        let currentDrop = drop;
        if ((drop.status === 'ACCEPTED' || drop.status === 'PENDING') && !drop.handoverCode) {
          const generatedCode = '1234';
          currentDrop = await this.prisma.dropOrder.update({
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
                  pickupOrders: true,
                }
              },
              tracking: true,
            },
          });
        }
        return currentDrop;
      })
    );

    // Filter inbound drops to only show when the transporter has finished picking it up
    const filteredInboundDrops = updatedInboundDrops.filter((drop) => {
      const pickup = drop.masterOrder?.pickupOrders?.[0];
      if (!pickup) return true;
      return ['COMPLETED', 'RETURNED'].includes(pickup.status);
    });

    // Format both regular pickups and inbound drops to a common response structure
    const formattedPickups = updatedPickups.map(p => ({
      ...p,
      legType: 'pickup',
      sourceType: 'seller',
    }));

    const formattedInboundDrops = filteredInboundDrops.map(d => ({
      id: d.id,
      pickupOrderNumber: d.dropOrderNumber,
      masterOrderId: d.masterOrderId,
      sellerId: d.buyerId, // represent the receiver/SHG
      shgId: d.shgId,
      transporterId: d.transporterId,
      status: d.status,
      pickupTime: null,
      handoverCode: d.handoverCode,
      createdAt: d.createdAt,
      seller: {
        fullName: 'Transporter delivery to SHG',
        phoneNumber: d.buyer?.phoneNumber || '',
        address: d.buyer?.address || null,
      },
      items: d.items,
      masterOrder: d.masterOrder,
      tracking: d.tracking,
      legType: 'drop',
      sourceType: 'transporter',
    }));

    return [...formattedPickups, ...formattedInboundDrops];
  }

  async acceptPickup(pickupOrderId: number, shgId: number) {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { id: pickupOrderId, shgId },
    });

    if (!pickupOrder) {
      const dropOrder = await this.prisma.dropOrder.findFirst({
        where: { id: pickupOrderId, shgId },
      });
      if (dropOrder) {
        return this.acceptDrop(pickupOrderId, shgId);
      }
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

  async rejectPickup(pickupOrderId: number, shgId: number, reason: string = '') {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { id: pickupOrderId, shgId },
    });

    if (!pickupOrder) {
      const dropOrder = await this.prisma.dropOrder.findFirst({
        where: { id: pickupOrderId, shgId },
      });
      if (dropOrder) {
        return this.rejectDrop(pickupOrderId, shgId, reason);
      }
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

      const activeDrops = await tx.dropOrder.findMany({
        where: {
          masterOrderId: updated.masterOrderId,
          status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP'] },
          OR: [
            { shgId: null },
            { shgId }
          ]
        }
      });

      if (activeDrops.length > 0) {
        await tx.dropOrder.updateMany({
          where: {
            masterOrderId: updated.masterOrderId,
            status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP'] },
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

        for (const drop of activeDrops) {
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
      const dropOrder = await this.prisma.dropOrder.findFirst({
        where: { id: pickupOrderId, shgId },
      });
      if (dropOrder) {
        return this.pickupDrop(pickupOrderId, shgId, code);
      }
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not assigned to this SHG.`);
    }

    if (!code) {
      throw new BadRequestException('Verification code is required');
    }
    const expectedCode = pickupOrder.handoverCode || '1234';
    if (expectedCode !== code) {
      throw new BadRequestException('Invalid verification code');
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

  async getAssignedDrops(shgId: number, mobileNumber?: string) {
    await this.ensureAssignments(shgId);
    
    // Outbound Drop Orders (SHG -> buyer/transporter)
    // Here, the buyer is NOT the SHG (buyerId !== shgId)
    const drops = await this.prisma.dropOrder.findMany({
      where: {
        shgId,
        buyerId: { not: shgId }, // Only outbound deliveries
        status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'COMPLETED', 'REJECTED'] },
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
            pickupOrders: true,
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
                  pickupOrders: true,
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

    // Filter to only show drops to SHG after the transporter has finished picking it up
    return updatedDrops.filter((drop) => {
      if (['PICKED_UP', 'COMPLETED'].includes(drop.status)) {
        return true;
      }
      const pickup = drop.masterOrder?.pickupOrders?.[0];
      if (!pickup) return true;
      return ['COMPLETED', 'RETURNED'].includes(pickup.status);
    });
  }

  async getAssignedReturns(shgId: number) {
    // 1. Return Pickups (Transporter/buyer returning to SHG)
    // This includes DropOrders in return statuses where buyerId === shgId
    const returnPickups = await this.prisma.dropOrder.findMany({
      where: {
        shgId,
        buyerId: shgId,
        status: { in: ['RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURN_PICKED_UP', 'RETURNED'] },
      },
      include: {
        buyer: {
          select: {
            fullName: true,
            phoneNumber: true,
            address: true,
          },
        },
        shg: {
          select: {
            fullName: true,
            phoneNumber: true,
            address: true,
          },
        },
        transporter: {
          select: {
            fullName: true,
            phoneNumber: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        masterOrder: {
          include: {
            pickupOrders: true,
          }
        },
        tracking: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 2. Return Drops (SHG returning to seller/hub)
    // This includes DropOrders in return statuses where buyerId !== shgId
    const returnDrops = await this.prisma.dropOrder.findMany({
      where: {
        shgId,
        buyerId: { not: shgId },
        status: { in: ['RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURN_PICKED_UP', 'RETURNED'] },
      },
      include: {
        buyer: {
          select: {
            fullName: true,
            phoneNumber: true,
            address: true,
          },
        },
        shg: {
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
            pickupOrders: true,
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

    const formattedReturnPickups = returnPickups.map(d => {
      const transporterName = d.transporter?.fullName || 'Transporter';
      const transporterMobile = d.transporter?.phoneNumber || '';
      return {
        ...d,
        legType: 'pickup',
        sourceType: 'transporter',
        transporterName,
        transporterMobile,
        seller: {
          fullName: transporterName,
          phoneNumber: transporterMobile,
          address: {
            addressLine1: 'Transporter',
            addressLine2: null,
            village: null,
            district: null,
          } as any,
        },
        buyer: {
          fullName: d.shg?.fullName || 'SHG Hub',
          phoneNumber: d.shg?.phoneNumber || '',
          address: d.shg?.address || null,
        },
      };
    });

    const formattedReturnDrops = returnDrops.map(d => {
      const firstItem = d.masterOrder?.items?.[0];
      const sellerInfo = firstItem?.seller;
      const sellerAddress = sellerInfo?.address || null;
      return {
        ...d,
        legType: 'drop',
        sourceType: 'seller',
        deliveryAddress: sellerAddress ? `${sellerAddress.addressLine1 || ''}, ${sellerAddress.village || ''}`.trim() : 'Seller',
        seller: {
          fullName: d.shg?.fullName || 'SHG Hub',
          phoneNumber: d.shg?.phoneNumber || '',
          address: {
            addressLine1: 'Transporter',
            addressLine2: null,
            village: null,
            district: null,
          } as any,
        },
        buyer: {
          fullName: sellerInfo?.fullName || 'Seller',
          phoneNumber: sellerInfo?.phoneNumber || '',
          address: sellerAddress,
        },
      };
    });

    return [...formattedReturnPickups, ...formattedReturnDrops];
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

    const associatedPickup = await this.prisma.pickupOrder.findFirst({
      where: { masterOrderId: dropOrder.masterOrderId }
    });
    const expectedCode = associatedPickup?.handoverCode || '1234';
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

  async completeDrop(dropOrderId: number, shgId: number, code?: string) {
    const dropOrder = await this.prisma.dropOrder.findFirst({
      where: { id: dropOrderId, shgId },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not assigned to this SHG.`);
    }

    const associatedPickup = await this.prisma.pickupOrder.findFirst({
      where: { masterOrderId: dropOrder.masterOrderId }
    });
    const expectedCode = associatedPickup?.handoverCode || '1234';

    if (!code) {
      throw new BadRequestException('Verification code is required');
    }
    if (expectedCode !== code) {
      throw new BadRequestException('Invalid verification code');
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
      const associatedPickup = await tx.pickupOrder.findFirst({
        where: { masterOrderId: dropOrder.masterOrderId }
      });
      const isPickupCompleted = associatedPickup?.status === 'COMPLETED';

      // Check if rejection window (24 hours) has expired for picked-up/received drop orders
      if (['PICKED_UP', 'RETURN_PICKED_UP'].includes(dropOrder.status)) {
        const tracking = await tx.dropTracking.findFirst({
          where: {
            dropOrderId,
            status: { in: ['PICKED_UP', 'RETURN_PICKED_UP'] }
          },
          orderBy: { updatedAt: 'desc' }
        });
        if (tracking) {
          const now = new Date();
          const diffMs = now.getTime() - tracking.updatedAt.getTime();
          const limitMs = 24 * 60 * 60 * 1000; // 24 hours
          if (diffMs > limitMs) {
            throw new BadRequestException('Rejection window of 24 hours has expired. You must deliver this order.');
          }
        }
      }

      let nextStatus = 'REJECTED';
      if (['PICKED_UP', 'RETURN_PICKED_UP'].includes(dropOrder.status)) {
        nextStatus = 'RETURN_PENDING';
      }

      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: { status: nextStatus },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: nextStatus,
          remarks: `Delivery leg rejected by SHG. Reason: ${reason}`,
        },
      });

      // Synchronize associated pickup if not completed yet and we are rejecting the drop
      if (associatedPickup && associatedPickup.status !== 'COMPLETED' && nextStatus === 'REJECTED') {
        await tx.pickupOrder.update({
          where: { id: associatedPickup.id },
          data: { status: 'REJECTED' },
        });
        await tx.pickupTracking.create({
          data: {
            pickupOrderId: associatedPickup.id,
            status: 'REJECTED',
            remarks: `Pickup leg rejected due to delivery leg rejection. Reason: ${reason}`,
          },
        });
      }

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
      const now = new Date();

      for (const id of orderIds) {
        // Check if it's a PickupOrder
        const pickup = await tx.pickupOrder.findUnique({ where: { id } });
        if (pickup) {
          if (['COMPLETED', 'RETURNED', 'REJECTED'].includes(pickup.status)) {
            throw new BadRequestException(`Order ${pickup.pickupOrderNumber} is already completed/rejected and cannot be rescheduled.`);
          }

          if (['ACCEPTED', 'RETURN_ACCEPTED'].includes(pickup.status)) {
            const tracking = await tx.pickupTracking.findFirst({
              where: {
                pickupOrderId: id,
                status: { in: ['ACCEPTED', 'RETURN_ACCEPTED'] }
              },
              orderBy: { updatedAt: 'desc' }
            });
            if (tracking) {
              const diffMs = now.getTime() - tracking.updatedAt.getTime();
              const limitMs = 2 * 60 * 60 * 1000; // 2 hours
              if (diffMs > limitMs) {
                throw new BadRequestException(`Reschedule window of 2 hours has expired for accepted order ${pickup.pickupOrderNumber}.`);
              }
            }
          }

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
          if (['COMPLETED', 'RETURNED', 'REJECTED'].includes(drop.status)) {
            throw new BadRequestException(`Order ${drop.dropOrderNumber} is already completed/rejected and cannot be rescheduled.`);
          }

          if (['ACCEPTED', 'RETURN_ACCEPTED'].includes(drop.status)) {
            const tracking = await tx.dropTracking.findFirst({
              where: {
                dropOrderId: id,
                status: { in: ['ACCEPTED', 'RETURN_ACCEPTED'] }
              },
              orderBy: { updatedAt: 'desc' }
            });
            if (tracking) {
              const diffMs = now.getTime() - tracking.updatedAt.getTime();
              const limitMs = 2 * 60 * 60 * 1000; // 2 hours
              if (diffMs > limitMs) {
                throw new BadRequestException(`Reschedule window of 2 hours has expired for accepted order ${drop.dropOrderNumber}.`);
              }
            }
          }

          if (['PICKED_UP', 'RETURN_PICKED_UP'].includes(drop.status)) {
            const tracking = await tx.dropTracking.findFirst({
              where: {
                dropOrderId: id,
                status: { in: ['PICKED_UP', 'RETURN_PICKED_UP'] }
              },
              orderBy: { updatedAt: 'desc' }
            });
            if (tracking) {
              const diffMs = now.getTime() - tracking.updatedAt.getTime();
              const limitMs = 24 * 60 * 60 * 1000; // 24 hours
              if (diffMs > limitMs) {
                throw new BadRequestException(`Reschedule window of 24 hours has expired for picked up order ${drop.dropOrderNumber}.`);
              }
            }
          }

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
