import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const PER_ORDER_RATE = 15.00;
export const DEFAULT_PAGE = 1;
export const MAX_LIMIT = 100;

export function buildEarningOrderId(workflowType: 'PICKUP' | 'DROP', orderNumber: string): string {
  return `${workflowType}-${orderNumber}`;
}

@Injectable()
export class EarningsService {
  constructor(private prisma: PrismaService) {}

  async createForCompletedOrder(tx: any, shgId: number, orderNumber: string, workflowType: 'PICKUP' | 'DROP', completedAt: Date) {
    const orderId = buildEarningOrderId(workflowType, orderNumber);
    
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
        amount: PER_ORDER_RATE,
        completedAt,
      }
    });
  }

  async getEarnings(shgId: number, filter: string = 'today', page: number = DEFAULT_PAGE, limit: number = 20) {
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

    const [todayAgg, weekAgg, monthAgg, aggregations] = await Promise.all([
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
        where: { shgId, completedAt: { gte: startDate } },
        _sum: { amount: true },
        _count: { _all: true },
      })
    ]);

    const totalEarnings = Number(aggregations._sum.amount || 0);
    const completedOrders = aggregations._count._all;

    // Fetch recent earnings
    // @ts-ignore
    const recentEarnings = await this.prisma.earning.findMany({
      where: { shgId, completedAt: { gte: startDate } },
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
