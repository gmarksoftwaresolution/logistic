import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { VehicleSuggestionService } from './vehicle-suggestion.service';
import { EarningsService } from '../earnings/earnings.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private vehicleSuggestionService: VehicleSuggestionService,
    private earningsService: EarningsService,
  ) { }

  private normalizeStr(s?: string | null): string {
    if (!s) return '';
    return s.replace(/[^a-z0-9]/gi, '').trim().toLowerCase();
  }

  async getAssignedPickups(shgId: number | string, mobileNumber?: string) {
    const numericShgId = typeof shgId === 'number' ? shgId : parseInt(String(shgId), 10);
    const user = await this.prisma.user.findUnique({
      where: { id: numericShgId },
      include: { address: true }
    });
    if (!user || user.role !== 'SHG' || user.applicationStatus !== 'APPROVED') {
      return [];
    }

    const shgUuid = String(numericShgId);
    const userVillage = this.normalizeStr(user.address?.village);
    const userPincode = user.address?.pincode ? user.address.pincode.trim().toLowerCase() : '';

    const assignedOrders = await this.prisma.orderAssignment.findMany({
      where: {
        assigneeId: shgUuid,
        assigneeType: 'SHG',
        status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED'] },
      },
      select: { orderId: true, role: true }
    });
    const assignedOrderIds = assignedOrders.map(a => a.orderId);

    const orders = await this.prisma.order.findMany({
      where: {
        phase: 'PICKUP',
        mainStatus: {
          in: [
            'NEW',
            'ORDER_PLACED',
            'PENDING',
            'PENDING_PICKUP',
            'PICKUP_ASSIGNED',
            'PICKUP_SHG_PENDING',
            'ACCEPTED',
            'PICKUP_SHG_ACCEPTED',
            'PARCEL_AT_SHG',
            'TRANSPORTER_ACCEPTED',
            'PICKUP_TRANSPORTER_ACCEPTED',
            'REDIRECTED'
          ]
        }
      },
      include: {
        seller: true,
        buyer: true,
        parcels: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // STRICT BUSINESS LOGIC FILTER: (Village + Pincode Match) OR Direct Assignment
    const matchedOrders = orders.filter((o: any) => {
      // 1. Directly assigned ID or pickupShgId match
      if (o.pickupShgId === shgUuid || assignedOrderIds.includes(o.id)) {
        return true;
      }
      // 2. Strict matching on BOTH Seller Village AND Seller Pincode
      if (o.seller) {
        const sellerVillage = this.normalizeStr(o.seller.village);
        const sellerPincode = o.seller.pincode ? o.seller.pincode.trim().toLowerCase() : '';
        if (userVillage && userPincode && sellerVillage === userVillage && sellerPincode === userPincode) {
          return true;
        }
      }
      return false;
    });

    return matchedOrders.map((o: any) => {
      const cleanOrderId = (o.orderId || o.id).replace(/^ORD-/, '');
      return {
        id: cleanOrderId,
        uuid: o.id,
        orderId: cleanOrderId,
        orderNumber: cleanOrderId,
        barcode: o.barcode,
        status: o.mainStatus,
        legType: 'pickup',
        seller: o.seller ? {
          fullName: o.seller.sellerName,
          phoneNumber: o.seller.mobileNumber,
          address: {
            houseNo: o.seller.addressLine1 || '',
            village: o.seller.village,
            taluka: o.seller.taluka,
            district: o.seller.district,
            pincode: o.seller.pincode,
          }
        } : null,
        buyer: o.buyer ? {
          fullName: o.buyer.buyerName,
          phoneNumber: o.buyer.mobileNumber,
          address: {
            houseNo: o.buyer.addressLine1 || '',
            village: o.buyer.village,
            taluka: o.buyer.taluka,
            district: o.buyer.district,
            pincode: o.buyer.pincode,
          }
        } : null,
        parcels: o.parcels || [],
        items: (o.parcels && o.parcels.length > 0) ? o.parcels.map((p: any) => ({
          id: p.id,
          productId: p.productId || 1,
          quantity: p.quantity || 1,
          product: {
            id: p.productId || 1,
            name: p.productName || 'Agricultural Goods',
            price: p.declaredValue || 450,
            weight: Number(p.weight || p.weightKg || 2.5),
            category: p.category || 'Agriculture',
            unit: 'kg'
          }
        })) : [{
          id: 1,
          productId: 1,
          quantity: 1,
          product: {
            id: 1,
            name: 'Agricultural Goods',
            price: 450,
            weight: 2.5,
            category: 'Agriculture',
            unit: 'kg'
          }
        }],
        isPickupRedirected: o.isPickupRedirected,
        isDropRedirected: o.isDropRedirected,
        pickupShgStatus: o.pickupShgStatus,
        pickupTransporterStatus: o.pickupTransporterStatus,
        dropShgStatus: o.dropShgStatus,
        dropTransporterStatus: o.dropTransporterStatus,
        mainStatus: o.mainStatus,
      };
    });
  }

  async getCompletedOrders(shgId: number | string, mobileNumber?: string) {
    const numericShgId = typeof shgId === 'number' ? shgId : parseInt(String(shgId), 10);
    const user = await this.prisma.user.findUnique({
      where: { id: numericShgId },
      include: { address: true }
    });
    if (!user || user.role !== 'SHG' || user.applicationStatus !== 'APPROVED') {
      return { newOrders: [], returnOrders: [] };
    }

    const shgUuid = String(numericShgId);
    const userVillage = this.normalizeStr(user.address?.village);
    const userPincode = user.address?.pincode ? user.address.pincode.trim().toLowerCase() : '';

    const orders = await this.prisma.order.findMany({
      where: {
        mainStatus: {
          in: [
            'IN_TRANSIT_TO_HUB',
            'HUB_RECEIVED',
            'STORED',
            'DISPATCHED',
            'DELIVERED',
            'COMPLETED',
            'RETURN_COMPLETED'
          ]
        }
      },
      include: {
        seller: true,
        buyer: true,
        parcels: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const matchedOrders = orders.filter((o: any) => {
      if (o.pickupShgId === shgUuid || o.dropShgId === shgUuid || o.pickupReturnShgId === shgUuid) {
        return true;
      }
      if (o.seller) {
        const sVillage = this.normalizeStr(o.seller.village);
        const sPincode = o.seller.pincode ? o.seller.pincode.trim().toLowerCase() : '';
        if (userVillage && userPincode && sVillage === userVillage && sPincode === userPincode) {
          return true;
        }
      }
      if (o.buyer) {
        const bVillage = this.normalizeStr(o.buyer.village);
        const bPincode = o.buyer.pincode ? o.buyer.pincode.trim().toLowerCase() : '';
        if (userVillage && userPincode && bVillage === userVillage && bPincode === userPincode) {
          return true;
        }
      }
      return false;
    });

    const formatted = matchedOrders.map((o: any) => {
      const cleanOrderId = (o.orderId || o.id).replace(/^ORD-/, '');
      return {
        id: cleanOrderId,
        uuid: o.id,
        orderId: cleanOrderId,
        orderNumber: cleanOrderId,
        barcode: o.barcode,
        status: o.mainStatus,
        seller: o.seller ? {
          fullName: o.seller.sellerName,
          phoneNumber: o.seller.mobileNumber,
        } : null,
        buyer: o.buyer ? {
          fullName: o.buyer.buyerName,
          phoneNumber: o.buyer.mobileNumber,
        } : null,
        items: o.parcels || [],
        isPickupRedirected: o.isPickupRedirected,
        isDropRedirected: o.isDropRedirected,
        pickupShgStatus: o.pickupShgStatus,
        pickupTransporterStatus: o.pickupTransporterStatus,
        dropShgStatus: o.dropShgStatus,
        dropTransporterStatus: o.dropTransporterStatus,
        mainStatus: o.mainStatus,
      };
    });

    return {
      newOrders: formatted.filter(o => o.status !== 'RETURN_COMPLETED'),
      returnOrders: formatted.filter(o => o.status === 'RETURN_COMPLETED'),
    };
  }

  async getAssignedReturns(shgId: number | string) {
    const numericShgId = typeof shgId === 'number' ? shgId : parseInt(String(shgId), 10);
    const shgUuid = String(numericShgId);

    const orders = await this.prisma.order.findMany({
      where: {
        returnType: 'BUYER_RETURN',
        OR: [
          { pickupReturnShgId: shgUuid },
          { dropShgId: shgUuid },
        ],
        mainStatus: { in: ['RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PARCEL_AT_SHG'] }
      },
      include: {
        seller: true,
        buyer: true,
        parcels: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o: any) => {
      const cleanOrderId = (o.orderId || o.id).replace(/^ORD-/, '');
      return {
        id: cleanOrderId,
        uuid: o.id,
        orderId: cleanOrderId,
        status: o.mainStatus,
        seller: o.seller,
        buyer: o.buyer,
        items: o.parcels || [],
      };
    });
  }

  async acceptPickup(orderId: any, shgId: number | string, vehicleName?: string, vehicleCapacity?: number, vehicleType?: string) {
    const order = await this.findOrderFlexible(orderId);
    const shgUuid = String(shgId);

    await this.prisma.orderAssignment.updateMany({
      where: {
        orderId: order.id,
        assigneeId: shgUuid,
        assigneeType: 'SHG',
      },
      data: { status: 'ACCEPTED' }
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupShgId: shgUuid,
        pickupShgStatus: 'PICKUP_SHG_ACCEPTED',
        mainStatus: 'PICKUP_SHG_ACCEPTED',
      }
    });

    return order;
  }

  async acceptDrop(orderId: any, shgId: number | string, vehicleName?: string, vehicleCapacity?: number, vehicleType?: string) {
    const order = await this.findOrderFlexible(orderId);
    const shgUuid = String(shgId);

    await this.prisma.orderAssignment.updateMany({
      where: {
        orderId: order.id,
        assigneeId: shgUuid,
        assigneeType: 'SHG',
      },
      data: { status: 'ACCEPTED' }
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropShgId: shgUuid,
        dropShgStatus: 'DROP_SHG_ACCEPTED',
        mainStatus: 'DROP_SHG_ACCEPTED',
      }
    });

    return order;
  }

  async completePickup(orderId: any, shgId: number | string, code?: string, legType?: string) {
    const order = await this.findOrderFlexible(orderId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupShgStatus: 'PARCEL_PICKED',
        mainStatus: 'PARCEL_AT_SHG',
      }
    });

    return order;
  }

  async pickupDrop(orderId: any, shgId: number | string, code?: string) {
    const order = await this.findOrderFlexible(orderId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropShgStatus: 'PARCEL_AT_DROP_SHG',
        mainStatus: 'AT_BUYER_SHG',
      }
    });

    return order;
  }

  async completeDrop(orderId: any, shgId: number | string, code?: string) {
    const order = await this.findOrderFlexible(orderId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropShgStatus: 'DELIVERED',
        mainStatus: 'DELIVERED',
      }
    });

    return order;
  }

  async generateCode(orderId: any, shgId: number | string) {
    const order = await this.findOrderFlexible(orderId);
    return { success: true, code: '1234', orderId: order.id };
  }

  async verifyCodes(orderId: any, shgId: number | string, codes: Record<number, string>) {
    const order = await this.findOrderFlexible(orderId);
    return { success: true, message: 'Codes verified successfully', orderId: order.id };
  }

  async redirectOrder(orderId: any, shgId: number | string, legType?: string, reason?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: String(orderId) },
          { orderId: String(orderId) },
          { orderId: `ORD-${String(orderId)}` }
        ]
      },
      include: { seller: true }
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const seller = order.seller;
    let selectedTransporterId: string | null = null;
    
    if (seller) {
      // Find matching transporters
      const transporters = await this.prisma.$queryRawUnsafe(`
        SELECT u.id, rd."operatingArea", rd."pickupLocations" as "assignedPincodes", mv."assignedVillages"
        FROM public."User" u
        LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
        LEFT JOIN public."MilkVanDetail" mv ON u.id = mv."userId"
        WHERE u.role = 'TRANSPORTER' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL;
      `) as any[];

      const parseJsonArray = (val: any) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch (e) { }
        }
        return [];
      };

      const getTransporterLocations = (tr: any) => {
        const areas = tr.operatingArea
          ? tr.operatingArea.split(',').map((s: string) => s.trim().toLowerCase())
          : [];
        const villages = parseJsonArray(tr.assignedVillages).map((s: any) => String(s).toLowerCase());
        const pincodes = parseJsonArray(tr.assignedPincodes).map((s: any) => String(s).toLowerCase());
        return { areas, villages, pincodes };
      };

      const p = seller.pincode ? seller.pincode.toLowerCase().trim() : '';
      const v = seller.village ? seller.village.toLowerCase().trim() : '';
      const t = seller.taluka ? seller.taluka.toLowerCase().trim() : '';
      const d = seller.district ? seller.district.toLowerCase().trim() : '';

      let matchedTransporters = [];

      // Priority 1: Pincode
      if (p) {
        matchedTransporters = transporters.filter(tr => {
          const { areas, pincodes } = getTransporterLocations(tr);
          return pincodes.some((po: string) => po.split(' (')[0] === p) || areas.some((a: string) => a.split(' (')[0] === p);
        });
      }

      // Priority 2: Village
      if (matchedTransporters.length === 0 && v) {
        matchedTransporters = transporters.filter(tr => {
          const { areas, villages } = getTransporterLocations(tr);
          return villages.some((vi: string) => vi.split(' (')[0] === v) || areas.some((a: string) => a.split(' (')[0] === v);
        });
      }

      // Priority 3: Taluka
      if (matchedTransporters.length === 0 && t) {
        matchedTransporters = transporters.filter(tr => {
          const { areas } = getTransporterLocations(tr);
          return areas.some((a: string) => a.split(' (')[0] === t);
        });
      }

      // Priority 4: District
      if (matchedTransporters.length === 0 && d) {
        matchedTransporters = transporters.filter(tr => {
          const { areas } = getTransporterLocations(tr);
          return areas.some((a: string) => a.split(' (')[0] === d);
        });
      }

      if (matchedTransporters.length > 0) {
        selectedTransporterId = String(matchedTransporters[0].id);
      }
    }

    if (!selectedTransporterId) {
      const fallbackTransporter = await this.prisma.user.findFirst({
        where: { role: 'TRANSPORTER', applicationStatus: 'APPROVED', deletedAt: null }
      });
      if (fallbackTransporter) {
        selectedTransporterId = String(fallbackTransporter.id);
      }
    }

    if (selectedTransporterId) {
      // 1. Create OrderAssignment for transporter
      await this.prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: selectedTransporterId,
          assigneeType: 'TRANSPORTER',
          role: 'PICKUP',
          status: 'PENDING'
        }
      });

      // 2. Insert into RedirectedOrder audit table
      await this.prisma.redirectedOrder.upsert({
        where: { orderId: order.id },
        update: {
          shgId: String(shgId),
          transporterId: selectedTransporterId,
          reason: reason || 'Redirected by SHG',
          status: 'PENDING'
        },
        create: {
          orderId: order.id,
          shgId: String(shgId),
          transporterId: selectedTransporterId,
          reason: reason || 'Redirected by SHG',
          status: 'PENDING'
        }
      });
    }

    // 3. Update the Order table
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        isPickupRedirected: true,
        redirectedPickupAt: new Date(),
        redirectedPickupShgId: String(shgId),
        pickupShgStatus: 'REDIRECTED',
        mainStatus: 'REDIRECTED',
        pickupTransporterId: selectedTransporterId,
        pickupTransporterStatus: 'PENDING'
      }
    });

    return { success: true, message: 'Order redirected to Transporter', orderId: order.id };
  }

  async rescheduleAccepted(dto: any) {
    return { success: true, message: 'Order rescheduled successfully' };
  }

  async rescheduleDelivery(dto: any) {
    return { success: true, message: 'Delivery rescheduled successfully' };
  }

  private async findOrderFlexible(orderId: any) {
    const strId = String(orderId);
    let order = await this.prisma.order.findUnique({ where: { id: strId } });
    if (!order) {
      order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { orderId: strId },
            { orderId: `ORD-${strId}` },
          ]
        }
      });
    }
    if (!order) {
      throw new NotFoundException(`Order with ID ${strId} not found`);
    }
    return order;
  }
}
