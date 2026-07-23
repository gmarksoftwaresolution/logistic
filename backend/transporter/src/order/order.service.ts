import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  //////////////////////////////////////////////////////
  // NEW CLEAN ARCHITECTURE METHODS
  //////////////////////////////////////////////////////

  private async ensureAssignments(transporterId: number) {
    // Disabled to support proper route-based OrderAssignment matching.
  }

  async getAssignedPickups(transporterId: number) {
    await this.ensureAssignments(transporterId);

    const user = await this.prisma.user.findUnique({
      where: { id: transporterId }
    });
    if (!user || user.role !== 'TRANSPORTER' || user.applicationStatus !== 'APPROVED') {
      return [];
    }

    const routeDetail = await this.prisma.routeDetail.findUnique({
      where: { userId: transporterId }
    });

    const milkVanDetail = await this.prisma.milkVanDetail.findUnique({
      where: { userId: transporterId }
    });

    const transporterUuid = String(transporterId);

    const parseJsonArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { }
      }
      return [];
    };

    const areas = routeDetail?.operatingArea
      ? routeDetail.operatingArea.split(',').map((s: string) => s.trim().toLowerCase())
      : [];

    const mvVillages = milkVanDetail ? parseJsonArray(milkVanDetail.assignedVillages) : [];
    const assignedVillages = (mvVillages.length > 0 ? mvVillages : areas).map((s: string) => s.toLowerCase());

    const assignedPincodes = [
      ...(routeDetail ? parseJsonArray(routeDetail.pickupLocations) : [])
    ].map((s: string) => s.toLowerCase());

    const matchesRoute = (pincode: string, village: string) => {
      const p = pincode?.trim()?.toLowerCase();
      const v = village?.trim()?.toLowerCase();
      const villageMatched = v && (
        assignedVillages.some(av => av.split(' (')[0] === v) || 
        areas.some(a => a.split(' (')[0] === v)
      );
      const pincodeMatched = p && (
        assignedPincodes.some(ap => ap.split(' (')[0] === p) || 
        areas.some(a => a.split(' (')[0] === p)
      );
      return !!(villageMatched || pincodeMatched);
    };

    let assignedPickupOrderIds: string[] = [];
    if (transporterUuid) {
      const transporterAssignments = await this.prisma.$queryRawUnsafe(`
        SELECT o."orderId" 
        FROM public."OrderAssignment" oa
        JOIN public."Order" o ON oa."orderId" = o.id
        WHERE oa."assigneeId" = $1 AND oa.role = 'PICKUP' AND oa."assigneeType" = 'TRANSPORTER' AND oa.status IN ('PENDING', 'ACCEPTED', 'COMPLETED') AND o.phase = 'PICKUP';
      `, transporterUuid) as any[];
      assignedPickupOrderIds = transporterAssignments.map(a => a.orderId);
    }

    const pickups = await this.prisma.pickupOrder.findMany({
      where: {
        masterOrder: {
          orderNumber: { in: assignedPickupOrderIds }
        },
        status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURNED'] },
      },
      include: {
        seller: {
          select: {
            sellerName: true,
            mobileNumber: true,
            addressLine1: true,
            addressLine2: true,
            village: true,
            taluka: true,
            district: true,
            pincode: true,
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
        masterOrder: {
          include: {
            dropOrders: {
              include: {
                tracking: {
                  orderBy: { updatedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        tracking: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const filteredPickups = [];
    for (const pickup of pickups) {
      if (pickup.transporterId === transporterId) {
        filteredPickups.push(pickup);
      } else if (pickup.transporterId === null) {
        // Must be completed (picked up by SHG) and match transporter's operating area
        if (pickup.status === 'COMPLETED' || pickup.status === 'RETURNED') {
          // Check gmu.Order mainStatus
          const gmuOrders = await this.prisma.$queryRawUnsafe(`
            SELECT id, "mainStatus", "pickupTransporterStatus" FROM public."Order" WHERE "orderId" = $1 AND phase = 'PICKUP' LIMIT 1;
          `, pickup.masterOrder.orderNumber) as any[];
          if (gmuOrders.length > 0) {
            const orderUuid = gmuOrders[0].id;
            const mainStatus = gmuOrders[0].mainStatus;
            const pickupTransporterStatus = gmuOrders[0].pickupTransporterStatus;

            if (pickupTransporterStatus === 'ACCEPTED' || pickupTransporterStatus === 'TRANSPORTER_ACCEPTED' || pickupTransporterStatus === 'IN_TRANSIT_TO_HUB' || pickupTransporterStatus === 'PICKED') {
              continue;
            }

            // Check if there is a PENDING assignment for this transporter
            const assignments = await this.prisma.$queryRawUnsafe(`
              SELECT id FROM public."OrderAssignment"
              WHERE "orderId" = $1 AND "assigneeId" = $2 AND role = 'PICKUP' AND "assigneeType" = 'TRANSPORTER' AND status = 'PENDING' LIMIT 1;
            `, orderUuid, transporterUuid) as any[];

            if (assignments.length > 0) {
              if (mainStatus === 'PARCEL_AT_SHG' || mainStatus === 'RETURN_PARCEL_AT_SHG') {
                if (matchesRoute(pickup.seller.pincode, pickup.seller.village)) {
                  filteredPickups.push(pickup);
                }
              }
            }
          }
        }
      }
    }

    const updatedPickups = [];
    for (const p of filteredPickups) {
      const gmuOrders = await this.prisma.$queryRawUnsafe(`
        SELECT "pickupTransporterStatus", "mainStatus" FROM public."Order" WHERE "orderId" = $1 AND phase = 'PICKUP' LIMIT 1;
      `, p.masterOrder.orderNumber) as any[];
      const pickupTransporterStatus = gmuOrders?.[0]?.pickupTransporterStatus || null;
      const mainStatus = gmuOrders?.[0]?.mainStatus || null;

      updatedPickups.push({
        ...p,
        pickupTransporterStatus,
        mainStatus,
        seller: p.seller ? {
          fullName: p.seller.sellerName,
          phoneNumber: p.seller.mobileNumber,
          address: {
            houseNo: p.seller.addressLine1 || '',
            village: p.seller.village,
            taluka: p.seller.taluka,
            district: p.seller.district,
            pincode: p.seller.pincode,
          }
        } : null
      });
    }

    return updatedPickups;
  }

  async acceptPickup(pickupOrderId: number, transporterId: number) {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: {
        id: pickupOrderId,
        OR: [
          { transporterId },
          { transporterId: null }
        ]
      },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not found.`);
    }

    if (pickupOrder.transporterId === transporterId && (pickupOrder.status === 'ACCEPTED' || pickupOrder.status === 'RETURN_ACCEPTED')) {
      return pickupOrder;
    }

    const allowedStatuses = ['PENDING', 'RETURN_PENDING', 'COMPLETED', 'RETURNED'];
    if (!allowedStatuses.includes(pickupOrder.status)) {
      throw new BadRequestException(`Cannot accept pickup order in its current status (${pickupOrder.status}).`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Find Transporter UUID from gmu schema
      const user = await tx.user.findUnique({ where: { id: transporterId } });
      const transporterUuid = String(transporterId);

      // Find order number
      const masterOrder = await tx.masterOrder.findUnique({
        where: { id: pickupOrder.masterOrderId }
      });

      // Find gmu.Order UUID and verify First Accept Wins
      const gmuOrders = await tx.$queryRawUnsafe(`
        SELECT id, "pickupTransporterStatus" FROM public."Order" WHERE "orderId" = $1 AND phase = 'PICKUP' LIMIT 1;
      `, masterOrder.orderNumber) as any[];
      if (gmuOrders.length === 0) {
        throw new NotFoundException(`Order ${masterOrder.orderNumber} not found in GMU hub.`);
      }
      const orderUuid = gmuOrders[0].id;
      if (gmuOrders[0].pickupTransporterStatus === 'ACCEPTED' || gmuOrders[0].pickupTransporterStatus === 'PICKED') {
        throw new BadRequestException('This order pickup has already been accepted by another Transporter.');
      }

      const generatedCode = '1234';
      const isReturn = pickupOrder.status === 'RETURN_PENDING' || pickupOrder.status === 'RETURNED';
      const nextStatus = isReturn ? 'RETURN_ACCEPTED' : 'ACCEPTED';
      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: {
          status: nextStatus,
          transporterId,
          handoverCode: null,
        },
      });

      await tx.pickupTracking.create({
        data: {
          pickupOrderId,
          status: nextStatus,
          remarks: 'Pickup leg accepted by transporter.',
        },
      });

      // Update OrderAssignment of this transporter to ACCEPTED for all roles
      if (transporterUuid) {
        await tx.$executeRawUnsafe(`
          UPDATE public."OrderAssignment"
          SET status = 'ACCEPTED', "updatedAt" = NOW()
          WHERE "orderId" = $1 AND "assigneeId" = $2 AND "assigneeType" = 'TRANSPORTER';
        `, orderUuid, transporterUuid);

        // Cancel other pending Transporter assignments for this order (both roles)
        await tx.$executeRawUnsafe(`
          UPDATE public."OrderAssignment"
          SET status = 'CANCELLED', "updatedAt" = NOW()
          WHERE "orderId" = $1 AND "assigneeType" = 'TRANSPORTER' AND "assigneeId" <> $2 AND status = 'PENDING';
        `, orderUuid, transporterUuid);
      }

      // Update gmu.Order status
      const nextGmuStatus = isReturn ? 'RETURN_TRANSPORTER_ACCEPTED' : 'PICKUP_TRANSPORTER_ACCEPTED';
      await tx.$executeRawUnsafe(`
        UPDATE public."Order"
        SET "pickupTransporterId" = $1, "pickupTransporterStatus" = $2, "mainStatus" = $3, "updatedAt" = NOW()
        WHERE id = $4;
      `, transporterUuid, 'ACCEPTED', nextGmuStatus, orderUuid);

      // Update public.master_orders status
      await tx.masterOrder.update({
        where: { id: pickupOrder.masterOrderId },
        data: { status: nextGmuStatus },
      });

      // Automatically accept and assign the associated delivery leg (DropOrder) if it exists and is PENDING
      // (Disabled in separated phase architecture)
      /*
      const associatedDrops = await tx.dropOrder.findMany({
        where: {
          masterOrderId: pickupOrder.masterOrderId,
          status: { in: ['PENDING', 'RETURN_PENDING'] },
        },
      });

      if (associatedDrops.length > 0) {
        await tx.dropOrder.updateMany({
          where: {
            masterOrderId: pickupOrder.masterOrderId,
            status: { in: ['PENDING', 'RETURN_PENDING'] },
          },
          data: {
            status: isReturn ? 'RETURN_ACCEPTED' : 'ACCEPTED',
            transporterId,
            handoverCode: null,
          },
        });

        for (const drop of associatedDrops) {
          await tx.dropTracking.create({
            data: {
              dropOrderId: drop.id,
              status: isReturn ? 'RETURN_ACCEPTED' : 'ACCEPTED',
              remarks: 'Delivery leg accepted automatically via pickup acceptance.',
            },
          });
        }
      }
      */

      return updated;
    });
  }

  async acceptDrop(dropOrderId: number, transporterId: number) {
    const dropOrder = await this.prisma.dropOrder.findFirst({
      where: {
        id: dropOrderId,
        OR: [
          { transporterId },
          { transporterId: null }
        ]
      },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not found.`);
    }

    if (dropOrder.transporterId === transporterId && (dropOrder.status === 'ACCEPTED' || dropOrder.status === 'RETURN_ACCEPTED')) {
      return dropOrder;
    }

    const allowedStatuses = ['PENDING', 'RETURN_PENDING', 'ACCEPTED', 'RETURN_ACCEPTED'];
    if (!allowedStatuses.includes(dropOrder.status)) {
      throw new BadRequestException(`Cannot accept drop order in its current status (${dropOrder.status}). It must be PENDING, RETURN_PENDING, ACCEPTED, or RETURN_ACCEPTED.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Find Transporter UUID from gmu schema
      const user = await tx.user.findUnique({ where: { id: transporterId } });
      const transporterUuid = String(transporterId);

      // Find order number
      const masterOrder = await tx.masterOrder.findUnique({
        where: { id: dropOrder.masterOrderId }
      });

      // Find gmu.Order UUID and verify First Accept Wins
      const gmuOrders = await tx.$queryRawUnsafe(`
        SELECT id, "dropTransporterStatus" FROM public."Order" WHERE "orderId" = $1 AND (phase = 'DROP' OR (phase = 'PICKUP' AND NOT EXISTS (SELECT 1 FROM public."Order" WHERE "orderId" = $1 AND phase = 'DROP'))) LIMIT 1;
      `, masterOrder.orderNumber) as any[];
      if (gmuOrders.length === 0) {
        throw new NotFoundException(`Order ${masterOrder.orderNumber} not found in GMU hub.`);
      }
      const orderUuid = gmuOrders[0].id;
      if (gmuOrders[0].dropTransporterStatus === 'ACCEPTED' || gmuOrders[0].dropTransporterStatus === 'DELIVERED_TO_GMU') {
        throw new BadRequestException('This order drop-off has already been accepted by another Transporter.');
      }

      const generatedCode = '1234';
      const isReturn = dropOrder.status === 'RETURN_PENDING';
      const nextStatus = isReturn ? 'RETURN_ACCEPTED' : 'ACCEPTED';
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: {
          status: nextStatus,
          transporterId,
          handoverCode: null,
        },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: nextStatus,
          remarks: 'Delivery leg accepted by transporter.',
        },
      });

      // Update OrderAssignment of this transporter to ACCEPTED for all roles
      if (transporterUuid) {
        await tx.$executeRawUnsafe(`
          UPDATE public."OrderAssignment"
          SET status = 'ACCEPTED', "updatedAt" = NOW()
          WHERE "orderId" = $1 AND "assigneeId" = $2 AND "assigneeType" = 'TRANSPORTER';
        `, orderUuid, transporterUuid);

        // Cancel other pending Transporter assignments for this order (both roles)
        await tx.$executeRawUnsafe(`
          UPDATE public."OrderAssignment"
          SET status = 'CANCELLED', "updatedAt" = NOW()
          WHERE "orderId" = $1 AND "assigneeType" = 'TRANSPORTER' AND "assigneeId" <> $2 AND status = 'PENDING';
        `, orderUuid, transporterUuid);
      }

      // Update gmu.Order status
      const nextGmuStatus = isReturn ? 'RETURN_TRANSPORTER_ACCEPTED' : 'DROP_TRANSPORTER_ACCEPTED';
      await tx.$executeRawUnsafe(`
        UPDATE public."Order"
        SET "dropTransporterId" = $1, "dropTransporterStatus" = $2, "mainStatus" = $3, "updatedAt" = NOW()
        WHERE id = $4;
      `, transporterUuid, 'ACCEPTED', nextGmuStatus, orderUuid);

      // Update public.master_orders status
      await tx.masterOrder.update({
        where: { id: dropOrder.masterOrderId },
        data: { status: nextGmuStatus },
      });

      // Automatically accept and assign the associated pickup leg (PickupOrder) if it exists and is PENDING
      // (Disabled in separated phase architecture)
      /*
      const associatedPickups = await tx.pickupOrder.findMany({
        where: {
          masterOrderId: dropOrder.masterOrderId,
          status: { in: ['PENDING', 'RETURN_PENDING'] },
        },
      });

      if (associatedPickups.length > 0) {
        await tx.pickupOrder.updateMany({
          where: {
            masterOrderId: dropOrder.masterOrderId,
            status: { in: ['PENDING', 'RETURN_PENDING'] },
          },
          data: {
            status: isReturn ? 'RETURN_ACCEPTED' : 'ACCEPTED',
            transporterId,
            handoverCode: null,
          },
        });

        for (const pickup of associatedPickups) {
          await tx.pickupTracking.create({
            data: {
              pickupOrderId: pickup.id,
              status: isReturn ? 'RETURN_ACCEPTED' : 'ACCEPTED',
              remarks: 'Pickup leg accepted automatically via drop acceptance.',
            },
          });
        }
      }
      */

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

    if (pickupOrder.status !== 'ACCEPTED' && pickupOrder.status !== 'RETURN_ACCEPTED') {
      throw new BadRequestException(`Cannot complete pickup order in its current status (${pickupOrder.status}). It must be ACCEPTED or RETURN_ACCEPTED.`);
    }

    const sellerName = pickupOrder.seller?.sellerName || '';
    const sellerPhone = pickupOrder.seller?.mobileNumber || '';
    const isFromGmuHub = sellerName.toLowerCase().includes('gmu') ||
      sellerName.toLowerCase().includes('hub') ||
      sellerPhone === '9999999992';

    if (!isFromGmuHub) {
      const items = await this.prisma.pickupOrderItem.findMany({
        where: { pickupOrderId }
      });
      const allVerified = items.every(item => item.verificationStatus === 'VERIFIED');
      if (!allVerified) {
        throw new BadRequestException('Handover verification not completed by the SHG yet. Please ask the SHG to verify all product codes.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Find order number
      const masterOrder = await tx.masterOrder.findUnique({
        where: { id: pickupOrder.masterOrderId }
      });

      const rawGmuOrder = await tx.$queryRawUnsafe(`
        SELECT id, "pickupShgStatus" FROM public."Order" WHERE "orderId" = $1 AND phase = 'PICKUP' LIMIT 1;
      `, masterOrder.orderNumber) as any[];

      let shgDropped = false;
      let orderUuid = null;
      if (rawGmuOrder.length > 0) {
        orderUuid = rawGmuOrder[0].id;
        shgDropped = ['DROPPED', 'RETURNED'].includes(rawGmuOrder[0].pickupShgStatus);
      }

      if (!shgDropped) {
        throw new BadRequestException('The SHG has not submitted the handover delivery yet. Please wait for the SHG to submit.');
      }

      const isReturn = pickupOrder.status === 'RETURN_ACCEPTED';
      const nextStatus = isReturn ? 'RETURNED' : 'COMPLETED';

      let updated;
      if (shgDropped) {
        // Both complete!
        const nextGmuStatus = isReturn ? 'RETURN_IN_TRANSIT_TO_HUB' : 'IN_TRANSIT_TO_HUB';

        updated = await tx.pickupOrder.update({
          where: { id: pickupOrderId },
          data: {
            status: nextStatus,
            pickupTime: new Date(),
            transporterId,
          },
        });

        await tx.$executeRawUnsafe(`
          UPDATE public."Order"
          SET "pickupTransporterStatus" = 'PICKED', "mainStatus" = $1, "updatedAt" = NOW()
          WHERE "orderId" = $2 AND phase = 'PICKUP';
        `, nextGmuStatus, masterOrder.orderNumber);

        await tx.masterOrder.update({
          where: { id: pickupOrder.masterOrderId },
          data: { status: nextGmuStatus },
        });

        if (orderUuid) {
          await tx.$executeRawUnsafe(`
            UPDATE public."OrderAssignment"
            SET status = 'COMPLETED', "updatedAt" = NOW()
            WHERE "orderId" = $1 AND role = 'PICKUP' AND "assigneeType" = 'TRANSPORTER';
          `, orderUuid);
        }

        await tx.pickupTracking.create({
          data: {
            pickupOrderId,
            status: nextStatus,
            remarks: 'Pickup leg completed successfully by transporter.',
          },
        });
      } else {
        // Only transporter has completed
        const nextGmuStatus = isReturn ? 'RETURN_PARCEL_AT_TRANSPORTER' : 'PARCEL_AT_TRANSPORTER';

        updated = await tx.pickupOrder.update({
          where: { id: pickupOrderId },
          data: {
            pickupTime: new Date(),
            transporterId,
          },
        });

        await tx.$executeRawUnsafe(`
          UPDATE public."Order"
          SET "pickupTransporterStatus" = 'PICKED', "mainStatus" = $1, "updatedAt" = NOW()
          WHERE "orderId" = $2 AND phase = 'PICKUP';
        `, nextGmuStatus, masterOrder.orderNumber);

        await tx.masterOrder.update({
          where: { id: pickupOrder.masterOrderId },
          data: { status: nextGmuStatus },
        });

        await tx.pickupTracking.create({
          data: {
            pickupOrderId,
            status: pickupOrder.status,
            remarks: 'Package picked up by transporter. Awaiting SHG drop confirmation.',
          },
        });
      }

      // Automatically transition any associated PENDING drop orders to ACCEPTED and assign to the transporter
      // (Disabled in separated phase architecture)
      // const associatedDrops = await tx.dropOrder.findMany({
      //   where: {
      //     masterOrderId: pickupOrder.masterOrderId,
      //     status: 'PENDING',
      //   },
      // });
      //
      // if (associatedDrops.length > 0) {
      //   await tx.dropOrder.updateMany({
      //     where: {
      //       masterOrderId: pickupOrder.masterOrderId,
      //       status: 'PENDING',
      //     },
      //     data: {
      //       status: isReturn ? 'RETURN_ACCEPTED' : 'ACCEPTED',
      //       transporterId,
      //     },
      //   });
      //
      //   for (const drop of associatedDrops) {
      //     await tx.dropTracking.create({
      //       data: {
      //         dropOrderId: drop.id,
      //         status: isReturn ? 'RETURN_ACCEPTED' : 'ACCEPTED',
      //         remarks: 'Delivery leg accepted automatically via pickup completion.',
      //       },
      //     });
      //   }
      // }

      return updated;
    });
  }

  async getAssignedDrops(transporterId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: transporterId }
    });
    if (!user || user.role !== 'TRANSPORTER' || user.applicationStatus !== 'APPROVED') {
      return [];
    }

    const routeDetail = await this.prisma.routeDetail.findUnique({
      where: { userId: transporterId }
    });

    const milkVanDetail = await this.prisma.milkVanDetail.findUnique({
      where: { userId: transporterId }
    });

    const transporterUuid = String(transporterId);

    const parseJsonArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { }
      }
      return [];
    };

    const areas = routeDetail?.operatingArea
      ? routeDetail.operatingArea.split(',').map((s: string) => s.trim().toLowerCase())
      : [];

    const mvVillages = milkVanDetail ? parseJsonArray(milkVanDetail.assignedVillages) : [];
    const assignedVillages = (mvVillages.length > 0 ? mvVillages : areas).map((s: string) => s.toLowerCase());

    const assignedPincodes = [
      ...(routeDetail ? parseJsonArray(routeDetail.pickupLocations) : [])
    ].map((s: string) => s.toLowerCase());

    const matchesRoute = (pincode: string, village: string, taluka: string, district: string) => {
      if (pincode && (assignedPincodes.some(ap => ap.split(' (')[0] === pincode.toLowerCase()) || areas.some(a => a.split(' (')[0] === pincode.toLowerCase()))) return true;
      if (village && (assignedVillages.some(av => av.split(' (')[0] === village.toLowerCase()) || areas.some(a => a.split(' (')[0] === village.toLowerCase()))) return true;
      if (taluka && areas.some(a => a.split(' (')[0] === taluka.toLowerCase())) return true;
      if (district && areas.some(a => a.split(' (')[0] === district.toLowerCase())) return true;
      return false;
    };
    const pendingCodesDrops = await this.prisma.dropOrder.findMany({
      where: {
        OR: [
          { transporterId },
          { transporterId: null },
        ],
        status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURN_PICKED_UP'] },
        items: {
          some: {
            verificationCode: null
          }
        }
      },
      select: { id: true }
    });

    for (const d of pendingCodesDrops) {
      await this.ensureDropOrderCodes(d.id);
    }

    const drops = await this.prisma.dropOrder.findMany({
      where: {
        OR: [
          { transporterId },
          { transporterId: null },
        ],
        status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'COMPLETED', 'REJECTED', 'RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURN_PICKED_UP', 'RETURNED', 'DELIVERED'] },
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
        buyer: true,
        shg: {
          select: {
            fullName: true,
            phoneNumber: true,
            address: true,
            shgDetail: {
              select: {
                shgName: true,
              }
            }
          }
        },
        items: {
          include: {
            product: true,
          },
        },
        masterOrder: {
          include: {
            pickupOrders: {
              include: {
                seller: true,
                tracking: {
                  orderBy: { updatedAt: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        tracking: {
          orderBy: { updatedAt: 'desc' },
          take: 1
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const filteredDrops = [];
    for (const drop of drops) {
      if (drop.transporterId === transporterId) {
        filteredDrops.push(drop);
      } else if (drop.transporterId === null) {
        // Must check if there is a pending drop/return assignment in OrderAssignment for this transporter
        const gmuOrders = await this.prisma.$queryRawUnsafe(`
          SELECT id, "dropTransporterStatus" FROM public."Order" WHERE "orderId" = $1 AND (phase = 'DROP' OR (phase = 'PICKUP' AND NOT EXISTS (SELECT 1 FROM public."Order" WHERE "orderId" = $1 AND phase = 'DROP'))) LIMIT 1;
        `, drop.masterOrder.orderNumber) as any[];
        if (gmuOrders.length > 0) {
          const orderUuid = gmuOrders[0].id;
          const dropTransporterStatus = gmuOrders[0].dropTransporterStatus;

          if (dropTransporterStatus === 'ACCEPTED' || dropTransporterStatus === 'DROP_TRANSPORTER_ACCEPTED' || dropTransporterStatus === 'COMPLETED' || dropTransporterStatus === 'DELIVERED_TO_GMU' || dropTransporterStatus === 'RETURNED') {
            continue;
          }

          const isReturn = drop.status === 'RETURN_PENDING' || drop.status === 'RETURN_PICKED_UP' || drop.status === 'RETURNED';
          const role = isReturn ? 'RETURN' : 'DROP';

          const assignments = await this.prisma.$queryRawUnsafe(`
            SELECT id FROM public."OrderAssignment"
            WHERE "orderId" = $1 AND "assigneeId" = $2 AND role = $3 AND "assigneeType" = 'TRANSPORTER' AND status = 'PENDING' LIMIT 1;
          `, orderUuid, transporterUuid, role) as any[];

          if (assignments.length > 0) {
            // Must match transporter's operating routes
            if (drop.buyer && matchesRoute(drop.buyer.pincode, drop.buyer.village, drop.buyer.taluka, drop.buyer.district)) {
              filteredDrops.push(drop);
            }
          }
        }
      }
    }

    const updatedDrops = filteredDrops;

    const mappedDrops = updatedDrops.map((drop) => {
      const mappedBuyer = drop.buyer ? {
        fullName: drop.buyer.buyerName,
        phoneNumber: drop.buyer.mobileNumber,
        address: {
          houseNo: drop.buyer.addressLine1 || '',
          village: drop.buyer.village,
          taluka: drop.buyer.taluka,
          district: drop.buyer.district,
          pincode: drop.buyer.pincode,
        }
      } : null;

      const mappedShg = drop.shg ? {
        fullName: drop.shg.fullName,
        phoneNumber: drop.shg.phoneNumber,
        address: drop.shg.address ? {
          addressLine1: drop.shg.address.houseNo || drop.shg.address.deliveryAddress || '',
          village: drop.shg.address.village || '',
          taluka: drop.shg.address.taluka || '',
          district: drop.shg.address.district || '',
          pincode: drop.shg.address.pincode || '',
        } : null
      } : null;

      let finalDrop: any = {
        ...drop,
        buyer: mappedBuyer,
        shg: mappedShg,
      };

      if (drop.status === 'RETURN_PENDING' || drop.status === 'RETURN_ACCEPTED' || drop.status === 'RETURN_PICKED_UP' || drop.status === 'RETURNED') {
        const nextStatus = drop.status === 'RETURNED' ? 'COMPLETED' : 'ACCEPTED';

        const associatedPickup = drop.masterOrder?.pickupOrders?.[0];
        const pickupSeller = associatedPickup?.seller;

        let dynamicAddress = 'Gadhinglaj Hub';
        let dynamicFullName = 'Gadhinglaj Hub Contact';
        let dynamicPhoneNumber = '+91 99999 88888';
        let dynamicVillage = 'Gadhinglaj';
        let dynamicPincode = '416502';

        const sellerName = (pickupSeller as any)?.sellerName || '';
        const sellerPhone = (pickupSeller as any)?.mobileNumber || '';

        const isPickupFromHub = sellerName.toLowerCase().includes('gmu') ||
          sellerName.toLowerCase().includes('hub') ||
          sellerPhone === '9999999992';

        if (pickupSeller && isPickupFromHub) {
          dynamicFullName = (pickupSeller as any).sellerName || dynamicFullName;
          dynamicPhoneNumber = (pickupSeller as any).mobileNumber || dynamicPhoneNumber;

          dynamicAddress = (pickupSeller as any).addressLine1 || dynamicAddress;
          dynamicVillage = (pickupSeller as any).village || dynamicVillage;
          dynamicPincode = (pickupSeller as any).pincode || dynamicPincode;
        } else {
          const isDropToHub = drop.deliveryAddress?.toLowerCase().includes('gmu') ||
            drop.deliveryAddress?.toLowerCase().includes('hub') ||
            mappedBuyer?.fullName?.toLowerCase().includes('gmu') ||
            mappedBuyer?.fullName?.toLowerCase().includes('hub') ||
            mappedBuyer?.phoneNumber === '9999999992';

          if (isDropToHub && mappedBuyer) {
            dynamicFullName = mappedBuyer.fullName || dynamicFullName;
            dynamicPhoneNumber = mappedBuyer.phoneNumber || dynamicPhoneNumber;
            dynamicAddress = drop.deliveryAddress || dynamicAddress;
            dynamicVillage = mappedBuyer.address?.village || dynamicVillage;
            dynamicPincode = mappedBuyer.address?.pincode || dynamicPincode;
          }
        }

        finalDrop = {
          ...finalDrop,
          status: nextStatus,
          isRTO: true,
          deliveryAddress: dynamicAddress,
          buyer: {
            fullName: dynamicFullName,
            phoneNumber: dynamicPhoneNumber,
            address: {
              village: dynamicVillage,
              pincode: dynamicPincode,
            } as any
          }
        };
      } else if (drop.status === 'PICKED_UP') {
        finalDrop = {
          ...finalDrop,
          status: 'ACCEPTED',
        };
      }

      return finalDrop;
    });

    return mappedDrops;
  }



  async ensureDropOrderCodes(dropOrderId: number, txInput?: any) {
    const tx = txInput || this.prisma;
    const dropOrder = await tx.dropOrder.findUnique({
      where: { id: dropOrderId },
      include: { items: true },
    });
    if (!dropOrder || dropOrder.items.length === 0) return;

    let generated = dropOrder.items.find((item: any) => item.verificationCode)?.verificationCode;
    if (!generated) {
      generated = String(Math.floor(1000 + Math.random() * 9000));
    }

    for (const item of dropOrder.items) {
      if (!item.verificationCode) {
        await tx.dropOrderItem.update({
          where: { id: item.id },
          data: {
            verificationCode: generated,
            generatedTime: new Date(),
            verificationStatus: 'PENDING',
          },
        });
      }
    }
  }

  async generateDropHandoverCode(dropOrderId: number, transporterId: number) {
    const dropOrder = await this.prisma.dropOrder.findUnique({
      where: { id: dropOrderId },
    });
    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not found.`);
    }

    const code = String(Math.floor(1000 + Math.random() * 9000));
    const updated = await this.prisma.dropOrder.update({
      where: { id: dropOrderId },
      data: { handoverCode: code },
    });

    return { handoverCode: code };
  }

  async completeDrop(dropOrderId: number, transporterId: number, code?: string) {
    const dropOrder = await this.prisma.dropOrder.findUnique({
      where: { id: dropOrderId },
      include: { buyer: true },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not found.`);
    }

    const allowedStatuses = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURN_PICKED_UP', 'REJECTED'];
    if (!allowedStatuses.includes(dropOrder.status)) {
      throw new BadRequestException(`Cannot complete drop order in its current status (${dropOrder.status}).`);
    }

    const isReturnDrop = ['REJECTED', 'RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURN_PICKED_UP'].includes(dropOrder.status);

    const isToGmuHub = isReturnDrop ||
      dropOrder.deliveryAddress?.toLowerCase().includes('gmu') ||
      dropOrder.deliveryAddress?.toLowerCase().includes('hub') ||
      dropOrder.buyer?.buyerName?.toLowerCase().includes('gmu') ||
      dropOrder.buyer?.buyerName?.toLowerCase().includes('hub') ||
      dropOrder.buyer?.mobileNumber === '9999999992';

    if (!isToGmuHub) {
      const expectedBarcode = dropOrder.handoverCode;
      if (!code || code !== expectedBarcode) {
        throw new BadRequestException(`Barcode scan verification failed. Expected ${expectedBarcode || 'a valid barcode'}, received ${code || 'none'}.`);
      }

      const masterOrder = await this.prisma.masterOrder.findUnique({
        where: { id: dropOrder.masterOrderId }
      });

      await this.prisma.$executeRawUnsafe(`
        INSERT INTO public."ScanHistory" (
          "orderId", "barcode", "scanType", "scanLocation", "scannedBy", "userRole", "scanResult"
        ) VALUES ($1, $2, 'Drop', 'SHG Location', $3, 'TRANSPORTER', 'SUCCESS');
      `, masterOrder.id.toString(), code, transporterId);
    }

    return this.prisma.$transaction(async (tx) => {
      const nextStatus = isReturnDrop ? 'RETURNED' : (isToGmuHub ? 'COMPLETED' : 'DELIVERED');
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
          remarks: isToGmuHub
            ? 'Delivery leg completed successfully by transporter.'
            : 'Delivery leg handed over to Drop SHG successfully.',
        },
      });

      // Find order number
      const masterOrder = await tx.masterOrder.findUnique({
        where: { id: dropOrder.masterOrderId }
      });

      // Update gmu.Order status and mainStatus
      const nextGmuStatus = isReturnDrop
        ? (isToGmuHub ? 'RETURN_PARCEL_AT_GMU' : 'RETURNED')
        : (isToGmuHub ? 'PARCEL_AT_GMU' : 'PARCEL_AT_DROP_SHG');
      const pickupTransporterStatus = isToGmuHub ? 'DROPPED' : 'COMPLETED';
      const dropTransporterStatus = isToGmuHub ? 'DROPPED' : (isReturnDrop ? 'DELIVERED_TO_GMU' : 'DELIVERED');

      await tx.$executeRawUnsafe(`
        UPDATE public."Order"
        SET "pickupTransporterStatus" = $1, 
            "dropTransporterStatus" = $2, 
            "mainStatus" = CASE WHEN "mainStatus" = 'DELIVERED' THEN 'DELIVERED' ELSE $3 END, 
            "updatedAt" = NOW()
        WHERE "orderId" = $4 AND (phase = 'DROP' OR (phase = 'PICKUP' AND NOT EXISTS (SELECT 1 FROM public."Order" WHERE "orderId" = $4 AND phase = 'DROP')));
      `, pickupTransporterStatus, dropTransporterStatus, nextGmuStatus, masterOrder.orderNumber);

      // Disable drop creation trigger in transporter service (moved to GMU warehouse storage transition)
      // if (isToGmuHub) {
      //   await this.autoBroadcastDropShg(tx, dropOrder.masterOrderId, masterOrder.orderNumber);
      // }

      // Find the gmu.Order UUID and update assignments
      const rawGmuOrder = await tx.$queryRawUnsafe(`
        SELECT id FROM public."Order" WHERE "orderId" = $1 AND (phase = 'DROP' OR (phase = 'PICKUP' AND NOT EXISTS (SELECT 1 FROM public."Order" WHERE "orderId" = $1 AND phase = 'DROP'))) LIMIT 1;
      `, masterOrder.orderNumber) as any[];

      if (rawGmuOrder.length > 0) {
        const orderUuid = rawGmuOrder[0].id;
        await tx.$executeRawUnsafe(`
          UPDATE public."OrderAssignment"
          SET status = 'COMPLETED', "updatedAt" = NOW()
          WHERE "orderId" = $1 AND "assigneeType" = 'TRANSPORTER';
        `, orderUuid);
      }

      // Update public.pickup_orders and tracking if applicable
      const pickupOrder = await tx.pickupOrder.findFirst({
        where: { masterOrderId: dropOrder.masterOrderId }
      });
      if (pickupOrder) {
        await tx.pickupOrder.update({
          where: { id: pickupOrder.id },
          data: { status: 'COMPLETED' }
        });

        await tx.pickupTracking.create({
          data: {
            pickupOrderId: pickupOrder.id,
            status: 'COMPLETED',
            remarks: 'Package delivered to GMU Hub successfully.'
          }
        });
      }

      // Update public.master_orders status
      await tx.masterOrder.update({
        where: { id: dropOrder.masterOrderId },
        data: { status: nextGmuStatus },
      });

      return updated;
    });
  }

  async completeDropPickup(dropOrderId: number, transporterId: number, code?: string) {
    const dropOrder = await this.prisma.dropOrder.findUnique({
      where: { id: dropOrderId },
      include: { buyer: true },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not found.`);
    }

    const allowedStatuses = ['ACCEPTED', 'RETURN_ACCEPTED', 'DISPATCHED'];
    if (!allowedStatuses.includes(dropOrder.status)) {
      throw new BadRequestException(`Cannot pick up drop order in its current status (${dropOrder.status}). It must be ACCEPTED or RETURN_ACCEPTED.`);
    }

    // Barcode scan verification bypassed as per client request

    return this.prisma.$transaction(async (tx) => {
      const isReturn = dropOrder.status === 'RETURN_ACCEPTED';
      const nextStatus = isReturn ? 'RETURN_PICKED_UP' : 'PICKED_UP';

      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: {
          status: nextStatus,
        },
      });

      const nextGmuStatus = isReturn ? 'RETURN_PARCEL_AT_TRANSPORTER' : 'PARCEL_AT_TRANSPORTER';

      const masterOrder = await tx.masterOrder.findUnique({
        where: { id: dropOrder.masterOrderId }
      });

      await tx.$executeRawUnsafe(`
        UPDATE public."Order"
        SET "dropTransporterStatus" = 'PICKED', 
            "mainStatus" = $1, 
            "updatedAt" = NOW()
        WHERE "orderId" = $2 AND (phase = 'DROP' OR (phase = 'PICKUP' AND NOT EXISTS (SELECT 1 FROM public."Order" WHERE "orderId" = $2 AND phase = 'DROP')));
      `, nextGmuStatus, masterOrder.orderNumber);

      await tx.masterOrder.update({
        where: { id: dropOrder.masterOrderId },
        data: { status: nextGmuStatus },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: nextStatus,
          remarks: 'Parcel picked up from GMU Hub by transporter.',
        },
      });

      await tx.$executeRawUnsafe(`
        INSERT INTO public."ScanHistory" (
          "orderId", "barcode", "scanType", "scanLocation", "scannedBy", "userRole", "scanResult"
        ) VALUES ($1, $2, 'Pickup', 'GMU Hub Dispatch Area', $3, 'TRANSPORTER', 'SUCCESS');
      `, masterOrder.id.toString(), code, transporterId);

      return updated;
    }, {
      maxWait: 10000,
      timeout: 30000
    });
  }

  async rejectPickup(pickupOrderId: number, transporterId: number, remarks?: string) {
    const pickupOrder = await this.prisma.pickupOrder.findUnique({
      where: { id: pickupOrderId },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not found.`);
    }

    // Idempotent success if already rejected/returned
    if (pickupOrder.status === 'REJECTED' || pickupOrder.status === 'RETURN_PENDING') {
      return pickupOrder;
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

    // Idempotent success if already rejected/returned
    if (dropOrder.status === 'REJECTED' || dropOrder.status === 'RETURN_PENDING') {
      return dropOrder;
    }

    if (dropOrder.status !== 'PENDING' && dropOrder.transporterId !== transporterId) {
      throw new BadRequestException('This order is not assigned to you.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Find the associated pickup order to see if it was completed (picked up)
      const associatedPickup = await tx.pickupOrder.findFirst({
        where: { masterOrderId: dropOrder.masterOrderId }
      });
      const isPickupCompleted = associatedPickup?.status === 'COMPLETED' || dropOrder.status === 'PICKED_UP' || dropOrder.status === 'ACCEPTED';

      let nextStatus: string;
      if (dropOrder.status === 'PENDING') {
        nextStatus = 'REJECTED';
      } else if (dropOrder.status === 'ACCEPTED' || dropOrder.status === 'PICKED_UP') {
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

  async completePickupDrop(pickupOrderId: number, transporterId: number) {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { id: pickupOrderId, transporterId },
    });

    if (!pickupOrder) {
      throw new NotFoundException(`Pickup order with ID ${pickupOrderId} not assigned to this transporter.`);
    }

    const masterOrder = await this.prisma.masterOrder.findUnique({
      where: { id: pickupOrder.masterOrderId }
    });

    if (!masterOrder) {
      throw new NotFoundException(`Master order for pickup order ${pickupOrderId} not found.`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Update the pickup order status to COMPLETED
      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: { status: 'COMPLETED' },
      });

      // 2. Update gmu.Order status and mainStatus
      const nextGmuStatus = (pickupOrder.status === 'RETURN_PENDING' || pickupOrder.status === 'RETURN_ACCEPTED' || pickupOrder.status === 'RETURNED')
        ? 'RETURN_PARCEL_AT_HUB'
        : 'PARCEL_AT_HUB';
      const pickupTransporterStatus = 'DROPPED';

      await tx.$executeRawUnsafe(`
        UPDATE public."Order"
        SET "pickupTransporterStatus" = $1, 
            "mainStatus" = $2, 
            "updatedAt" = NOW()
        WHERE "orderId" = $3 AND phase = 'PICKUP';
      `, pickupTransporterStatus, nextGmuStatus, masterOrder.orderNumber);

      // Disable auto-broadcasting drop leg inside transporter completion methods (moved to GMU warehouse storage transition)
      // await this.autoBroadcastDropShg(tx, pickupOrder.masterOrderId, masterOrder.orderNumber);

      // 3. Update public.master_orders status
      await tx.masterOrder.update({
        where: { id: pickupOrder.masterOrderId },
        data: { status: nextGmuStatus },
      });

      // 4. Update public."OrderAssignment" status to COMPLETED
      const rawGmuOrder = await tx.$queryRawUnsafe(`
        SELECT id FROM public."Order" WHERE "orderId" = $1 AND phase = 'PICKUP' LIMIT 1;
      `, masterOrder.orderNumber) as any[];

      if (rawGmuOrder.length > 0) {
        const orderUuid = rawGmuOrder[0].id;
        await tx.$executeRawUnsafe(`
          UPDATE public."OrderAssignment"
          SET status = 'COMPLETED', "updatedAt" = NOW()
          WHERE "orderId" = $1 AND "assigneeId" = $2 AND role = 'PICKUP' AND "assigneeType" = 'TRANSPORTER';
        `, orderUuid, String(transporterId));
      }

      // 5. Create pickup tracking record
      await tx.pickupTracking.create({
        data: {
          pickupOrderId,
          status: 'COMPLETED',
          remarks: 'Package delivered to GMU Hub successfully by transporter.',
        },
      });

      return updated;
    });
  }
  async bulkAccept(orders: { id: number; type: 'pickup' | 'drop' }[], transporterId: number) {
    const results = [];
    for (const order of orders) {
      try {
        if (order.type === 'pickup') {
          const res = await this.acceptPickup(order.id, transporterId);
          results.push({ id: order.id, type: 'pickup', status: 'success', data: res });
        } else if (order.type === 'drop') {
          const res = await this.acceptDrop(order.id, transporterId);
          results.push({ id: order.id, type: 'drop', status: 'success', data: res });
        }
      } catch (error: any) {
        console.error(`Failed to bulk accept order ${order.type}-${order.id}:`, error.message);
        results.push({ id: order.id, type: order.type, status: 'error', message: error.message });
      }
    }

    // If all requests failed, throw the first error to make it explicit to the client
    const successes = results.filter(r => r.status === 'success');
    if (successes.length === 0 && orders.length > 0) {
      const firstError = results.find(r => r.status === 'error');
      throw new BadRequestException(firstError?.message || 'Failed to accept orders');
    }
    return results;
  }

  async autoBroadcastDropShg(tx: any, masterOrderId: number, orderNumber: string) {
    const rawBuyer = await tx.$queryRawUnsafe(`
      SELECT id, pincode, village, address_line1 FROM public.buyers WHERE id = (
        SELECT buyer_id FROM public.master_orders WHERE id = $1
      ) LIMIT 1;
    `, masterOrderId) as any[];
    
    const buyer = rawBuyer?.[0];
    if (buyer) {
      // Create DropOrder if it doesn't already exist
      const existingDrop = await tx.$queryRawUnsafe(`
        SELECT id FROM public.drop_orders WHERE drop_order_number = $1 LIMIT 1;
      `, `DRP-${orderNumber}`) as any[];

      if (existingDrop.length === 0) {
        await tx.$executeRawUnsafe(`
          INSERT INTO public.drop_orders (
            master_order_id, buyer_id, status, delivery_address, created_at, drop_order_number
          ) VALUES ($1, $2, 'PENDING', $3, NOW(), $4);
        `, masterOrderId, buyer.id, buyer.address_line1 || '', `DRP-${orderNumber}`);

        const generatedDrop = await tx.$queryRawUnsafe(`
          SELECT id FROM public.drop_orders WHERE drop_order_number = $1 LIMIT 1;
        `, `DRP-${orderNumber}`) as any[];

        if (generatedDrop?.[0]) {
          const dropOrderId = generatedDrop[0].id;
          const items = await tx.$queryRawUnsafe(`
            SELECT product_id, quantity FROM public.master_order_items WHERE master_order_id = $1;
          `, masterOrderId) as any[];

          for (const item of items) {
            await tx.$executeRawUnsafe(`
              INSERT INTO public.drop_order_items (
                drop_order_id, product_id, quantity, verification_status
              ) VALUES ($1, $2, $3, 'PENDING');
            `, dropOrderId, item.product_id, item.quantity);
          }

          await tx.$executeRawUnsafe(`
            INSERT INTO public.drop_tracking (
              drop_order_id, status, remarks, updated_at
            ) VALUES ($1, 'PENDING', 'Delivery leg created upon arrival at GMU Hub.', NOW());
          `, dropOrderId);
        }
      }
    }
  }
}


