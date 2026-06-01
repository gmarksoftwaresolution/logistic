import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Automatically populates mock orders for the SHG if none exist in the database yet.
   * This is a premium touch so that the newly logged in SHG immediately has cards in the UI.
   */
  private async autoSeedMockOrdersIfNoneExist(shgId: number): Promise<void> {
    const count = await this.prisma.order.count({
      where: { shgId },
    });

    if (count > 0) return;

    const shortId = shgId.toString();
    const mockOrders = [
      {
        orderId: `ORD-1769749895005-001-${shortId}`,
        parcelName: 'Smart LED TV 32 Inch',
        category: 'TV - Electronics',
        mobile: '8484830180',
        amount: 18500,
        payment: 'Prepaid',
        address: 'Ch.Shivaji Maharaj Chauk, Chandgad',
        deliveryDay: '1 DAY DELIVERY',
        status: OrderStatus.ASSIGNED,
        image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?q=80&w=400&auto=format&fit=crop',
        transporterName: 'Shreedhar Patil',
        transporterMobile: '9875898598',
        pickupTime: '10:20 AM',
        vehicleNumber: 'X6377GH',
        currentHolder: 'Seller',
        remainingQty: 4,
        weight: 20,
        time: '25 mins ago',
        shgId,
      },
      {
        orderId: `ORD-1769749895005-002-${shortId}`,
        parcelName: 'Samsung Double Door Fridge',
        category: 'Fridge - Electric',
        mobile: '9875898598',
        amount: 32000,
        payment: 'Online',
        address: 'Main Bazar Road, Gadhinglaj',
        deliveryDay: '1 DAY DELIVERY',
        status: OrderStatus.ASSIGNED,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400&auto=format&fit=crop',
        transporterName: 'Anil Patil',
        transporterMobile: '8484830180',
        pickupTime: '11:00 AM',
        vehicleNumber: 'Y9882HJ',
        currentHolder: 'Seller',
        remainingQty: 1,
        weight: 12,
        time: '45 mins ago',
        shgId,
      },
      {
        orderId: `ORD-1769749895005-003-${shortId}`,
        parcelName: 'Whirlpool Washing Machine 7kg',
        category: 'Washing Machine - Electric',
        mobile: '9654782390',
        amount: 22400,
        payment: 'Prepaid',
        address: 'Near Gram Panchayat, Kowad',
        deliveryDay: '2 DAY DELIVERY',
        status: OrderStatus.ASSIGNED,
        image: 'https://images.unsplash.com/photo-1610557892470-76d740220a3f?q=80&w=400&auto=format&fit=crop',
        transporterName: 'Sanjay Desai',
        transporterMobile: '9654782390',
        pickupTime: '02:30 PM',
        vehicleNumber: 'Z1029KL',
        currentHolder: 'Seller',
        remainingQty: 3,
        weight: 35,
        time: '1 hr ago',
        shgId,
      },
      {
        orderId: `ORD-1769749895005-004-${shortId}`,
        parcelName: 'IFB Microwave Oven 20L',
        category: 'Microwave - Electronics',
        mobile: '8877665544',
        amount: 9800,
        payment: 'Online',
        address: 'Market Yard, Ajara',
        deliveryDay: '1 DAY DELIVERY',
        status: OrderStatus.ASSIGNED,
        image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?q=80&w=400&auto=format&fit=crop',
        transporterName: 'Rajesh Shinde',
        transporterMobile: '8877665544',
        pickupTime: '04:15 PM',
        vehicleNumber: 'W8823NM',
        currentHolder: 'Seller',
        remainingQty: 1,
        weight: 20,
        time: '1 hr ago',
        shgId,
      },
    ];

    await this.prisma.order.createMany({
      data: mockOrders,
    });
  }

  async getIncomingOrders(shgId: number) {
    await this.autoSeedMockOrdersIfNoneExist(shgId);

    return this.prisma.order.findMany({
      where: {
        shgId,
        status: OrderStatus.ASSIGNED,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async acceptOrders(shgId: number, orderIds: number[]) {
    const result = await this.prisma.order.updateMany({
      where: {
        shgId,
        id: { in: orderIds },
        status: OrderStatus.ASSIGNED,
      },
      data: {
        status: OrderStatus.ACCEPTED,
        currentHolder: 'SHG',
        acceptedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new BadRequestException('No eligible pending orders were found to accept.');
    }

    return { count: result.count, message: 'Orders accepted successfully.' };
  }

  async acceptAllOrders(shgId: number) {
    const result = await this.prisma.order.updateMany({
      where: {
        shgId,
        status: OrderStatus.ASSIGNED,
      },
      data: {
        status: OrderStatus.ACCEPTED,
        currentHolder: 'SHG',
        acceptedAt: new Date(),
      },
    });

    return { count: result.count, message: 'All pending orders accepted successfully.' };
  }

  async rejectOrders(shgId: number, orderIds: number[], reason: string) {
    const result = await this.prisma.order.updateMany({
      where: {
        shgId,
        id: { in: orderIds },
      },
      data: {
        status: OrderStatus.REJECTED,
        rejectReason: reason,
        rejectedAt: new Date(),
        rejectedBy: 'SHG Hub',
      },
    });

    if (result.count === 0) {
      throw new BadRequestException('No eligible orders were found to reject.');
    }

    return { count: result.count, message: 'Orders rejected successfully.' };
  }

  async rescheduleOrders(shgId: number, orderIds: number[], date: string, time: string, reason?: string) {
    const result = await this.prisma.order.updateMany({
      where: {
        shgId,
        id: { in: orderIds },
      },
      data: {
        isRescheduled: true,
        rescheduleDate: date,
        rescheduleTime: time,
        rescheduleReason: reason || null,
      },
    });

    if (result.count === 0) {
      throw new BadRequestException('No eligible orders were found to reschedule.');
    }

    return { count: result.count, message: 'Orders rescheduled successfully.' };
  }

  async getAcceptedOrders(shgId: number) {
    return this.prisma.order.findMany({
      where: {
        shgId,
        status: OrderStatus.ACCEPTED,
      },
      orderBy: {
        acceptedAt: 'desc',
      },
    });
  }

  async getRejectedOrders(shgId: number) {
    return this.prisma.order.findMany({
      where: {
        shgId,
        status: OrderStatus.REJECTED,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getCompletedOrders(shgId: number) {
    return this.prisma.order.findMany({
      where: {
        shgId,
        status: OrderStatus.COMPLETED,
      },
      orderBy: {
        completedAt: 'desc',
      },
    });
  }
}
