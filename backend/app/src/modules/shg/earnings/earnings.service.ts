import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export const PER_ORDER_RATE = 15.00;
export const REDIRECTED_ORDER_RATE = 5.00;
export const DEFAULT_PAGE = 1;
export const MAX_LIMIT = 100;

export function buildEarningOrderId(orderNumber: string): string {
  return orderNumber;
}

@Injectable()
export class EarningsService {
  constructor(private prisma: PrismaService) {}

  async createForCompletedOrder(tx: any, shgId: number, orderNumber: string, completedAt: Date, isRedirected: boolean = false) {
    const orderId = buildEarningOrderId(orderNumber);
    const amount = isRedirected ? REDIRECTED_ORDER_RATE : PER_ORDER_RATE;
    const earningType = isRedirected ? 'REDIRECTED' : 'NORMAL';
    
    // Application-level duplicate check
    // @ts-ignore
    const existing = await tx.earning.findUnique({
      where: { shgId_orderId: { shgId, orderId } }
    });
    
    if (existing) {
      // Earning already exists, do not duplicate.
      return existing;
    }

    // Save record inside transaction
    // @ts-ignore
    return tx.earning.create({
      data: {
        shgId,
        orderId,
        orderNumber,
        amount,
        earningType,
        completedAt,
      }
    });
  }

  private async syncMissingEarnings(shgId: number) {
    try {
      const shgUuid = String(shgId);

      // 1. Completed Pickup Orders for this SHG
      const completedPickups = await this.prisma.order.findMany({
        where: {
          AND: [
            {
              OR: [
                { pickupShgId: shgUuid },
                { redirectedPickupShgId: shgUuid }
              ]
            },
            {
              OR: [
                { pickupShgStatus: { in: ['DROPPED', 'COMPLETED', 'REDIRECTED'] } },
                { mainStatus: { in: ['IN_TRANSIT_TO_HUB', 'HUB_RECEIVED', 'STORED', 'DISPATCHED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'AT_BUYER_SHG', 'DELIVERED', 'COMPLETED', 'REDIRECTED'] } },
                { isPickupRedirected: true }
              ]
            }
          ]
        }
      });

      // 2. Completed Drop Orders for this SHG
      const completedDrops = await this.prisma.order.findMany({
        where: {
          dropShgId: shgUuid,
          OR: [
            { dropShgStatus: { in: ['DROPPED', 'COMPLETED', 'DELIVERED'] } },
            { mainStatus: { in: ['DELIVERED', 'COMPLETED'] } }
          ]
        }
      });

      // 3. Check existing earnings records
      const existingEarnings = await this.prisma.earning.findMany({
        where: { shgId },
        select: { orderId: true }
      });
      const existingOrderIds = new Set(existingEarnings.map((e: any) => e.orderId));

      // Insert Pickup Earnings
      for (const p of completedPickups) {
        const isRedirected = !!(p.isPickupRedirected || p.pickupShgStatus === 'REDIRECTED' || p.mainStatus === 'REDIRECTED');
        const rate = isRedirected ? REDIRECTED_ORDER_RATE : PER_ORDER_RATE;
        const earningType = isRedirected ? 'REDIRECTED' : 'NORMAL';

        const cleanNumber = (p.orderId || p.id).replace(/^ORD-/, '');
        const orderNumberStr = `ORD-${cleanNumber}`;
        const earningKey = `PICKUP-${p.id}`;

        if (!existingOrderIds.has(earningKey) && !existingOrderIds.has(orderNumberStr) && !existingOrderIds.has(cleanNumber)) {
          const completedAt = p.updatedAt || p.createdAt || new Date();
          try {
            await this.prisma.earning.create({
              data: {
                shgId,
                orderId: earningKey,
                orderNumber: orderNumberStr,
                amount: rate,
                earningType,
                completedAt,
              }
            });
            existingOrderIds.add(earningKey);
          } catch (err) {
            console.error(`Failed to backfill pickup earning for SHG ${shgId} Order ${p.id}:`, err);
          }
        }
      }

      // Insert Drop Earnings
      for (const d of completedDrops) {
        const cleanNumber = (d.orderId || d.id).replace(/^ORD-/, '');
        const orderNumberStr = `ORD-${cleanNumber}`;
        const earningKey = `DROP-${d.id}`;

        if (!existingOrderIds.has(earningKey) && !existingOrderIds.has(orderNumberStr) && !existingOrderIds.has(cleanNumber)) {
          const completedAt = d.deliveredAt || d.updatedAt || d.createdAt || new Date();
          try {
            await this.prisma.earning.create({
              data: {
                shgId,
                orderId: earningKey,
                orderNumber: orderNumberStr,
                amount: PER_ORDER_RATE,
                earningType: 'NORMAL',
                completedAt,
              }
            });
            existingOrderIds.add(earningKey);
          } catch (err) {
            console.error(`Failed to backfill drop earning for SHG ${shgId} Order ${d.id}:`, err);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to sync missing earnings for SHG ${shgId}:`, error);
    }
  }

  async getEarnings(shgId: number, filter: string = 'today', page: number = DEFAULT_PAGE, limit: number = 20) {
    await this.syncMissingEarnings(shgId);

    const validLimit = Math.min(Number(limit) || 20, MAX_LIMIT);
    const validPage = Math.max(Number(page) || 1, 1);
    const skip = (validPage - 1) * validLimit;

    const now = new Date();
    let startDate: Date;

    if (filter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filter === 'week') {
      const day = now.getDay() || 7;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    } else if (filter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      throw new BadRequestException('Invalid filter value. Supported values: today, week, month');
    }

    // Today's, week's and month's earnings for the summary cards
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = now.getDay() || 7;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayAgg, weekAgg, monthAgg, allTimeAgg, aggregations] = await Promise.all([
      // @ts-ignore
      this.prisma.earning.aggregate({
        where: { shgId, completedAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      // @ts-ignore
      this.prisma.earning.aggregate({
        where: { shgId, completedAt: { gte: weekStart } },
        _sum: { amount: true },
      }),
      // @ts-ignore
      this.prisma.earning.aggregate({
        where: { shgId, completedAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      // @ts-ignore
      this.prisma.earning.aggregate({
        where: { shgId },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      // @ts-ignore
      this.prisma.earning.aggregate({
        where: { shgId, completedAt: { gte: startDate } },
        _sum: { amount: true },
        _count: { _all: true },
      })
    ]);

    const totalEarnings = Number(allTimeAgg._sum.amount || 0);
    const completedOrders = allTimeAgg._count._all;

    // Fetch recent earnings
    // @ts-ignore
    const recentEarnings = await this.prisma.earning.findMany({
      where: { shgId },
      orderBy: [
        { completedAt: 'desc' },
        { id: 'desc' }
      ],
      take: validLimit,
      skip,
    });

    const totalPages = Math.ceil(completedOrders / validLimit);
    const hasMore = validPage < totalPages;

    return {
      success: true,
      message: 'Earnings fetched successfully',
      data: {
        summary: {
          todayEarnings: Number(todayAgg._sum.amount || 0),
          weekEarnings: Number(weekAgg._sum.amount || 0),
          monthEarnings: Number(monthAgg._sum.amount || 0),
          completedOrders,
          perOrderRate: PER_ORDER_RATE,
          totalEarnings,
        },
        recentEarnings: recentEarnings.map((e: any) => ({
          ...e,
          amount: Number(e.amount) // convert Decimal to number for JSON response
        })),
        pagination: {
          page: validPage,
          limit: validLimit,
          totalItems: completedOrders,
          totalPages,
          hasMore,
        }
      }
    };
  }
}
