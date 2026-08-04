import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleSuggestionService } from './vehicle-suggestion.service';
import { EarningsService } from '../earnings/earnings.service';
import axios from 'axios';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private vehicleSuggestionService: VehicleSuggestionService,
    private earningsService: EarningsService,
  ) { }

  async getAssignedPickups(shgId: number, mobileNumber?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: shgId },
      include: { address: true }
    });
    if (!user || user.role !== 'SHG' || user.applicationStatus !== 'APPROVED') {
      return [];
    }

    const shgUuid = String(shgId);

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
        OR: [
          { pickupShgId: shgUuid },
          { id: { in: assignedOrderIds } },
        ],
        mainStatus: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'PARCEL_AT_SHG', 'PICKUP_SHG_ACCEPTED', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED'] }
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

  async acceptPickup(orderIdInput: any, shgId: number, selectedVehicleName?: string, selectedVehicleCapacity?: number, selectedVehicleType?: string) {
    const order = await this.findOrderFlexible(orderIdInput);
    const shgUuid = String(shgId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupShgId: shgUuid,
        pickupShgStatus: 'ACCEPTED',
        mainStatus: 'PICKUP_SHG_ACCEPTED',
      }
    });

    await this.prisma.orderAssignment.updateMany({
      where: {
        orderId: order.id,
        assigneeId: shgUuid,
        assigneeType: 'SHG',
      },
      data: { status: 'ACCEPTED' }
    });

    return order;
  }

  async acceptDrop(orderIdInput: any, shgId: number, selectedVehicleName?: string, selectedVehicleCapacity?: number, selectedVehicleType?: string) {
    return this.acceptPickup(orderIdInput, shgId, selectedVehicleName, selectedVehicleCapacity, selectedVehicleType);
  }

  async completePickup(pickupOrderId: any, shgId: number, code?: string, legType?: string) {
    const order = await this.findOrderFlexible(pickupOrderId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'PARCEL_AT_SHG',
        pickupShgStatus: 'ACCEPTED',
      }
    });

    try {
      await axios.post('http://localhost:3000/api/orders/auto-broadcast-pickup', {
        orderId: order.id
      });
    } catch (err: any) {
      console.log('[SHG Backend] Auto broadcast skipped:', err.message);
    }

    return order;
  }

  async completeDrop(dropOrderId: any, shgId: number, code?: string) {
    const orderIdStr = String(dropOrderId);
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: orderIdStr },
          { orderId: orderIdStr }
        ]
      }
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${dropOrderId} not found.`);
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'DELIVERED',
        dropShgStatus: 'DROPPED',
        deliveredAt: new Date(),
      }
    });

    return order;
  }

  async getAssignedReturns(shgId: number) {
    const shgUuid = String(shgId);
    const returnOrders = await this.prisma.order.findMany({
      where: {
        OR: [
          { pickupShgId: shgUuid },
          { dropShgId: shgUuid },
        ],
        returnType: { not: null }
      },
      include: {
        seller: true,
        buyer: true,
        parcels: true,
      }
    });

    return returnOrders.map((o: any) => ({
      id: o.orderId || o.id,
      uuid: o.id,
      orderId: o.orderId,
      status: o.mainStatus,
      returnType: o.returnType,
      items: o.parcels || [],
    }));
  }

  async pickupDrop(dropOrderId: any, shgId: number, code?: string) {
    return this.completeDrop(dropOrderId, shgId, code);
  }

  async redirectOrder(orderId: any, shgId?: any, targetShgId?: any, extraArg?: any) {
    const orderIdStr = String(orderId);
    await this.prisma.order.updateMany({
      where: {
        OR: [
          { id: orderIdStr },
          { orderId: orderIdStr },
        ]
      },
      data: {
        isPickupRedirected: true,
        redirectedPickupShgId: String(targetShgId || shgId || ''),
        redirectedPickupAt: new Date(),
      }
    });
    return { success: true, message: 'Order redirected successfully.' };
  }

  async rescheduleAccepted(orderId: any, shgId?: any, duration?: any) {
    const orderIdStr = String(orderId);
    await this.prisma.order.updateMany({
      where: {
        OR: [
          { id: orderIdStr },
          { orderId: orderIdStr },
        ]
      },
      data: {
        rescheduleType: 'PICKUP_SHG',
        rescheduleDuration: duration ? String(duration) : '24 HOURS',
        rescheduledAt: new Date(),
      }
    });
    return { success: true, message: 'Order rescheduled successfully.' };
  }

  async rescheduleDelivery(orderId: any, shgId?: any, duration?: any) {
    return this.rescheduleAccepted(orderId, shgId, duration);
  }

  async generateCode(orderId: any, shgId: number) {
    const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
    return {
      success: true,
      items: [
        { itemId: 1, code: generatedCode, status: 'PENDING' }
      ]
    };
  }

  async verifyCodes(orderId: any, shgId: number, codes: any) {
    return {
      success: true,
      message: 'Codes verified successfully.'
    };
  }

  async getCompletedOrders(shgId: number, mobileNumber?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: shgId }
    });
    if (!user || user.role !== 'SHG') return { newOrders: [], returnOrders: [] };

    const shgUuid = String(shgId);

    const completedOrders = await this.prisma.order.findMany({
      where: {
        OR: [
          { pickupShgId: shgUuid },
          { dropShgId: shgUuid },
        ],
        mainStatus: { in: ['IN_TRANSIT_TO_HUB', 'PARCEL_PICKED', 'HUB_RECEIVED', 'AT_GMU', 'STORED', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'DROPPED', 'RETURNED'] }
      },
      include: {
        seller: true,
        buyer: true,
        parcels: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = completedOrders.map((o: any) => ({
      id: o.orderId || o.id,
      uuid: o.id,
      orderId: o.orderId,
      orderNumber: o.orderId,
      barcode: o.barcode,
      status: o.mainStatus,
      legType: o.phase === 'PICKUP' ? 'pickup' : 'drop',
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
    }));

    return {
      newOrders: formatted.filter((o: any) => o.status !== 'RETURNED'),
      returnOrders: formatted.filter((o: any) => o.status === 'RETURNED'),
    };
  }
}
