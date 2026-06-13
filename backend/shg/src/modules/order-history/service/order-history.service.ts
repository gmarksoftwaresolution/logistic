import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { HistoryQueryDto, OrderHistoryStatus } from '../dto/history-query.dto';
import { IHistoryStats, IHistoryResponse } from '../interfaces/history.interface';

@Injectable()
export class OrderHistoryService {
  constructor(private prisma: PrismaService) {}

  async getHistory(shgId: number, queryDto: HistoryQueryDto): Promise<IHistoryResponse> {
    const { page = 1, limit = 20, query, status, fromDate, toDate } = queryDto;
    const skip = (page - 1) * limit;

    // Build common where conditions
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

    let pickupWhere: any = { shgId, ...commonDateFilter };
    let dropWhere: any = { shgId, ...commonDateFilter };

    if (status && status !== OrderHistoryStatus.ALL) {
      if (status === OrderHistoryStatus.COMPLETED) {
        pickupWhere.status = 'COMPLETED';
        dropWhere.status = 'COMPLETED';
      } else if (status === OrderHistoryStatus.REJECTED) {
        pickupWhere.status = { in: ['REJECTED', 'CANCELLED'] };
        dropWhere.status = { in: ['REJECTED', 'CANCELLED'] };
      }
    } else {
      // Order History is Read-Only, only fetch Completed/Rejected
      pickupWhere.status = { in: ['COMPLETED', 'REJECTED', 'CANCELLED'] };
      dropWhere.status = { in: ['COMPLETED', 'REJECTED', 'CANCELLED'] };
    }

    const fetchLimit = skip + limit;

    const [pickups, drops] = await Promise.all([
      this.prisma.pickupOrder.findMany({
        where: pickupWhere,
        include: {
          seller: { select: { fullName: true, phoneNumber: true, address: true } },
          items: { include: { product: true } },
          masterOrder: true,
          tracking: true,
        },
        orderBy: { createdAt: 'desc' },
        take: fetchLimit,
      }),
      this.prisma.dropOrder.findMany({
        where: dropWhere,
        include: {
          buyer: { select: { fullName: true, phoneNumber: true, address: true } },
          items: { include: { product: true } },
          masterOrder: {
            include: { items: { include: { seller: { include: { address: true } } } } },
          },
          tracking: true,
        },
        orderBy: { createdAt: 'desc' },
        take: fetchLimit,
      })
    ]);

    // Map to unified format
    const mappedPickups = pickups.map(p => ({ ...p, legType: 'pickup' }));
    const mappedDrops = drops.map(d => ({ ...d, legType: 'drop' }));

    let allOrders = [...mappedPickups, ...mappedDrops].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    if (query) {
      const q = query.toLowerCase();
      allOrders = allOrders.filter(o => 
        (o.masterOrder?.orderNumber && o.masterOrder.orderNumber.toLowerCase().includes(q))
      );
    }

    const totalCount = allOrders.length;
    const paginatedOrders = allOrders.slice(skip, skip + limit);

    // Grouping
    const groups: { title: string; data: any[] }[] = [];
    const titleMap: { [key: string]: number } = {};
    
    paginatedOrders.forEach(order => {
      const dateObj = new Date(order.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateString = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      
      let title = dateString;
      if (dateObj.toDateString() === today.toDateString()) {
        title = `Today, ${dateString}`;
      } else if (dateObj.toDateString() === yesterday.toDateString()) {
        title = `Yesterday, ${dateString}`;
      }
      
      if (titleMap[title] !== undefined) {
        groups[titleMap[title]].data.push(order);
      } else {
        titleMap[title] = groups.length;
        groups.push({ title, data: [order] });
      }
    });

    const stats = await this.getStats(shgId);

    return {
      success: true,
      stats,
      groupedOrders: groups,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      }
    };
  }

  async getStats(shgId: number): Promise<IHistoryStats> {
    const [pickups, drops] = await Promise.all([
      this.prisma.pickupOrder.findMany({ 
        where: { shgId, status: { in: ['COMPLETED', 'REJECTED', 'CANCELLED'] } }, 
        select: { status: true } 
      }),
      this.prisma.dropOrder.findMany({ 
        where: { shgId, status: { in: ['COMPLETED', 'REJECTED', 'CANCELLED'] } }, 
        select: { status: true } 
      })
    ]);

    const all = [...pickups, ...drops];

    const totalOrders = all.length;
    const completedOrders = all.filter(o => o.status === 'COMPLETED').length;
    const rejectedOrders = all.filter(o => ['CANCELLED', 'REJECTED'].includes(o.status)).length;

    return {
      totalOrders,
      completedOrders,
      rejectedOrders,
    };
  }

  async getOrderById(id: string, shgId: number) {
    const pickupId = parseInt(id.replace('pickup-', ''), 10);
    const dropId = parseInt(id.replace('drop-', ''), 10);

    if (!isNaN(pickupId) && id.includes('pickup-')) {
      return this.prisma.pickupOrder.findFirst({
        where: { id: pickupId, shgId },
        include: {
          seller: { select: { fullName: true, phoneNumber: true, address: true } },
          items: { include: { product: true } },
          masterOrder: true,
          tracking: { orderBy: { updatedAt: 'desc' } },
        }
      });
    }

    if (!isNaN(dropId) && id.includes('drop-')) {
      return this.prisma.dropOrder.findFirst({
        where: { id: dropId, shgId },
        include: {
          buyer: { select: { fullName: true, phoneNumber: true, address: true } },
          items: { include: { product: true } },
          masterOrder: {
            include: { items: { include: { seller: { include: { address: true } } } } },
          },
          tracking: { orderBy: { updatedAt: 'desc' } },
        }
      });
    }

    const pickup = await this.prisma.pickupOrder.findFirst({
        where: { masterOrder: { orderNumber: id }, shgId },
        include: {
          seller: { select: { fullName: true, phoneNumber: true, address: true } },
          items: { include: { product: true } },
          masterOrder: true,
          tracking: { orderBy: { updatedAt: 'desc' } },
        }
    });

    if (pickup) return pickup;

    return this.prisma.dropOrder.findFirst({
        where: { masterOrder: { orderNumber: id }, shgId },
        include: {
          buyer: { select: { fullName: true, phoneNumber: true, address: true } },
          items: { include: { product: true } },
          masterOrder: {
            include: { items: { include: { seller: { include: { address: true } } } } },
          },
          tracking: { orderBy: { updatedAt: 'desc' } },
        }
    });
  }
}
