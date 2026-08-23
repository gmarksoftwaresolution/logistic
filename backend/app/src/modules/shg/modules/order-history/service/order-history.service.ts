import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../../common/prisma/prisma.service';
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

    const assignedOrders = await this.prisma.orderAssignment.findMany({
      where: {
        assigneeId: String(shgId),
        assigneeType: 'SHG',
      },
      select: { orderId: true }
    });

    const assignedOrderIds = assignedOrders.map(a => a.orderId);

    const allOrders = await this.prisma.order.findMany({
      where: {
        OR: [
          { id: { in: assignedOrderIds } },
          { orderId: { in: assignedOrderIds } },
          { pickupShgId: String(shgId) },
          { dropShgId: String(shgId) },
        ],
        ...commonDateFilter,
      },
      include: {
        seller: true,
        buyer: true,
        parcels: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedOrders = allOrders.map((o: any) => {
      const isPickupLeg = String(o.pickupShgId) === String(shgId) || o.phase === 'PICKUP';

      const isCompleted = o.mainStatus === 'DELIVERED' ||
                          o.mainStatus === 'COMPLETED' ||
                          o.pickupShgStatus === 'PICKED' ||
                          o.pickupShgStatus === 'COMPLETED' ||
                          o.pickupShgStatus === 'DROPPED' ||
                          o.dropShgStatus === 'DELIVERED' ||
                          o.dropShgStatus === 'COMPLETED' ||
                          o.dropShgStatus === 'DROPPED' ||
                          ['PARCEL_AT_SHG', 'IN_TRANSIT_TO_HUB', 'HUB_RECEIVED', 'STORED', 'DISPATCHED', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG', 'DROP_TRANSPORTER_ACCEPTED', 'PARCEL_PICKED'].includes(o.mainStatus);

      const isCancelled = o.mainStatus === 'CANCELLED' || o.pickupShgStatus === 'REJECTED' || o.dropShgStatus === 'REJECTED';

      const statusVal = isCancelled ? 'CANCELLED' : (isCompleted ? 'COMPLETED' : 'IN_PROGRESS');

      const sellerName = o.seller?.sellerName || o.seller?.fullName || '';
      const sellerMobile = o.seller?.mobileNumber || o.seller?.phoneNumber || '';
      const sellerVillage = o.seller?.village || '';

      const buyerName = o.buyer?.buyerName || o.buyer?.fullName || '';
      const buyerMobile = o.buyer?.mobileNumber || o.buyer?.phoneNumber || '';
      const buyerVillage = o.buyer?.village || '';

      return {
        ...o,
        status: statusVal,
        pickupOrderNumber: o.orderId || o.id,
        dropOrderNumber: o.orderId || o.id,
        legType: isPickupLeg ? 'pickup' : 'drop',
        sellerName,
        sellerMobile,
        sellerVillage,
        buyerName,
        buyerMobile,
        buyerVillage,
        seller: o.seller ? {
          fullName: sellerName,
          phoneNumber: sellerMobile,
          village: sellerVillage,
          address: {
            houseNo: o.seller.addressLine1 || '',
            village: sellerVillage,
            taluka: o.seller.taluka || '',
            district: o.seller.district || '',
            pincode: o.seller.pincode || '',
          }
        } : null,
        buyer: o.buyer ? {
          fullName: buyerName,
          phoneNumber: buyerMobile,
          village: buyerVillage,
          address: {
            houseNo: o.buyer.addressLine1 || '',
            village: buyerVillage,
            taluka: o.buyer.taluka || '',
            district: o.buyer.district || '',
            pincode: o.buyer.pincode || '',
          }
        } : null,
        items: o.parcels || [],
      };
    });

    let filteredOrders = mappedOrders;
    if (status) {
      const targetStatus = String(status).toUpperCase();
      if (targetStatus === 'COMPLETED' || targetStatus === 'DELIVERED') {
        filteredOrders = mappedOrders.filter(o => o.status === 'COMPLETED');
      } else if (targetStatus === 'CANCELLED' || targetStatus === 'REJECTED') {
        filteredOrders = mappedOrders.filter(o => o.status === 'CANCELLED');
      }
    }

    if (query) {
      const q = query.trim().toLowerCase();
      filteredOrders = filteredOrders.filter(o =>
        (o.orderId && o.orderId.toLowerCase().includes(q)) ||
        (o.id && String(o.id).toLowerCase().includes(q)) ||
        (o.sellerName && o.sellerName.toLowerCase().includes(q)) ||
        (o.buyerName && o.buyerName.toLowerCase().includes(q)) ||
        (o.sellerVillage && o.sellerVillage.toLowerCase().includes(q)) ||
        (o.buyerVillage && o.buyerVillage.toLowerCase().includes(q))
      );
    }

    const paginatedItems = filteredOrders.slice(skip, skip + limit);

    return {
      items: paginatedItems,
      pagination: {
        total: filteredOrders.length,
        page,
        limit,
        totalPages: Math.ceil(filteredOrders.length / limit),
      }
    };
  }

  async getStats(shgId: number): Promise<IHistoryStats> {
    const assignedOrders = await this.prisma.orderAssignment.findMany({
      where: {
        assigneeId: String(shgId),
        assigneeType: 'SHG',
      },
      select: { orderId: true }
    });

    const assignedOrderIds = assignedOrders.map(a => a.orderId);

    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          { id: { in: assignedOrderIds } },
          { orderId: { in: assignedOrderIds } },
          { pickupShgId: String(shgId) },
          { dropShgId: String(shgId) },
        ],
      },
      select: { mainStatus: true, pickupShgStatus: true, dropShgStatus: true }
    });

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o =>
      o.mainStatus === 'DELIVERED' ||
      o.mainStatus === 'COMPLETED' ||
      o.pickupShgStatus === 'PICKED' ||
      o.pickupShgStatus === 'COMPLETED' ||
      o.pickupShgStatus === 'DROPPED' ||
      o.dropShgStatus === 'DELIVERED' ||
      o.dropShgStatus === 'COMPLETED' ||
      o.dropShgStatus === 'DROPPED' ||
      ['PARCEL_AT_SHG', 'IN_TRANSIT_TO_HUB', 'HUB_RECEIVED', 'STORED', 'DISPATCHED', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG', 'DROP_TRANSPORTER_ACCEPTED', 'PARCEL_PICKED'].includes(o.mainStatus)
    ).length;

    return {
      totalOrders,
      completedOrders,
    };
  }

  async getOrderById(id: string, shgId: number) {
    const cleanId = id.replace(/^pickup-/, '').replace(/^drop-/, '').replace(/^ORD-/, '');

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { id: id },
          { orderId: cleanId },
          { orderId: `ORD-${cleanId}` },
        ]
      },
      include: {
        seller: true,
        buyer: true,
        parcels: {
          include: {
            scanHistories: {
              orderBy: { scanTime: 'asc' }
            }
          }
        },
      }
    }) as any;

    if (!order) {
      return null;
    }

    let sellerName = order.seller?.sellerName || order.seller?.fullName || '';
    let sellerMobile = order.seller?.mobileNumber || order.seller?.phoneNumber || '';
    let sellerVillage = order.seller?.village || order.seller?.addressLine1 || '';
    let sellerAddress = [
      order.seller?.addressLine1,
      order.seller?.village,
      order.seller?.taluka,
      order.seller?.district,
      order.seller?.pincode ? `- ${order.seller?.pincode}` : ''
    ].filter(Boolean).join(', ');

    if (!sellerName && order.sellerId) {
      const sellerObj = await this.prisma.seller.findUnique({
        where: { id: Number(order.sellerId) }
      });
      if (sellerObj) {
        sellerName = sellerObj.sellerName;
        sellerMobile = sellerObj.mobileNumber;
        sellerVillage = sellerObj.village;
        sellerAddress = [
          sellerObj.addressLine1,
          sellerObj.village,
          sellerObj.taluka,
          sellerObj.district,
          sellerObj.pincode ? `- ${sellerObj.pincode}` : ''
        ].filter(Boolean).join(', ');
      }
    }

    let buyerName = order.buyer?.buyerName || order.buyer?.fullName || '';
    let buyerMobile = order.buyer?.mobileNumber || order.buyer?.phoneNumber || '';
    let buyerVillage = order.buyer?.village || order.buyer?.addressLine1 || '';
    let buyerAddress = [
      order.buyer?.addressLine1,
      order.buyer?.village,
      order.buyer?.taluka,
      order.buyer?.district,
      order.buyer?.pincode ? `- ${order.buyer?.pincode}` : ''
    ].filter(Boolean).join(', ');

    if (!buyerName && order.buyerId) {
      const buyerObj = await this.prisma.buyer.findUnique({
        where: { id: Number(order.buyerId) }
      });
      if (buyerObj) {
        buyerName = buyerObj.buyerName;
        buyerMobile = buyerObj.mobileNumber;
        buyerVillage = buyerObj.village;
        buyerAddress = [
          buyerObj.addressLine1,
          buyerObj.village,
          buyerObj.taluka,
          buyerObj.district,
          buyerObj.pincode ? `- ${buyerObj.pincode}` : ''
        ].filter(Boolean).join(', ');
      }
    }

    const parcels = order.parcels || [];
    const items = parcels.map((p: any) => ({
      code: p.parcelId,
      name: p.productName || 'Parcel Item',
      tag: p.parcelStatus || 'COMPLETED',
      quantity: p.quantity || 1,
      weight: p.weight || '1',
      details: `Qty: ${p.quantity || 1} • Weight: ${p.weight || '1'}kg`,
      weightValue: parseFloat(p.weight) || 1,
    }));

    // Compile scan history logs for tracking
    const scanHistories = parcels.flatMap((p: any) => p.scanHistories || []);
    scanHistories.sort((a: any, b: any) => new Date(a.scanTime).getTime() - new Date(b.scanTime).getTime());

    const tracking = scanHistories.map((sh: any) => ({
      id: sh.id,
      status: sh.action || sh.currentStage || sh.scanResult || 'Stage Completed',
      timestamp: sh.scanTime,
      remarks: sh.remarks || `Action taken by ${sh.userRole || 'SHG'}`,
    }));

    const totalWeight = parcels.reduce((sum: number, p: any) => sum + (parseFloat(p.weight) || 1), 0) || order.totalWeight || 1;
    const totalQty = parcels.reduce((sum: number, p: any) => sum + (p.quantity || 1), 0) || order.totalQty || 1;
    const totalAmount = (totalWeight * 45) + (totalQty * 20) || 550.0;

    return {
      ...order,
      legType: order.phase === 'PICKUP' ? 'pickup' : 'drop',
      sellerName,
      sellerMobile,
      sellerVillage,
      sellerAddress,
      buyerName,
      buyerMobile,
      buyerVillage,
      buyerAddress,
      items,
      products: items,
      tracking,
      totalWeight,
      totalQty,
      remainingQty: totalQty,
      totalAmount,
      seller: {
        fullName: sellerName,
        phoneNumber: sellerMobile,
        address: {
          houseNo: order.seller?.addressLine1 || '',
          village: sellerVillage,
          taluka: order.seller?.taluka || '',
          district: order.seller?.district || '',
          pincode: order.seller?.pincode || '',
        }
      },
      buyer: {
        fullName: buyerName,
        phoneNumber: buyerMobile,
        address: {
          houseNo: order.buyer?.addressLine1 || '',
          village: buyerVillage,
          taluka: order.buyer?.taluka || '',
          district: order.buyer?.district || '',
          pincode: order.buyer?.pincode || '',
        }
      }
    };
  }
}
