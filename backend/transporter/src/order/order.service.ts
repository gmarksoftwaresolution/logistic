import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async getAssignedOrders(transporterId: number) {
    return this.prisma.order_old.findMany({
      where: {
        transporterId,
        status: {
          in: [OrderStatus.ACCEPTED, OrderStatus.RECEIVED],
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async updateHolderStatus(orderId: number, currentHolder: string) {
    const order = await this.prisma.order_old.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }

    const nextStatus = currentHolder === 'Transporter' ? OrderStatus.RECEIVED : order.status;

    return this.prisma.order_old.update({
      where: { id: orderId },
      data: {
        currentHolder,
        status: nextStatus,
      },
    });
  }

  async completeOrder(orderId: number) {
    const order = await this.prisma.order_old.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }

    return this.prisma.order_old.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
        currentHolder: 'Buyer',
      },
    });
  }
}
