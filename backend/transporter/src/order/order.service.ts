import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

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
          { pickupTransporterId: transporterUuid },
          { returnTransporterId: transporterUuid },
        ],
        mainStatus: { in: ['PENDING', 'ACCEPTED', 'PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG', 'RETURN_PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_HUB', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_PICKED'] }
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
        orderNumber: cleanOrderId,
        barcode: o.barcode,
        status: o.mainStatus,
        transporterId: o.pickupTransporterId,
        pickupTransporterId: o.pickupTransporterId,
        pickupTransporterStatus: o.pickupTransporterStatus || 'TRANSPORTER_ACCEPTED',
        mainStatus: o.mainStatus,
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
      items: o.parcels || [],
      };
    });
  }

  private async findOrderFlexible(orderIdInput: any) {
    const rawStr = String(orderIdInput || '').trim();
    const cleanStr = rawStr.replace(/^(pickup|drop|return)-/i, '').replace(/^ORD-/i, '').trim();

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: rawStr },
          { orderId: rawStr },
          { orderId: `ORD-${cleanStr}` },
          { orderId: cleanStr },
          { id: cleanStr },
        ]
      }
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderIdInput} not found.`);
    }

    return order;
  }

  async acceptPickup(pickupOrderId: any, transporterId: number) {
    const order = await this.findOrderFlexible(pickupOrderId);
    const transporterUuid = String(transporterId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupTransporterId: transporterUuid,
        pickupTransporterStatus: 'TRANSPORTER_ACCEPTED',
        mainStatus: 'TRANSPORTER_ACCEPTED',
      }
    });

    const updatedAssignments = await this.prisma.orderAssignment.updateMany({
      where: {
        orderId: order.id,
        assigneeId: transporterUuid,
        assigneeType: 'TRANSPORTER',
      },
      data: { status: 'ACCEPTED' }
    });

    if (updatedAssignments.count === 0) {
      await this.prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: transporterUuid,
          assigneeType: 'TRANSPORTER',
          role: 'PICKUP',
          status: 'ACCEPTED',
        }
      }).catch(() => {});
    }

    return order;
  }

  async completePickup(pickupOrderId: any, transporterId: number, code?: string) {
    const order = await this.findOrderFlexible(pickupOrderId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'IN_TRANSIT_TO_HUB',
        pickupTransporterStatus: 'IN_TRANSIT_TO_HUB',
      }
    });

    return order;
  }

  async getAssignedDrops(transporterId: number, mobileNumber?: string) {
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
          { dropTransporterId: transporterUuid },
        ],
        mainStatus: { in: ['DISPATCHED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT_TO_BUYER', 'PARCEL_AT_DROP_SHG'] }
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
        transporterId: o.dropTransporterId,
        dropTransporterId: o.dropTransporterId,
        dropTransporterStatus: o.dropTransporterStatus || 'TRANSPORTER_ACCEPTED',
        mainStatus: o.mainStatus,
        items: o.parcels || [],
      };
    });
  }

  async acceptDrop(dropOrderId: any, transporterId: number) {
    const order = await this.findOrderFlexible(dropOrderId);
    const transporterUuid = String(transporterId);

    const updatedAssignments = await this.prisma.orderAssignment.updateMany({
      where: {
        orderId: order.id,
        assigneeId: transporterUuid,
        assigneeType: 'TRANSPORTER',
      },
      data: { status: 'ACCEPTED' }
    });

    if (updatedAssignments.count === 0) {
      await this.prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: transporterUuid,
          assigneeType: 'TRANSPORTER',
          role: 'DROP',
          status: 'ACCEPTED',
        }
      }).catch(() => {});
    }

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

  async generateDropHandoverCode(orderId: any, transporterId: number) {
    return { success: true, code: '1234' };
  }

  async completeDropPickup(orderId: any, transporterId: number, code?: string) {
    return this.completeDrop(orderId, transporterId, code);
  }

  async rejectDrop(orderId: any, transporterId: number, reason?: string) {
    return { success: true, message: 'Drop rejected.' };
  }

  async bulkAccept(orderIds: any[], transporterId: number) {
    for (const id of orderIds) {
      await this.acceptPickup(id, transporterId);
    }
    return { success: true, count: orderIds.length };
  }

  async getCompletedOrders(transporterId: number) {
    const transporterUuid = String(transporterId);

    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          { pickupTransporterId: transporterUuid },
          { dropTransporterId: transporterUuid },
        ],
        mainStatus: { in: ['DELIVERED', 'COMPLETED', 'AT_GMU', 'AT_BUYER_SHG'] }
      },
      include: {
        seller: true,
        buyer: true,
        parcels: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      newOrders: orders,
      returnOrders: [],
    };
  }
}
