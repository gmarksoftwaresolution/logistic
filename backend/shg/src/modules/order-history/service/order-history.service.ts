import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { HistoryQueryDto, OrderHistoryStatus } from '../dto/history-query.dto';
import { IHistoryStats, IHistoryResponse } from '../interfaces/history.interface';

@Injectable()
export class OrderHistoryService {
  constructor(private prisma: PrismaService) {}

  async getHistory(shgId: number, mobileNumber: string, queryDto: HistoryQueryDto): Promise<IHistoryResponse> {
    const { page = 1, limit = 20, query, status, fromDate, toDate } = queryDto;
    const skip = (page - 1) * limit;

    const commonDateFilter: any = {};
    if (fromDate || toDate) {
      commonDateFilter.createdAt = {};
      if (fromDate) commonDateFilter.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        commonDateFilter.createdAt.lte = to;
      }
    }

    let statusCondition: any = { in: ['DELIVERED', 'COMPLETED', 'CANCELLED'] };
    if (status && status === OrderHistoryStatus.COMPLETED) {
      statusCondition = { in: ['DELIVERED', 'COMPLETED'] };
    }

    const fetchLimit = skip + limit;

    const assignedOrders = await this.prisma.orderAssignment.findMany({
      where: {
        assigneeId: String(shgId),
        assigneeType: 'SHG',
      },
      select: { orderId: true, role: true }
    });

    const assignedOrderIds = assignedOrders.map(a => a.orderId);

    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          { id: { in: assignedOrderIds } },
          { pickupShgId: String(shgId) },
          { dropShgId: String(shgId) },
        ],
        mainStatus: statusCondition,
        ...commonDateFilter,
      },
      include: {
        seller: true,
        buyer: true,
        parcels: true,
      },
      orderBy: { createdAt: 'desc' },
      take: fetchLimit,
    });

    const mappedOrders = orders.map((o: any) => ({
      ...o,
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

    const paginatedItems = mappedOrders.slice(skip, skip + limit);

    return {
      items: paginatedItems,
      pagination: {
        total: mappedOrders.length,
        page,
        limit,
        totalPages: Math.ceil(mappedOrders.length / limit),
      }
    };
  }

  async getStats(shgId: number): Promise<IHistoryStats> {
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          { pickupShgId: String(shgId) },
          { dropShgId: String(shgId) },
        ],
        mainStatus: { in: ['DELIVERED', 'COMPLETED', 'CANCELLED'] }
      },
      select: { mainStatus: true }
    });

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.mainStatus === 'DELIVERED' || o.mainStatus === 'COMPLETED').length;

    return {
      totalOrders,
      completedOrders,
    };
  }

  async getOrderById(id: string, shgId: number) {
    const cleanId = id.replace('pickup-', '').replace('drop-', '');

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { orderId: cleanId },
        ]
      },
      include: {
        seller: true,
        buyer: true,
        parcels: true,
      }
    }) as any;

    if (order) {
      order.seller = order.seller ? {
        fullName: order.seller.sellerName,
        phoneNumber: order.seller.mobileNumber,
        address: {
          houseNo: order.seller.addressLine1 || '',
          village: order.seller.village,
          taluka: order.seller.taluka,
          district: order.seller.district,
          pincode: order.seller.pincode,
        }
      } : null;
      order.buyer = order.buyer ? {
        fullName: order.buyer.buyerName,
        phoneNumber: order.buyer.mobileNumber,
        address: {
          houseNo: order.buyer.addressLine1 || '',
          village: order.buyer.village,
          taluka: order.buyer.taluka,
          district: order.buyer.district,
          pincode: order.buyer.pincode,
        }
      } : null;
      order.items = order.parcels || [];
    }

    return order;
  }
}
