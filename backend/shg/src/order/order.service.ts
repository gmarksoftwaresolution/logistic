import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) { }

  //////////////////////////////////////////////////////
  // NEW CLEAN ARCHITECTURE METHODS
  //////////////////////////////////////////////////////

  private async ensureAssignments(shgId: number) {
    // Disabled dev auto-assignments to enforce location-based broadcasts
  }

  async getAssignedPickups(shgId: number, mobileNumber?: string) {
    // Check partner eligibility (Approved registration, Active account)
    const user = await this.prisma.user.findUnique({
      where: { id: shgId },
      include: { address: true }
    });
    if (!user || user.role !== 'SHG' || user.applicationStatus !== 'APPROVED') {
      return [];
    }
    const shgAddress = user.address;
    if (!shgAddress) {
      return [];
    }

    // Find SHG UUID from gmu schema
    const cm = await this.prisma.$queryRawUnsafe(`
      SELECT id FROM gmu."CommunityMember" WHERE "mobileNumber" = $1 LIMIT 1;
    `, user.phoneNumber) as any[];
    const shgUuid = cm?.[0]?.id || null;

    let assignedPickupOrderIds: string[] = [];
    let assignedDropOrderIds: string[] = [];

    if (shgUuid) {
      const pickupAssignments = await this.prisma.$queryRawUnsafe(`
        SELECT o."orderId" 
        FROM gmu."OrderAssignment" oa
        JOIN gmu."Order" o ON oa."orderId" = o.id
        WHERE oa."assigneeId" = $1 AND oa.role = 'PICKUP' AND oa."assigneeType" = 'SHG' AND oa.status IN ('PENDING', 'ACCEPTED') AND o.phase = 'PICKUP';
      `, shgUuid) as any[];
      assignedPickupOrderIds = pickupAssignments.map(a => a.orderId);

      const dropAssignments = await this.prisma.$queryRawUnsafe(`
        SELECT o."orderId" 
        FROM gmu."OrderAssignment" oa
        JOIN gmu."Order" o ON oa."orderId" = o.id
        WHERE oa."assigneeId" = $1 AND oa.role = 'DROP' AND oa."assigneeType" = 'SHG' AND oa.status = 'PENDING' AND o.phase = 'DROP';
      `, shgUuid) as any[];
      assignedDropOrderIds = dropAssignments.map(a => a.orderId);
    }

    // Ensure all assigned/pending drop orders for this SHG have item verification codes generated
    const pendingCodesDrops = await this.prisma.dropOrder.findMany({
      where: {
        AND: [
          {
            OR: [
              { shgId },
              {
                shgId: null,
                status: 'PENDING',
                masterOrder: {
                  orderNumber: { in: assignedDropOrderIds }
                }
              }
            ]
          },
          { status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURN_PICKED_UP'] } },
          {
            items: {
              some: {
                verificationCode: null
              }
            }
          }
        ]
      },
      select: { id: true }
    });

    for (const d of pendingCodesDrops) {
      await this.ensureDropOrderCodes(d.id);
    }

    // 1. Regular Pickup Orders (seller -> SHG)
    const pickups = await this.prisma.pickupOrder.findMany({
      where: {
        masterOrder: {
          orderNumber: { in: assignedPickupOrderIds }
        },
        OR: [
          { status: { in: ['PENDING', 'ACCEPTED', 'REJECTED'] } },
          {
            status: 'COMPLETED',
            masterOrder: {
              status: { in: ['PARCEL_AT_SHG', 'RETURN_PARCEL_AT_SHG'] }
            }
          }
        ]
      },
      include: {
        seller: true,
        items: {
          include: {
            product: true,
          },
        },
        masterOrder: true,
        tracking: true,
        transporter: {
          include: {
            transporterDetail: true,
            address: true,
            routeDetail: true,
            otherDetails: true,
          }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const updatedPickups = pickups;

    // 2. Inbound Drop Orders (transporter -> SHG, e.g. GMU -> SHG deliveries where buyerId is the SHG)
    const inboundDrops = await this.prisma.dropOrder.findMany({
      where: {
        OR: [
          { shgId },
          {
            shgId: null,
            status: 'PENDING',
            masterOrder: {
              orderNumber: { in: assignedDropOrderIds }
            }
          }
        ],
        buyerId: shgId, // Buyer is the SHG
        status: { in: ['PENDING', 'ACCEPTED', 'REJECTED'] },
        NOT: {
          dropOrderNumber: { startsWith: 'RET-' }
        }
      },
      include: {
        buyer: true,
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
        transporter: {
          include: {
            transporterDetail: true,
            address: true,
            routeDetail: true,
            otherDetails: true,
          }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Ensure handover codes are generated for inbound drops
    const updatedInboundDrops = inboundDrops;

    // Filter inbound drops to only show when the transporter has finished picking it up
    const filteredInboundDrops = updatedInboundDrops.filter((drop) => {
      if (drop.status === 'REJECTED') return true;
      const pickup = drop.masterOrder?.pickupOrders?.[0];
      if (!pickup) return true;
      return ['COMPLETED', 'RETURNED'].includes(pickup.status);
    });

    // 3. Regular Delivery Drop Orders (SHG delivers to buyer, buyerId !== shgId)
    const regularDrops = await this.prisma.dropOrder.findMany({
      where: {
        AND: [
          {
            OR: [
              { shgId },
              {
                shgId: null,
                status: 'PENDING',
                masterOrder: {
                  orderNumber: { in: assignedDropOrderIds }
                }
              }
            ]
          },
          { buyerId: { not: shgId } },
          { status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'REJECTED'] } },
          {
            NOT: {
              dropOrderNumber: { startsWith: 'RET-' }
            }
          }
        ]
      },
      include: {
        buyer: true,
        items: {
          include: {
            product: true,
          },
        },
        masterOrder: {
          include: {
            items: {
              include: {
                seller: true,
              },
            },
          },
        },
        tracking: true,
        transporter: {
          include: {
            transporterDetail: true,
            address: true,
            routeDetail: true,
            otherDetails: true,
          }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Ensure handover codes are generated for regular drops
    const updatedRegularDrops = regularDrops;

    // Format both regular pickups and inbound drops to a common response structure
    const formattedPickups = await Promise.all(updatedPickups.map(async p => ({
      ...p,
      seller: p.seller ? {
        fullName: (p.seller as any).sellerName,
        phoneNumber: (p.seller as any).mobileNumber,
        address: {
          houseNo: (p.seller as any).addressLine1 || '',
          village: (p.seller as any).village,
          taluka: (p.seller as any).taluka,
          district: (p.seller as any).district,
          pincode: (p.seller as any).pincode,
        }
      } : null,
      transporter: await this.enrichTransporterInfo(p.transporter),
      legType: 'pickup',
      sourceType: 'seller',
    })));

    const formattedInboundDrops = await Promise.all(filteredInboundDrops.map(async (d: any) => ({
      id: d.id,
      pickupOrderNumber: d.dropOrderNumber,
      masterOrderId: d.masterOrderId,
      sellerId: d.buyerId,
      shgId: d.shgId,
      transporterId: d.transporterId,
      status: d.status,
      pickupTime: null,
      handoverCode: d.handoverCode,
      createdAt: d.createdAt,
      seller: {
        fullName: 'Transporter delivery to SHG',
        phoneNumber: d.buyer ? d.buyer.mobileNumber : '',
        address: d.buyer ? {
          houseNo: d.buyer.addressLine1 || '',
          village: d.buyer.village,
          taluka: d.buyer.taluka,
          district: d.buyer.district,
          pincode: d.buyer.pincode,
        } : null,
      },
      items: d.items,
      masterOrder: d.masterOrder,
      tracking: d.tracking,
      transporter: await this.enrichTransporterInfo(d.transporter),
      legType: 'drop',
      sourceType: 'transporter',
    })));

    const formattedRegularDrops = await Promise.all(updatedRegularDrops.map(async (d: any) => ({
      id: d.id,
      dropOrderNumber: d.dropOrderNumber,
      masterOrderId: d.masterOrderId,
      buyerId: d.buyerId,
      shgId: d.shgId,
      transporterId: d.transporterId,
      status: d.status,
      deliveryAddress: d.deliveryAddress,
      handoverCode: d.handoverCode,
      createdAt: d.createdAt,
      buyer: d.buyer ? {
        fullName: d.buyer.buyerName,
        phoneNumber: d.buyer.mobileNumber,
        address: {
          houseNo: d.buyer.addressLine1 || '',
          village: d.buyer.village,
          taluka: d.buyer.taluka,
          district: d.buyer.district,
          pincode: d.buyer.pincode,
        }
      } : null,
      items: d.items,
      masterOrder: d.masterOrder ? {
        ...d.masterOrder,
        items: d.masterOrder.items.map((item: any) => ({
          ...item,
          seller: item.seller ? {
            fullName: item.seller.sellerName,
            phoneNumber: item.seller.mobileNumber,
            address: {
              houseNo: item.seller.addressLine1 || '',
              village: item.seller.village,
              taluka: item.seller.taluka,
              district: item.seller.district,
              pincode: item.seller.pincode,
            }
          } : null
        }))
      } : null,
      tracking: d.tracking,
      transporter: await this.enrichTransporterInfo(d.transporter),
      legType: 'drop',
      sourceType: 'buyer',
    })));

    return [...formattedPickups, ...formattedInboundDrops, ...formattedRegularDrops];
  }

  async acceptPickup(pickupOrderId: number, shgId: number) {
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: {
        id: pickupOrderId,
        OR: [
          { shgId },
          { shgId: null }
        ]
      },
    });

    if (!pickupOrder) {
      const dropOrder = await this.prisma.dropOrder.findFirst({
        where: {
          id: pickupOrderId,
          OR: [
            { shgId },
            { shgId: null }
          ]
        },
      });
      if (dropOrder) {
        return this.acceptDrop(pickupOrderId, shgId);
      }
      throw new NotFoundException(`Pickup/Drop order with ID ${pickupOrderId} not available.`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      // Find SHG UUID from gmu schema
      const user = await tx.user.findUnique({ where: { id: shgId } });
      const cm = await tx.$queryRawUnsafe(`
        SELECT id FROM gmu."CommunityMember" WHERE "mobileNumber" = $1 LIMIT 1;
      `, user.phoneNumber) as any[];
      let shgUuid = cm?.[0]?.id || null;
      if (!shgUuid) {
        const shgDetail = await tx.shgDetail.findUnique({ where: { userId: shgId } });
        const address = await tx.address.findFirst({ where: { userId: shgId } });
        shgUuid = '00000000-0000-0000-0000-' + String(shgId).padStart(12, '0');
        await tx.$executeRawUnsafe(`
          INSERT INTO gmu."CommunityMember" (
            id, "memberCode", type, status, "fullName", "mobileNumber", "shgName", 
            village, taluka, district, state, pincode, "deliveryAddress", "createdAt"
          ) VALUES ($1, $2, 'SHG', 'APPROVED', $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (id) DO UPDATE SET "mobileNumber" = EXCLUDED."mobileNumber";
        `, 
          shgUuid, 
          `CM-SHG-${shgId}`, 
          user.fullName || 'SHG Member', 
          user.phoneNumber, 
          shgDetail?.shgName || 'Local SHG',
          address?.village || '',
          address?.taluka || '',
          address?.district || '',
          address?.state || '',
          address?.pincode || '',
          address?.deliveryAddress || ''
        );
      }

      // Find order number
      const masterOrder = await tx.masterOrder.findUnique({
        where: { id: pickupOrder.masterOrderId }
      });

      // Find gmu.Order UUID and verify First Accept Wins
      const gmuOrders = await tx.$queryRawUnsafe(`
        SELECT id, "pickupShgStatus", "mainStatus" FROM gmu."Order" WHERE "orderId" = $1 AND phase = 'PICKUP' LIMIT 1;
      `, masterOrder.orderNumber) as any[];
      if (gmuOrders.length === 0) {
        throw new NotFoundException(`Order ${masterOrder.orderNumber} not found in GMU hub.`);
      }
      const orderUuid = gmuOrders[0].id;
      if (gmuOrders[0].pickupShgStatus === 'ACCEPTED' || gmuOrders[0].pickupShgStatus === 'PICKED') {
        throw new BadRequestException('This order pickup has already been accepted by another SHG.');
      }

      const nextStatus = pickupOrder.status === 'RETURN_PENDING' ? 'RETURN_ACCEPTED' : 'ACCEPTED';
      const updated = await tx.pickupOrder.update({
        where: { id: pickupOrderId },
        data: {
          status: nextStatus,
          shgId,
        },
      });

      await tx.pickupTracking.create({
        data: {
          pickupOrderId,
          status: nextStatus,
          remarks: 'Pickup leg accepted by SHG.',
        },
      });

      // Update OrderAssignment of this SHG to ACCEPTED
      if (shgUuid) {
        await tx.$executeRawUnsafe(`
          UPDATE gmu."OrderAssignment"
          SET status = 'ACCEPTED', "updatedAt" = NOW()
          WHERE "orderId" = $1 AND "assigneeId" = $2 AND role = 'PICKUP' AND "assigneeType" = 'SHG';
        `, orderUuid, shgUuid);

        // Cancel other pending SHG assignments for this order and role
        await tx.$executeRawUnsafe(`
          UPDATE gmu."OrderAssignment"
          SET status = 'CANCELLED', "updatedAt" = NOW()
          WHERE "orderId" = $1 AND role = 'PICKUP' AND "assigneeType" = 'SHG' AND status = 'PENDING';
        `, orderUuid);
      }

      // Update gmu.Order status
      const nextGmuStatus = nextStatus === 'RETURN_ACCEPTED' ? 'RETURN_SHG_ACCEPTED' : 'PICKUP_SHG_ACCEPTED';
      await tx.$executeRawUnsafe(`
        UPDATE gmu."Order"
        SET "pickupShgId" = $1, "pickupShgStatus" = $2, "mainStatus" = $3, "updatedAt" = NOW()
        WHERE id = $4;
      `, shgUuid, 'ACCEPTED', nextGmuStatus, orderUuid);

      // Update public.master_orders status
      await tx.masterOrder.update({
        where: { id: pickupOrder.masterOrderId },
        data: { status: nextGmuStatus },
      });
      // Auto-generate verification codes for all order items upon SHG acceptance
      const items = await tx.pickupOrderItem.findMany({
        where: { pickupOrderId: pickupOrderId }
      });
      if (items.length > 0) {
        const generated = String(Math.floor(1000 + Math.random() * 9000));
        const expiryTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
        const orderNumber = masterOrder?.orderNumber || `ORD-${pickupOrder.masterOrderId}`;

        for (const item of items) {
          await tx.pickupOrderItem.update({
            where: { id: item.id },
            data: {
              verificationCode: generated,
              generatedTime: new Date(),
              verificationStatus: 'PENDING',
            },
          });

          // Also insert VerificationRecord
          await tx.$executeRawUnsafe(`
            INSERT INTO public."VerificationRecord" (
              "orderId", "orderItemId", "pickupOrderId", "verificationType",
              "senderId", "receiverId", "generatedCode", "status", "generatedTime", "expiryTime", "generatedBy"
            ) VALUES ($1, $2, $3, 'SELLER_TO_SHG_PICKUP', $4, $5, $6, 'PENDING', NOW(), $7, $8)
            ON CONFLICT DO NOTHING;
          `, orderNumber, item.id, pickupOrderId, pickupOrder.sellerId, shgId, generated, expiryTime, shgId);
        }
      }
      return updated;
    }, { timeout: 30000 });
  }

  async acceptDrop(dropOrderId: number, shgId: number) {
    const dropOrder = await this.prisma.dropOrder.findFirst({
      where: {
        id: dropOrderId,
        OR: [
          { shgId },
          { shgId: null }
        ]
      },
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not available.`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      // Find SHG UUID from gmu schema
      const user = await tx.user.findUnique({ where: { id: shgId } });
      const cm = await tx.$queryRawUnsafe(`
        SELECT id FROM gmu."CommunityMember" WHERE "mobileNumber" = $1 LIMIT 1;
      `, user.phoneNumber) as any[];
      let shgUuid = cm?.[0]?.id || null;
      if (!shgUuid) {
        const shgDetail = await tx.shgDetail.findUnique({ where: { userId: shgId } });
        const address = await tx.address.findFirst({ where: { userId: shgId } });
        shgUuid = '00000000-0000-0000-0000-' + String(shgId).padStart(12, '0');
        await tx.$executeRawUnsafe(`
          INSERT INTO gmu."CommunityMember" (
            id, "memberCode", type, status, "fullName", "mobileNumber", "shgName", 
            village, taluka, district, state, pincode, "deliveryAddress", "createdAt"
          ) VALUES ($1, $2, 'SHG', 'APPROVED', $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (id) DO UPDATE SET "mobileNumber" = EXCLUDED."mobileNumber";
        `, 
          shgUuid, 
          `CM-SHG-${shgId}`, 
          user.fullName || 'SHG Member', 
          user.phoneNumber, 
          shgDetail?.shgName || 'Local SHG',
          address?.village || '',
          address?.taluka || '',
          address?.district || '',
          address?.state || '',
          address?.pincode || '',
          address?.deliveryAddress || ''
        );
      }

      // Find order number
      const masterOrder = await tx.masterOrder.findUnique({
        where: { id: dropOrder.masterOrderId }
      });

      // Find gmu.Order UUID and verify First Accept Wins
      const gmuOrders = await tx.$queryRawUnsafe(`
        SELECT o.id, o."dropShgStatus", o."mainStatus", b.village as "buyerVillage", b.pincode as "buyerPincode"
        FROM gmu."Order" o
        JOIN public.buyers b ON o."buyerId" = b.id
        WHERE o."orderId" = $1 AND o.phase = 'DROP' LIMIT 1;
      `, masterOrder.orderNumber) as any[];
      if (gmuOrders.length === 0) {
        throw new NotFoundException(`Order ${masterOrder.orderNumber} not found in GMU hub.`);
      }
      const orderUuid = gmuOrders[0].id;
      if (gmuOrders[0].dropShgStatus === 'ACCEPTED' || gmuOrders[0].dropShgStatus === 'DELIVERED') {
        throw new BadRequestException('This order drop-off has already been accepted by another SHG.');
      }

      const nextStatus = dropOrder.status === 'RETURN_PENDING' ? 'RETURN_ACCEPTED' : 'ACCEPTED';
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: {
          status: nextStatus,
          shgId,
        },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: nextStatus,
          remarks: 'Delivery leg accepted by SHG.',
        },
      });

      // Update OrderAssignment of this SHG to ACCEPTED
      if (shgUuid) {
        await tx.$executeRawUnsafe(`
          UPDATE gmu."OrderAssignment"
          SET status = 'ACCEPTED', "updatedAt" = NOW()
          WHERE "orderId" = $1 AND "assigneeId" = $2 AND role = 'DROP' AND "assigneeType" = 'SHG';
        `, orderUuid, shgUuid);

        // Cancel other pending SHG assignments for this order and role
        await tx.$executeRawUnsafe(`
          UPDATE gmu."OrderAssignment"
          SET status = 'CANCELLED', "updatedAt" = NOW()
          WHERE "orderId" = $1 AND role = 'DROP' AND "assigneeType" = 'SHG' AND status = 'PENDING';
        `, orderUuid);
      }

      // Update gmu.Order status
      const nextGmuStatus = nextStatus === 'RETURN_ACCEPTED' ? 'RETURN_SHG_ACCEPTED' : 'DROP_SHG_ACCEPTED';
      await tx.$executeRawUnsafe(`
        UPDATE gmu."Order"
        SET "dropShgId" = $1, "dropShgStatus" = $2, "mainStatus" = $3, "updatedAt" = NOW()
        WHERE id = $4;
      `, shgUuid, 'ACCEPTED', nextGmuStatus, orderUuid);

      // Update public.master_orders status
      await tx.masterOrder.update({
        where: { id: dropOrder.masterOrderId },
        data: { status: nextGmuStatus },
      });

      // Broadcast to matching transporters based on configured routes (priority: Pincode -> Village -> Taluka -> District)
      const buyerVillage = gmuOrders[0].buyerVillage;
      const buyerPincode = gmuOrders[0].buyerPincode;
      
      const rawBuyer = await tx.$queryRawUnsafe(`
        SELECT taluka, district FROM public.buyers WHERE id = $1 LIMIT 1;
      `, dropOrder.buyerId) as any[];
      const buyerTaluka = rawBuyer?.[0]?.taluka || '';
      const buyerDistrict = rawBuyer?.[0]?.district || '';

      const approvedTransporters = await tx.$queryRawUnsafe(`
        SELECT tm.id, tm."assignedVillages", tm."assignedPincodes", u.id AS "userId", rd."operatingArea"
        FROM gmu."TransporterMember" tm
        JOIN public."User" u ON tm."mobileNumber" = u."phoneNumber"
        LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
        WHERE tm.status = 'APPROVED' AND u."applicationStatus" = 'APPROVED';
      `) as any[];

      const parseJsonArray = (val: any) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch(e) {}
        }
        return [];
      };

      const p = buyerPincode?.toLowerCase();
      const v = buyerVillage?.toLowerCase();
      const t = buyerTaluka?.toLowerCase();
      const d = buyerDistrict?.toLowerCase();

      const getTransporterLocations = (tr: any) => {
        const areas = tr.operatingArea
          ? tr.operatingArea.split(',').map((s: string) => s.trim().toLowerCase())
          : [];
        const villages = parseJsonArray(tr.assignedVillages).map((s: any) => String(s).toLowerCase());
        const pincodes = parseJsonArray(tr.assignedPincodes).map((s: any) => String(s).toLowerCase());
        return { areas, villages, pincodes };
      };

      // Priority 1: Pincode
      let matchingTransporters = approvedTransporters.filter(tr => {
        const { areas, pincodes } = getTransporterLocations(tr);
        return p && (pincodes.includes(p) || areas.includes(p));
      });

      // Priority 2: Village
      if (matchingTransporters.length === 0 && v) {
        matchingTransporters = approvedTransporters.filter(tr => {
          const { areas, villages } = getTransporterLocations(tr);
          return villages.includes(v) || areas.includes(v);
        });
      }

      // Priority 3: Taluka
      if (matchingTransporters.length === 0 && t) {
        matchingTransporters = approvedTransporters.filter(tr => {
          const { areas } = getTransporterLocations(tr);
          return areas.includes(t);
        });
      }

      // Priority 4: District
      if (matchingTransporters.length === 0 && d) {
        matchingTransporters = approvedTransporters.filter(tr => {
          const { areas } = getTransporterLocations(tr);
          return areas.includes(d);
        });
      }

      if (matchingTransporters.length > 0) {
        await tx.$executeRawUnsafe(`
          DELETE FROM gmu."OrderAssignment" WHERE "orderId" = $1 AND role = 'DROP' AND "assigneeType" = 'TRANSPORTER' AND status = 'PENDING';
        `, orderUuid);

        for (const t of matchingTransporters) {
          const uuidv4 = () => '00000000-0000-4000-8000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString();
          await tx.$executeRawUnsafe(`
            INSERT INTO gmu."OrderAssignment" (id, "orderId", "assigneeId", "assigneeType", role, status, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, 'TRANSPORTER', 'DROP', 'PENDING', NOW(), NOW());
          `, uuidv4(), orderUuid, t.id);
        }

        await tx.$executeRawUnsafe(`
          UPDATE gmu."Order" SET "dropTransporterStatus" = 'PENDING' WHERE id = $1;
        `, orderUuid);
      }

      return updated;
    }, { timeout: 30000 });
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

  async rejectAcceptedPickup(pickupOrderId: number, shgId: number, reason: string = '') {
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
          remarks: `Accepted pickup order rejected by SHG from pickup tab. Reason: ${reason}`,
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

  async rejectReturnPickup(dropOrderId: number, shgId: number, reason: string = '') {
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
          remarks: `Return pickup rejected by SHG. Reason: ${reason}`,
        },
      });

      return updated;
    });
  }

  async completePickup(pickupOrderId: number, shgId: number, code?: string, legType?: string) {
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

    if (pickupOrder.status === 'COMPLETED' || pickupOrder.status === 'RETURNED') {
      return pickupOrder;
    }

    const masterOrder = await this.prisma.masterOrder.findUnique({
      where: { id: pickupOrder.masterOrderId }
    });
    const orderNumber = masterOrder?.orderNumber || `ORD-${pickupOrder.masterOrderId}`;

    if (legType === 'pickup') {
      const items = await this.prisma.pickupOrderItem.findMany({
        where: { pickupOrderId }
      });
      const allVerified = items.every(item => item.verificationStatus === 'VERIFIED');

      if (!allVerified) {
        const records = await this.prisma.$queryRawUnsafe(`
          SELECT * FROM public."VerificationRecord"
          WHERE "orderId" = $1 AND "pickupOrderId" = $2 AND "verificationType" = 'SELLER_TO_SHG_PICKUP' AND status = 'PENDING'
          LIMIT 1;
        `, orderNumber, pickupOrderId) as any[];

        if (records.length === 0) {
          throw new BadRequestException('Seller pickup verification code has not been generated yet. Please generate code first.');
        }
      }

      await this.prisma.$executeRawUnsafe(`
        UPDATE public."VerificationRecord"
        SET status = 'VERIFIED', "verifiedTime" = NOW(), "verifiedBy" = $1
        WHERE "orderId" = $2 AND "pickupOrderId" = $3 AND "verificationType" = 'SELLER_TO_SHG_PICKUP' AND status = 'PENDING';
      `, shgId, orderNumber, pickupOrderId);

      await this.prisma.pickupOrderItem.updateMany({
        where: { pickupOrderId },
        data: {
          verificationStatus: 'VERIFIED',
          verifiedTime: new Date(),
        }
      });
    } else {
      const items = await this.prisma.pickupOrderItem.findMany({
        where: { pickupOrderId }
      });
      const allVerified = items.every(item => item.verificationStatus === 'VERIFIED');
      if (!allVerified) {
        throw new BadRequestException('Handover verification not completed. Please verify all product codes.');
      }
    }

    let orderUuidToBroadcast: string | null = null;

    const result = await this.prisma.$transaction(async (tx: any) => {
      // Find master order
      const masterOrder = await tx.masterOrder.findUnique({
        where: { id: pickupOrder.masterOrderId }
      });

      if (legType === 'pickup') {
        const nextStatus = pickupOrder.status === 'RETURN_ACCEPTED' ? 'RETURNED' : 'COMPLETED';
        const updated = await tx.pickupOrder.update({
          where: { id: pickupOrderId },
          data: {
            status: nextStatus,
            pickupTime: new Date(),
            transporterId: null,
          },
        });

        await tx.pickupTracking.create({
          data: {
            pickupOrderId,
            status: nextStatus,
            remarks: 'Pickup leg completed successfully by SHG.',
          },
        });

        // Reset item verification codes and status to PENDING for the transporter leg
        const orderItems = await tx.pickupOrderItem.findMany({
          where: { pickupOrderId }
        });
        for (const item of orderItems) {
          await tx.pickupOrderItem.update({
            where: { id: item.id },
            data: {
              verificationCode: null,
              generatedTime: null,
              verificationStatus: 'PENDING',
              verifiedTime: null,
            }
          });
        }

        // Update gmu.Order mainStatus and pickupShgStatus, resetting transporter fields
        const nextGmuStatus = nextStatus === 'RETURNED' ? 'RETURN_PARCEL_AT_SHG' : 'PARCEL_AT_SHG';
        const nextShgStatus = nextStatus === 'RETURNED' ? 'RETURNED' : 'PICKED';
        await tx.$executeRawUnsafe(`
          UPDATE gmu."Order"
          SET "pickupShgStatus" = $1, "mainStatus" = $2, "pickupTransporterId" = NULL, "pickupTransporterStatus" = 'PENDING', "updatedAt" = NOW()
          WHERE "orderId" = $3 AND phase = 'PICKUP';
        `, nextShgStatus, nextGmuStatus, masterOrder.orderNumber);

        // Find the gmu.Order UUID
        const rawGmuOrder = await tx.$queryRawUnsafe(`
          SELECT o.id FROM gmu."Order" o WHERE o."orderId" = $1 AND o.phase = 'PICKUP' LIMIT 1;
        `, masterOrder.orderNumber) as any[];
        if (rawGmuOrder.length > 0) {
          orderUuidToBroadcast = rawGmuOrder[0].id;
        }

        // Update public.master_orders status
        await tx.masterOrder.update({
          where: { id: pickupOrder.masterOrderId },
          data: { status: nextGmuStatus },
        });

        return updated;
      } else {
        // Transporter Handover Phase
        const rawGmuOrder = await tx.$queryRawUnsafe(`
          SELECT id, "pickupTransporterStatus" FROM gmu."Order" WHERE "orderId" = $1 AND phase = 'PICKUP' LIMIT 1;
        `, masterOrder.orderNumber) as any[];

        let transporterPicked = false;
        let orderUuid = null;
        if (rawGmuOrder.length > 0) {
          orderUuid = rawGmuOrder[0].id;
          transporterPicked = rawGmuOrder[0].pickupTransporterStatus === 'PICKED';
        }

        const isReturn = pickupOrder.status === 'RETURN_ACCEPTED';
        const shgStatusVal = isReturn ? 'RETURNED' : 'DROPPED';

        if (transporterPicked) {
          // Both complete!
          const nextStatus = isReturn ? 'RETURNED' : 'COMPLETED';
          const nextGmuStatus = isReturn ? 'RETURN_IN_TRANSIT_TO_HUB' : 'IN_TRANSIT_TO_HUB';

          await tx.pickupOrder.update({
            where: { id: pickupOrderId },
            data: {
              status: nextStatus,
              pickupTime: new Date(),
            },
          });

          await tx.$executeRawUnsafe(`
            UPDATE gmu."Order"
            SET "pickupShgStatus" = $1, "mainStatus" = $2, "updatedAt" = NOW()
            WHERE "orderId" = $3 AND phase = 'PICKUP';
          `, shgStatusVal, nextGmuStatus, masterOrder.orderNumber);

          await tx.masterOrder.update({
            where: { id: pickupOrder.masterOrderId },
            data: { status: nextGmuStatus },
          });

          if (orderUuid) {
            await tx.$executeRawUnsafe(`
              UPDATE gmu."OrderAssignment"
              SET status = 'COMPLETED', "updatedAt" = NOW()
              WHERE "orderId" = $1 AND role = 'PICKUP' AND "assigneeType" = 'TRANSPORTER';
            `, orderUuid);
          }

          // Create tracking
          await tx.pickupTracking.create({
            data: {
              pickupOrderId,
              status: nextStatus,
              remarks: 'Handover to transporter completed. Package in transit to GMU Hub.',
            },
          });

          const associatedDrop = await tx.dropOrder.findFirst({
            where: { masterOrderId: pickupOrder.masterOrderId }
          });

          if (associatedDrop) {
            await tx.dropTracking.create({
              data: {
                dropOrderId: associatedDrop.id,
                status: nextGmuStatus,
                remarks: 'Package is in transit to GMU Hub.'
              }
            });
          }
        } else {
          // Only SHG has completed
          const nextGmuStatus = isReturn ? 'RETURN_PARCEL_AT_TRANSPORTER' : 'PARCEL_AT_TRANSPORTER';

          await tx.pickupOrder.update({
            where: { id: pickupOrderId },
            data: {
              pickupTime: new Date(),
            },
          });

          await tx.$executeRawUnsafe(`
            UPDATE gmu."Order"
            SET "pickupShgStatus" = $1, "mainStatus" = $2, "updatedAt" = NOW()
            WHERE "orderId" = $3 AND phase = 'PICKUP';
          `, shgStatusVal, nextGmuStatus, masterOrder.orderNumber);

          await tx.masterOrder.update({
            where: { id: pickupOrder.masterOrderId },
            data: { status: nextGmuStatus },
          });

          await tx.pickupTracking.create({
            data: {
              pickupOrderId,
              status: pickupOrder.status,
              remarks: 'Package dropped to transporter by SHG. Awaiting transporter confirmation.',
            },
          });

          const associatedDrop = await tx.dropOrder.findFirst({
            where: { masterOrderId: pickupOrder.masterOrderId }
          });

          if (associatedDrop) {
            await tx.dropTracking.create({
              data: {
                dropOrderId: associatedDrop.id,
                status: nextGmuStatus,
                remarks: 'Package dropped to transporter by SHG.'
              }
            });
          }
        }

        return pickupOrder;
      }
    }, {
      maxWait: 10000,
      timeout: 30000
    });

    if (orderUuidToBroadcast) {
      try {
        await axios.post(`http://localhost:3001/orders/${orderUuidToBroadcast}/broadcast-transporter`, {}, {
          headers: {
            'x-bypass-token': 'GMU_INTERNAL_BYPASS'
          }
        });
        console.log(`[SHG Backend] Successfully triggered transporter broadcast for ${orderUuidToBroadcast}`);
      } catch (error) {
        console.error(`[SHG Backend] Failed to trigger transporter broadcast for ${orderUuidToBroadcast}:`, error.message);
      }
    }

    return result;
  }


  async getAssignedReturns(shgId: number) {
    // 1. Inbound Returns (transporter returning to SHG)
    // This includes DropOrders in return statuses where buyerId === shgId
    const returnPickups = await this.prisma.dropOrder.findMany({
      where: {
        buyerId: shgId,
        OR: [
          { status: { in: ['RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURN_PICKED_UP', 'RETURNED'] } },
          { AND: [{ status: 'REJECTED' }, { dropOrderNumber: { startsWith: 'RET-' } }] }
        ]
      },
      include: {
        buyer: true,
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
        OR: [
          { status: { in: ['RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURN_PICKED_UP', 'RETURNED'] } },
          { AND: [{ status: 'REJECTED' }, { dropOrderNumber: { startsWith: 'RET-' } }] }
        ]
      },
      include: {
        buyer: true,
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
                seller: true,
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

    const formattedReturnPickups = returnPickups.map((d: any) => {
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

    const formattedReturnDrops = returnDrops.map((d: any) => {
      const firstItem = d.masterOrder?.items?.[0];
      const sellerInfo = firstItem?.seller;
      const sellerAddress = sellerInfo ? {
        houseNo: sellerInfo.addressLine1 || '',
        village: sellerInfo.village,
        taluka: sellerInfo.taluka,
        district: sellerInfo.district,
        pincode: sellerInfo.pincode,
      } : null;
      return {
        ...d,
        legType: 'drop',
        sourceType: 'seller',
        deliveryAddress: d.deliveryAddress || (sellerAddress ? `${sellerAddress.houseNo || ''}, ${sellerAddress.village || ''}`.trim() : 'Seller'),
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
          fullName: sellerInfo?.sellerName || 'Seller',
          phoneNumber: sellerInfo?.mobileNumber || '',
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
      },
      include: { masterOrder: true }
    });

    if (!dropOrder) {
      throw new NotFoundException(`Drop order with ID ${dropOrderId} not found.`);
    }

    if (dropOrder.status === 'RETURNED' || dropOrder.status === 'COMPLETED' || (dropOrder.status === 'PICKED_UP' && dropOrder.masterOrder?.status === 'PARCEL_AT_SHG')) {
      return dropOrder;
    }

    const allowedStatuses = ['ACCEPTED', 'RETURN_ACCEPTED', 'PICKED_UP', 'RETURN_PICKED_UP'];
    if (!allowedStatuses.includes(dropOrder.status)) {
      throw new BadRequestException(`Cannot complete drop order in its current status (${dropOrder.status}).`);
    }

    const expectedBarcode = dropOrder.handoverCode;
    if (!code || code !== expectedBarcode) {
      throw new BadRequestException(`Barcode scan verification failed. Expected ${expectedBarcode || 'a valid barcode'}, received ${code || 'none'}.`);
    }

    const masterOrder = dropOrder.masterOrder;
    const orderNumber = masterOrder.orderNumber;

    // Log the scan event to ScanHistory
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO public."ScanHistory" (
        "orderId", "barcode", "scanType", "scanLocation", "scannedBy", "userRole", "scanResult"
      ) VALUES ($1, $2, 'Drop', 'SHG Location', $3, 'SHG', 'SUCCESS');
    `, masterOrder.id.toString(), code, shgId);

    return this.prisma.$transaction(async (tx: any) => {
      const nextStatus = dropOrder.status === 'RETURN_ACCEPTED' ? 'RETURNED' : 'PICKED_UP';
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: { status: nextStatus },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: nextStatus,
          remarks: 'Delivery handed over to Drop SHG (barcode scan verified).',
        },
      });

      const nextGmuStatus = nextStatus === 'RETURNED' ? 'RETURN_PARCEL_AT_SHG' : 'PARCEL_AT_SHG';
      const dropShgStatus = nextStatus === 'RETURNED' ? 'RETURNED' : 'PICKED';
      await tx.$executeRawUnsafe(`
        UPDATE gmu."Order"
        SET "dropShgStatus" = $1, "mainStatus" = $2, "updatedAt" = NOW()
        WHERE "orderId" = $3 AND phase = 'DROP';
      `, dropShgStatus, nextGmuStatus, orderNumber);

      await tx.masterOrder.update({
        where: { id: dropOrder.masterOrderId },
        data: { status: nextGmuStatus },
      });

      const rawGmuOrder = await tx.$queryRawUnsafe(`
        SELECT id FROM gmu."Order" WHERE "orderId" = $1 AND phase = 'DROP' LIMIT 1;
      `, orderNumber) as any[];

      if (rawGmuOrder.length > 0) {
        const orderUuid = rawGmuOrder[0].id;
        await tx.$executeRawUnsafe(`
          UPDATE gmu."OrderAssignment"
          SET status = 'COMPLETED', "updatedAt" = NOW()
          WHERE "orderId" = $1 AND role = 'DROP' AND "assigneeType" = 'TRANSPORTER';
        `, orderUuid);
      }

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

    const expectedBarcode = dropOrder.handoverCode;
    if (!code || code !== expectedBarcode) {
      throw new BadRequestException(`Barcode scan verification failed. Expected ${expectedBarcode || 'a valid barcode'}, received ${code || 'none'}.`);
    }



    const masterOrder = await this.prisma.masterOrder.findUnique({
      where: { id: dropOrder.masterOrderId }
    });

    if (!masterOrder) {
      throw new NotFoundException(`Master order for drop order ${dropOrderId} not found.`);
    }

    // Log the scan event to ScanHistory
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO public."ScanHistory" (
        "orderId", "barcode", "scanType", "scanLocation", "scannedBy", "userRole", "scanResult"
      ) VALUES ($1, $2, 'Delivery', 'Buyer Location', $3, 'SHG', 'SUCCESS');
    `, masterOrder.id.toString(), code, shgId);

    return this.prisma.$transaction(async (tx: any) => {
      const nextStatus = (dropOrder.status === 'RETURN_ACCEPTED' || dropOrder.status === 'RETURN_PICKED_UP') ? 'RETURNED' : 'DELIVERED';
      const updated = await tx.dropOrder.update({
        where: { id: dropOrderId },
        data: { status: nextStatus },
      });

      await tx.dropTracking.create({
        data: {
          dropOrderId,
          status: nextStatus,
          remarks: 'Delivery completed successfully by SHG.',
        },
      });

      const nextGmuStatus = nextStatus === 'RETURNED' ? 'RETURNED' : 'PARCEL_AT_BUYER';
      await tx.$executeRawUnsafe(`
        UPDATE gmu."Order"
        SET "dropShgStatus" = 'DELIVERED', "mainStatus" = $1, "updatedAt" = NOW()
        WHERE "orderId" = $2 AND phase = 'DROP';
      `, nextGmuStatus, masterOrder.orderNumber);

      await tx.masterOrder.update({
        where: { id: dropOrder.masterOrderId },
        data: { status: nextGmuStatus },
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

  private parseRescheduleDate(date: string, time: string): Date | null {
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
        const newDate = new Date(Number(yearStr || 2026), month, Number(dayStr || 15), hours || 12, minutes || 0);
        if (!isNaN(newDate.getTime())) {
          return newDate;
        }
      }
    } catch (e) {
      console.warn('Failed to parse date/time string:', e);
    }
    return null;
  }

  async rescheduleAccepted(dto: any) {
    const { orderId: id, date, time, reason } = dto;
    const newDate = this.parseRescheduleDate(date, time);

    return this.prisma.$transaction(async (tx: any) => {
      const now = new Date();

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

        const masterOrder = await tx.masterOrder.findUnique({
          where: { id: pickup.masterOrderId }
        });
        await tx.$executeRawUnsafe(`
          UPDATE gmu."Order"
          SET "rescheduledAt" = $1, "rescheduleType" = $2, "updatedAt" = NOW()
          WHERE "orderId" = $3 AND phase = 'PICKUP';
        `, finalDate, 'SHG', masterOrder.orderNumber);

        await tx.pickupTracking.create({
          data: {
            pickupOrderId: id,
            status: 'PENDING',
            remarks: `Order rescheduled to ${finalDate.toLocaleString()}. Reason: ${reason || 'None'}`,
          },
        });
        return { success: true, count: 1, details: [{ type: 'pickup', id, updated }] };
      }

      // Check if it's a DropOrder
      const drop = await tx.dropOrder.findUnique({ where: { id } });
      if (drop) {
        if (['COMPLETED', 'RETURNED', 'REJECTED'].includes(drop.status)) {
          throw new BadRequestException(`Order ${drop.dropOrderNumber} is already completed/rejected and cannot be rescheduled.`);
        }

        if (['PICKED_UP', 'RETURN_PICKED_UP'].includes(drop.status)) {
          throw new BadRequestException(`Delivery order ${drop.dropOrderNumber} cannot be rescheduled via the accepted reschedule endpoint.`);
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

        const finalDate = newDate || new Date(drop.createdAt.getTime() + 24 * 60 * 60 * 1000);
        const updated = await tx.dropOrder.update({
          where: { id },
          data: { createdAt: finalDate },
        });

        const masterOrder = await tx.masterOrder.findUnique({
          where: { id: drop.masterOrderId }
        });
        await tx.$executeRawUnsafe(`
          UPDATE gmu."Order"
          SET "rescheduledAt" = $1, "rescheduleType" = $2, "updatedAt" = NOW()
          WHERE "orderId" = $3 AND phase = 'DROP';
        `, finalDate, 'SHG', masterOrder.orderNumber);

        await tx.dropTracking.create({
          data: {
            dropOrderId: id,
            status: 'PENDING',
            remarks: `Order rescheduled to ${finalDate.toLocaleString()}. Reason: ${reason || 'None'}`,
          },
        });
        return { success: true, count: 1, details: [{ type: 'drop', id, updated }] };
      }

      throw new BadRequestException(`Order with ID ${id} not found.`);
    });
  }

  async rescheduleDelivery(dto: any) {
    const { orderId: id, date, time, reason } = dto;
    const newDate = this.parseRescheduleDate(date, time);

    return this.prisma.$transaction(async (tx: any) => {
      const now = new Date();

      // Check if it's a PickupOrder
      const pickup = await tx.pickupOrder.findUnique({ where: { id } });
      if (pickup) {
        throw new BadRequestException(`Pickup order ${pickup.pickupOrderNumber} cannot be rescheduled via the delivery reschedule endpoint.`);
      }

      // Check if it's a DropOrder
      const drop = await tx.dropOrder.findUnique({ where: { id } });
      if (drop) {
        if (['COMPLETED', 'RETURNED', 'REJECTED'].includes(drop.status)) {
          throw new BadRequestException(`Order ${drop.dropOrderNumber} is already completed/rejected and cannot be rescheduled.`);
        }

        if (['PENDING', 'ACCEPTED', 'RETURN_PENDING', 'RETURN_ACCEPTED'].includes(drop.status)) {
          throw new BadRequestException(`Pending/Accepted order ${drop.dropOrderNumber} must be rescheduled via the accepted reschedule endpoint.`);
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

        const masterOrder = await tx.masterOrder.findUnique({
          where: { id: drop.masterOrderId }
        });
        await tx.$executeRawUnsafe(`
          UPDATE gmu."Order"
          SET "rescheduledAt" = $1, "rescheduleType" = $2, "updatedAt" = NOW()
          WHERE "orderId" = $3 AND phase = 'DROP';
        `, finalDate, 'SHG', masterOrder.orderNumber);

        await tx.dropTracking.create({
          data: {
            dropOrderId: id,
            status: 'PENDING',
            remarks: `Order rescheduled to ${finalDate.toLocaleString()}. Reason: ${reason || 'None'}`,
          },
        });
        return { success: true, count: 1, details: [{ type: 'drop', id, updated }] };
      }

      throw new BadRequestException(`Order with ID ${id} not found.`);
    });
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

  async generateCode(orderId: number, shgId: number) {
    // 1. Try pickupOrder
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { id: orderId, shgId },
      include: { items: { include: { product: true } } },
    });

    if (pickupOrder) {
      const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
      const expiryTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      const masterOrder = await this.prisma.masterOrder.findUnique({
        where: { id: pickupOrder.masterOrderId }
      });
      const orderNumber = masterOrder?.orderNumber || `ORD-${pickupOrder.masterOrderId}`;

      let verificationType = 'SELLER_TO_SHG_PICKUP';
      if (
        (pickupOrder.status === 'ACCEPTED' || pickupOrder.status === 'RETURN_ACCEPTED') &&
        !['TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'RETURN_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_HUB', 'RETURN_IN_TRANSIT_TO_HUB', 'DELIVERED_TO_HUB', 'RETURN_DELIVERED_TO_HUB'].includes(masterOrder?.status || '')
      ) {
        verificationType = 'SELLER_TO_SHG_PICKUP';
      } else if (
        pickupOrder.status === 'COMPLETED' || 
        ['PARCEL_AT_SHG', 'RETURN_PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'RETURN_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER', 'IN_TRANSIT_TO_HUB', 'RETURN_IN_TRANSIT_TO_HUB', 'DELIVERED_TO_HUB', 'RETURN_DELIVERED_TO_HUB'].includes(masterOrder?.status || '')
      ) {
        verificationType = 'SHG_TO_TRANSPORTER_PICKUP';
      }

      for (const item of pickupOrder.items) {
        await this.prisma.$executeRawUnsafe(`
          UPDATE public."VerificationRecord"
          SET status = 'EXPIRED'
          WHERE "orderId" = $1 AND "orderItemId" = $2 AND "verificationType" = $3 AND status = 'PENDING';
        `, orderNumber, item.id, verificationType);

        await this.prisma.$executeRawUnsafe(`
          INSERT INTO public."VerificationRecord" (
            "orderId", "orderItemId", "pickupOrderId", "verificationType",
            "senderId", "receiverId", "generatedCode", "status", "generatedTime", "expiryTime", "generatedBy"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', NOW(), $8, $9);
        `, orderNumber, item.id, orderId, verificationType, pickupOrder.sellerId, shgId, generatedCode, expiryTime, shgId);

        await this.prisma.pickupOrderItem.update({
          where: { id: item.id },
          data: {
            verificationCode: generatedCode,
            generatedTime: new Date(),
            verificationStatus: 'PENDING',
          },
        });
      }

      const updatedItems = await this.prisma.pickupOrderItem.findMany({
        where: { pickupOrderId: orderId },
        include: { product: true },
      });

      return {
        success: true,
        items: updatedItems.map(item => ({
          itemId: item.id,
          productId: item.productId,
          productName: item.product?.name || 'General Item',
          code: item.verificationCode,
          status: item.verificationStatus,
        })),
      };
    }

    // 2. Try dropOrder
    const dropOrder = await this.prisma.dropOrder.findFirst({
      where: { id: orderId, shgId },
      include: { items: { include: { product: true } } },
    });

    if (dropOrder) {
      const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
      const expiryTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
      const verificationType = 'SHG_TO_BUYER_DELIVERY';

      const masterOrder = await this.prisma.masterOrder.findUnique({
        where: { id: dropOrder.masterOrderId }
      });
      const orderNumber = masterOrder?.orderNumber || `ORD-${dropOrder.masterOrderId}`;

      for (const item of dropOrder.items) {
        await this.prisma.$executeRawUnsafe(`
          UPDATE public."VerificationRecord"
          SET status = 'EXPIRED'
          WHERE "orderId" = $1 AND "orderItemId" = $2 AND "verificationType" = $3 AND status = 'PENDING';
        `, orderNumber, item.id, verificationType);

        await this.prisma.$executeRawUnsafe(`
          INSERT INTO public."VerificationRecord" (
            "orderId", "orderItemId", "dropOrderId", "verificationType",
            "senderId", "receiverId", "generatedCode", "status", "generatedTime", "expiryTime", "generatedBy"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', NOW(), $8, $9);
        `, orderNumber, item.id, orderId, verificationType, shgId, dropOrder.buyerId, generatedCode, expiryTime, shgId);

        await this.prisma.dropOrderItem.update({
          where: { id: item.id },
          data: {
            verificationCode: generatedCode,
            generatedTime: new Date(),
            verificationStatus: 'PENDING',
          },
        });
      }

      const updatedItems = await this.prisma.dropOrderItem.findMany({
        where: { dropOrderId: orderId },
        include: { product: true },
      });

      return {
        success: true,
        items: updatedItems.map(item => ({
          itemId: item.id,
          productId: item.productId,
          productName: item.product?.name || 'General Item',
          code: item.verificationCode,
          status: item.verificationStatus,
        })),
      };
    }

    throw new NotFoundException(`Order with ID ${orderId} not found.`);
  }



  async verifyCodes(orderId: number, shgId: number, codes: Record<number, string>) {
    // 1. Try to find pickupOrder
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { id: orderId, shgId },
      include: { items: { include: { product: true } } },
    });
    if (pickupOrder) {
      console.log('[BACKEND DEBUG] verifyCodes:', { orderId, shgId, codes, items: pickupOrder.items.map(i => ({ id: i.id, code: i.verificationCode })) });
      const masterOrder = await this.prisma.masterOrder.findUnique({
        where: { id: pickupOrder.masterOrderId }
      });
      const orderNumber = masterOrder?.orderNumber || `ORD-${pickupOrder.masterOrderId}`;

      let verificationType = 'SELLER_TO_SHG_PICKUP';
      if (
        (pickupOrder.status === 'ACCEPTED' || pickupOrder.status === 'RETURN_ACCEPTED') &&
        !['TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'RETURN_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_HUB', 'RETURN_IN_TRANSIT_TO_HUB', 'DELIVERED_TO_HUB', 'RETURN_DELIVERED_TO_HUB'].includes(masterOrder?.status || '')
      ) {
        verificationType = 'SELLER_TO_SHG_PICKUP';
      } else if (
        pickupOrder.status === 'COMPLETED' || 
        ['PARCEL_AT_SHG', 'RETURN_PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'RETURN_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER', 'IN_TRANSIT_TO_HUB', 'RETURN_IN_TRANSIT_TO_HUB', 'DELIVERED_TO_HUB', 'RETURN_DELIVERED_TO_HUB'].includes(masterOrder?.status || '')
      ) {
        verificationType = 'SHG_TO_TRANSPORTER_PICKUP';
      }

      const enteredItemIds = Object.keys(codes).map(Number);
      
      for (const itemId of enteredItemIds) {
        const item = pickupOrder.items.find(i => i.id === itemId);
        if (!item) {
          throw new BadRequestException(`Item with ID ${itemId} not found in this order.`);
        }
        const entered = codes[itemId];

        // Query active VerificationRecord
        const records = await this.prisma.$queryRawUnsafe(`
          SELECT * FROM public."VerificationRecord"
          WHERE "orderId" = $1 AND "orderItemId" = $2 AND "verificationType" = $3 AND status = 'PENDING'
          LIMIT 1;
        `, orderNumber, itemId, verificationType) as any[];


        if (records.length === 0) {
          const isValidFallback = (item.verificationCode === entered) || pickupOrder.items.some(i => i.verificationCode === entered);
          if (!isValidFallback) {
            if (item.verificationCode) {
              throw new BadRequestException(`Verification failed: Code for item ${item.product?.name || item.id} is incorrect.`);
            }
            throw new BadRequestException(`No active verification code found for item ${item.product?.name || item.id}.`);
          }

          // Insert VerificationRecord on the fly so we maintain backend records
          const expiryTime = new Date(Date.now() + 60 * 60 * 1000);
          await this.prisma.$executeRawUnsafe(`
            INSERT INTO public."VerificationRecord" (
              "orderId", "orderItemId", "pickupOrderId", "verificationType",
              "senderId", "receiverId", "generatedCode", "status", "generatedTime", "expiryTime", "generatedBy", "verifiedTime", "verifiedBy"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'VERIFIED', NOW(), $8, $9, NOW(), $9)
            ON CONFLICT DO NOTHING;
          `, orderNumber, item.id, orderId, verificationType, pickupOrder.sellerId, shgId, entered, expiryTime, shgId);

          // Update legacy column
          await this.prisma.pickupOrderItem.update({
            where: { id: itemId },
            data: {
              verificationStatus: 'VERIFIED',
              verifiedTime: new Date(),
            },
          });
          continue;
        }

        const record = records[0];

        // Check code
        let isCodeValid = (record.generatedCode === entered);
        if (!isCodeValid) {
          // Fallback: check if the code matches the code of any other item in this order (e.g. from seed)
          const anyMatch = pickupOrder.items.some(i => i.verificationCode === entered);
          if (anyMatch) {
            isCodeValid = true;
          }
        }

        if (!isCodeValid) {
          await this.prisma.$executeRawUnsafe(`
            UPDATE public."VerificationRecord"
            SET "attemptCount" = "attemptCount" + 1
            WHERE id = $1;
          `, record.id);
          throw new BadRequestException(`Verification failed: Code for item ${item.product?.name || item.id} is incorrect.`);
        }

        // Success - mark as verified in VerificationRecord
        await this.prisma.$executeRawUnsafe(`
          UPDATE public."VerificationRecord"
          SET status = 'VERIFIED', "verifiedTime" = NOW(), "verifiedBy" = $1, "attemptCount" = "attemptCount" + 1
          WHERE id = $2;
        `, shgId, record.id);

        await this.prisma.pickupOrderItem.update({
          where: { id: itemId },
          data: {
            verificationStatus: 'VERIFIED',
            verifiedTime: new Date(),
          },
        });
      }

      const allItems = await this.prisma.pickupOrderItem.findMany({
        where: { pickupOrderId: orderId },
      });
      const allVerified = allItems.every(i => i.verificationStatus === 'VERIFIED');

      return { success: true, allVerified };
    }

    // 2. Try to find dropOrder
    const dropOrder = await this.prisma.dropOrder.findFirst({
      where: { id: orderId, shgId },
      include: { items: { include: { product: true } } },
    });

    if (dropOrder) {
      const masterOrder = await this.prisma.masterOrder.findUnique({
        where: { id: dropOrder.masterOrderId }
      });
      const orderNumber = masterOrder?.orderNumber || `ORD-${dropOrder.masterOrderId}`;
      const verificationType = 'SHG_TO_BUYER_DELIVERY';

      const enteredItemIds = Object.keys(codes).map(Number);
      
      for (const itemId of enteredItemIds) {
        const item = dropOrder.items.find(i => i.id === itemId);
        if (!item) {
          throw new BadRequestException(`Item with ID ${itemId} not found in this order.`);
        }
        const entered = codes[itemId];

        // Query active VerificationRecord
        const records = await this.prisma.$queryRawUnsafe(`
          SELECT * FROM public."VerificationRecord"
          WHERE "orderId" = $1 AND "orderItemId" = $2 AND "verificationType" = $3 AND status = 'PENDING'
          LIMIT 1;
        `, orderNumber, itemId, verificationType) as any[];

        if (records.length === 0) {
          throw new BadRequestException(`No active verification code found for item ${item.product?.name || item.id}.`);
        }

        const record = records[0];

        // Check code
        if (record.generatedCode !== entered) {
          await this.prisma.$executeRawUnsafe(`
            UPDATE public."VerificationRecord"
            SET "attemptCount" = "attemptCount" + 1
            WHERE id = $1;
          `, record.id);
          throw new BadRequestException(`Verification failed: Code for item ${item.product?.name || item.id} is incorrect.`);
        }

        // Success
        await this.prisma.$executeRawUnsafe(`
          UPDATE public."VerificationRecord"
          SET status = 'VERIFIED', "verifiedTime" = NOW(), "verifiedBy" = $1, "attemptCount" = "attemptCount" + 1
          WHERE id = $2;
        `, shgId, record.id);

        // Update legacy column
        await this.prisma.dropOrderItem.update({
          where: { id: itemId },
          data: {
            verificationStatus: 'VERIFIED',
            verifiedTime: new Date(),
          },
        });
      }

      // Query updated items to check if ALL items are now VERIFIED
      const allItems = await this.prisma.dropOrderItem.findMany({
        where: { dropOrderId: orderId },
      });
      const allVerified = allItems.every(i => i.verificationStatus === 'VERIFIED');

      return { success: true, allVerified };
    }

    throw new NotFoundException(`Order with ID ${orderId} not found.`);
  }

  async enrichTransporterInfo(transporter: any) {
    if (!transporter) return null;
    try {
      const members = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM gmu."TransporterMember" WHERE "mobileNumber" = $1 LIMIT 1;
      `, transporter.phoneNumber) as any[];
      
      const member = members?.[0] || null;
      if (member) {
        return {
          ...transporter,
          fullName: `${member.firstName} ${member.lastName}`.trim(),
          phoneNumber: member.mobileNumber,
          transporterDetail: {
            ...transporter.transporterDetail,
            transporterCode: member.transporterCode,
            vehicleNumber: member.vehicleNumber || transporter.otherDetails?.[0]?.registrationNumber || '',
          },
          transporterAddress: `${member.residentialAddress || ''}, ${member.village || ''}, ${member.district || ''}`.replace(/^,\s*|,\s*$/g, '').trim(),
          transporterRoute: member.assignedVillages ? (typeof member.assignedVillages === 'string' ? member.assignedVillages : JSON.stringify(member.assignedVillages)) : '',
        };
      }
    } catch (err) {
      console.error('Error enriching transporter info:', err);
    }
    return transporter;
  }
}

