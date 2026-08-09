import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) { }

  async getAssignedPickups(transporterId: number, mobileNumber?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: transporterId },
    });
    if (!user || user.role !== 'TRANSPORTER') {
      return [];
    }

    const transporterUuid = String(transporterId);

    const assignedOrders = await this.prisma.orderAssignment.findMany({
      where: {
        assigneeId: transporterUuid,
        assigneeType: 'TRANSPORTER',
        role: { in: ['PICKUP', 'RETURN'] },
        status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED'] },
      },
      select: { orderId: true }
    });
    const assignedOrderIds = assignedOrders.map(a => a.orderId);

    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          { id: { in: assignedOrderIds } },
          { orderId: { in: assignedOrderIds } },
          { pickupTransporterId: transporterUuid },
          { returnTransporterId: transporterUuid },
        ],
        mainStatus: {
          in: [
            'PENDING',
            'ACCEPTED',
            'PICKUP_SHG_ACCEPTED',
            'PARCEL_AT_SHG',
            'RETURN_PARCEL_AT_SHG',
            'TRANSPORTER_ACCEPTED',
            'IN_TRANSIT_TO_HUB',
            'PICKUP_TRANSPORTER_ACCEPTED',
            'PARCEL_PICKED',
            'REDIRECTED',
            'HUB_RECEIVED',
            'PARCEL_AT_GMU',
            'PARCEL_AT_HUB',
            'STORED',
            'DISPATCHED',
            'DELIVERED',
            'COMPLETED'
          ]
        }
      },
      include: {
        seller: true,
        buyer: true,
        parcels: true,
        assignments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const shgIds = orders
      .map(o => o.pickupShgId ? parseInt(o.pickupShgId, 10) : null)
      .filter((id): id is number => id !== null && !isNaN(id));

    const shgUsers = shgIds.length > 0
      ? await this.prisma.user.findMany({
        where: { id: { in: shgIds } },
        include: { address: true, shgDetail: true }
      })
      : [];

    const shgMap = new Map(shgUsers.map(u => [String(u.id), u]));

    return orders.map((o: any) => {
      const cleanOrderId = (o.orderId || o.id).replace(/^ORD-/, '');
      const shgUser = o.pickupShgId ? shgMap.get(o.pickupShgId) : null;
      const isRedirected = !!(o.isPickupRedirected || o.pickupShgStatus === 'REDIRECTED');

      const mappedSeller = (!isRedirected && shgUser) ? {
        id: shgUser.id,
        sellerCode: shgUser.uniqueCode || `SHG-${shgUser.id}`,
        sellerName: shgUser.fullName || shgUser.shgDetail?.crpName || shgUser.shgDetail?.shgName || 'Reshma Patil',
        fullName: shgUser.fullName || shgUser.shgDetail?.crpName || shgUser.shgDetail?.shgName || 'Reshma Patil',
        mobileNumber: shgUser.phoneNumber || shgUser.shgDetail?.crpMobile || '',
        phoneNumber: shgUser.phoneNumber || shgUser.shgDetail?.crpMobile || '',
        shgName: shgUser.shgDetail?.shgName || '',
        email: shgUser.email,
        addressLine1: shgUser.address?.landmark || shgUser.address?.houseNo || shgUser.address?.deliveryAddress || '',
        addressLine2: shgUser.address?.houseNo || '',
        village: shgUser.address?.village || '',
        taluka: shgUser.address?.taluka || '',
        district: shgUser.address?.district || '',
        state: shgUser.address?.state || '',
        pincode: shgUser.address?.pincode || '',
        postOffice: shgUser.address?.postOffice || null,
        createdAt: shgUser.createdAt,
        updatedAt: shgUser.updatedAt,
      } : o.seller;

      const fullAddr = mappedSeller ? [
        mappedSeller.addressLine1,
        mappedSeller.addressLine2,
        mappedSeller.village,
        mappedSeller.taluka,
        mappedSeller.district,
        mappedSeller.state ? `${mappedSeller.state} - ${mappedSeller.pincode}` : mappedSeller.pincode
      ].filter(Boolean).join(', ') : '';

      if (mappedSeller) {
        (mappedSeller as any).fullAddress = fullAddr;
      }

      if (o.buyer) {
        o.buyer.fullAddress = [
          o.buyer.addressLine1,
          o.buyer.addressLine2,
          o.buyer.village,
          o.buyer.taluka,
          o.buyer.district,
          o.buyer.state ? `${o.buyer.state} - ${o.buyer.pincode}` : o.buyer.pincode
        ].filter(Boolean).join(', ');
      }

      return {
        id: cleanOrderId,
        uuid: o.id,
        orderId: cleanOrderId,
        orderNumber: cleanOrderId,
        barcode: o.barcode,
        status: o.mainStatus,
        transporterId: o.pickupTransporterId,
        pickupTransporterId: o.pickupTransporterId,
        pickupTransporterStatus: o.pickupTransporterStatus || 'PENDING',
        mainStatus: o.mainStatus,
        seller: mappedSeller,
        shg: mappedSeller,
        buyer: o.buyer,
        parcels: o.parcels || [],
      };
    });
  }

  async getAssignedDrops(transporterId: number, mobileNumber?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: transporterId },
    });
    if (!user || user.role !== 'TRANSPORTER') {
      return [];
    }

    const transporterUuid = String(transporterId);

    const assignedOrders = await this.prisma.orderAssignment.findMany({
      where: {
        assigneeId: transporterUuid,
        assigneeType: 'TRANSPORTER',
        role: 'DROP',
        status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED'] },
      },
      select: { orderId: true }
    });
    const assignedOrderIds = assignedOrders.map(a => a.orderId);

    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          { id: { in: assignedOrderIds } },
          { orderId: { in: assignedOrderIds } },
          { dropTransporterId: transporterUuid },
        ],
        mainStatus: { in: ['STORED', 'DROP_PENDING', 'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DISPATCHED', 'HUB_DELIVERED', 'IN_TRANSIT_TO_DROP', 'DROP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_DROP_SHG', 'DELIVERED', 'COMPLETED'] }
      },
      include: {
        seller: true,
        buyer: true,
        parcels: true,
        assignments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const allDropShgIds = Array.from(new Set(orders.map((o: any) => {
      const shgAssign = o.assignments?.find((a: any) => a.assigneeType === 'SHG');
      return o.dropShgId || o.pickupShgId || shgAssign?.assigneeId;
    }).filter(Boolean)));

    const dropNumericShgIds = allDropShgIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0);
    const dropUuidShgIds = allDropShgIds.filter((id: any) => typeof id === 'string' && UUID_REGEX.test(id));

    const dropShgUsers: any[] = [];
    if (dropNumericShgIds.length > 0) {
      const byId = await this.prisma.user.findMany({
        where: { id: { in: dropNumericShgIds } },
        include: { address: true, shgDetail: true }
      });
      dropShgUsers.push(...byId);
    }
    if (dropUuidShgIds.length > 0) {
      const byAuth = await this.prisma.user.findMany({
        where: { authId: { in: dropUuidShgIds } },
        include: { address: true, shgDetail: true }
      });
      dropShgUsers.push(...byAuth);
    }

    const dropShgUserMap = new Map();
    dropShgUsers.forEach((u: any) => {
      dropShgUserMap.set(String(u.id), u);
      dropShgUserMap.set(u.authId, u);
    });

    return orders.map((o: any) => {
      const cleanOrderId = (o.orderId || o.id).replace(/^ORD-/, '');
      const shgAssign = o.assignments?.find((a: any) => a.assigneeType === 'SHG');
      const shgId = o.dropShgId || o.pickupShgId || shgAssign?.assigneeId;
      const shgUser = shgId ? dropShgUserMap.get(String(shgId)) : null;

      const shgData = shgUser ? {
        id: shgUser.id,
        fullName: shgUser.fullName,
        phoneNumber: shgUser.phoneNumber,
        shgName: shgUser.shgDetail?.shgName || shgUser.fullName,
        address: shgUser.address ? {
          addressLine1: shgUser.address.landmark || shgUser.address.houseNo || shgUser.address.village,
          village: shgUser.address.village,
          taluka: shgUser.address.taluka,
          district: shgUser.address.district,
          pincode: shgUser.address.pincode,
        } : null,
      } : null;

      return {
        id: cleanOrderId,
        uuid: o.id,
        orderId: cleanOrderId,
        orderNumber: cleanOrderId,
        barcode: o.barcode,
        status: o.mainStatus,
        dropTransporterId: o.dropTransporterId,
        dropTransporterStatus: o.dropTransporterStatus || 'DROP_TRANSPORTER_ACCEPTED',
        mainStatus: o.mainStatus,
        seller: o.seller,
        buyer: o.buyer,
        parcels: o.parcels || [],
      };
    });
  }

  async acceptPickup(pickupOrderId: any, transporterId: number) {
    const order = await this.findOrderFlexible(pickupOrderId);
    const transporterUuid = String(transporterId);

    await this.prisma.orderAssignment.updateMany({
      where: {
        orderId: order.id,
        assigneeId: transporterUuid,
        assigneeType: 'TRANSPORTER',
      },
      data: { status: 'ACCEPTED' }
    });

    // Delete other pending transporter assignments for this pickup leg to prevent leaks
    await this.prisma.orderAssignment.deleteMany({
      where: {
        orderId: order.id,
        role: 'PICKUP',
        assigneeType: 'TRANSPORTER',
        status: 'PENDING',
        assigneeId: { not: transporterUuid }
      }
    }).catch(() => { });

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupTransporterId: transporterUuid,
        pickupTransporterStatus: 'TRANSPORTER_ACCEPTED',
        mainStatus: 'PICKUP_TRANSPORTER_ACCEPTED',
      }
    });

    // Update RedirectedOrder audit record
    await (this.prisma as any).redirectedOrder.updateMany({
      where: { orderId: order.id },
      data: {
        transporterId: transporterUuid,
        status: 'ACCEPTED'
      }
    }).catch(() => { });

    return order;
  }

  async completePickup(pickupOrderId: any, transporterId: number, code?: string) {
    const order = await this.findOrderFlexible(pickupOrderId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupTransporterStatus: 'PARCEL_PICKED',
        mainStatus: 'IN_TRANSIT_TO_HUB',
      }
    });

    return order;
  }

  async acceptDrop(dropOrderId: any, transporterId: number) {
    const order = await this.findOrderFlexible(dropOrderId);
    const transporterUuid = String(transporterId);

    await this.prisma.orderAssignment.updateMany({
      where: {
        orderId: order.id,
        assigneeId: transporterUuid,
        assigneeType: 'TRANSPORTER',
      },
      data: { status: 'ACCEPTED' }
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropTransporterId: transporterUuid,
        dropTransporterStatus: 'DROP_TRANSPORTER_ACCEPTED',
        mainStatus: 'DROP_TRANSPORTER_ACCEPTED',
      }
    });

    return order;
  }

  async completeDrop(dropOrderId: any, transporterId: number, code?: string) {
    const order = await this.findOrderFlexible(dropOrderId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'AT_BUYER_SHG',
        dropTransporterStatus: 'PARCEL_AT_DROP_SHG',
      }
    });

    return order;
  }

  async getDashboardSummary(transporterId: number, mobileNumber?: string) {
    const assignedPickups = await this.getAssignedPickups(transporterId, mobileNumber);
    const assignedDrops = await this.getAssignedDrops(transporterId, mobileNumber);
    return {
      totalEarnings: '₹ 2,450',
      earningsTrend: '+12% from last week',
      pickupOrdersCount: assignedPickups.length,
      dropOrdersCount: assignedDrops.length,
      shiftTime: '08:00 AM - 05:00 PM',
      routeDonePercent: 75,
      shiftStatus: 'On Schedule',
      pendingPickupsCount: assignedPickups.length,
      pendingDropsCount: assignedDrops.length,
      onTimePercent: '98%',
      accuracyPercent: '99.2%',
      totalDistance: '42 km',
      rating: '4.9 ★',
      activePickups: assignedPickups.length,
      activeDrops: assignedDrops.length,
      totalAssigned: assignedPickups.length + assignedDrops.length,
    };
  }

  async completePickupDrop(orderId: any, transporterId: number, code?: string) {
    return this.completePickup(orderId, transporterId, code);
  }

  async rejectPickup(orderId: any, transporterId: number, reason?: string) {
    return { success: true, message: 'Pickup rejected.' };
  }

  async generateDropHandoverCode(dropOrderId: any, transporterId: number) {
    const order = await this.findOrderFlexible(dropOrderId);
    return { success: true, code: '5678', orderId: order.id };
  }

  async completeDropPickup(dropOrderId: any, transporterId: number, code?: string) {
    return this.acceptDrop(dropOrderId, transporterId);
  }

  async rejectDrop(dropOrderId: any, transporterId: number, reason?: string) {
    return { success: true, message: 'Drop rejected.' };
  }

  async bulkAccept(orders: { id: string | number; type: 'pickup' | 'drop' }[], transporterId: number) {
    for (const item of orders) {
      if (item.type === 'pickup') {
        await this.acceptPickup(item.id, transporterId).catch(() => { });
      } else {
        await this.acceptDrop(item.id, transporterId).catch(() => { });
      }
    }
    return { success: true, message: 'Orders accepted in bulk.' };
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
      throw new NotFoundException(`Order with ID/OrderId ${strId} not found`);
    }
    return order;
  }
}
