import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) { }


      async getAssignedPickups(transporterId: any, mobileNumber?: string) {
    try {
      const numId = Number(transporterId);
      const strId = String(transporterId);

      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            ...(isNaN(numId) ? [] : [{ id: numId }]),
            ...(UUID_REGEX.test(strId) ? [{ authId: strId }] : []),
            ...(mobileNumber ? [{ phoneNumber: mobileNumber }] : [])
          ]
        }
      });
      if (!user || user.role !== 'TRANSPORTER') {
        return [];
      }

      const idVariants = [String(user.id), user.authId].filter(Boolean) as string[];

      const assignedOrders = await this.prisma.orderAssignment.findMany({
        where: {
          assigneeId: { in: idVariants },
          assigneeType: 'TRANSPORTER',
          role: { in: ['PICKUP', 'RETURN'] },
          status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED'] },
        },
        select: { orderId: true }
      });
      const assignedOrderIds = assignedOrders.map(a => a.orderId);

      const orders = await this.prisma.order.findMany({
        where: {
          OR: [
            { id: { in: assignedOrderIds } },
            { orderId: { in: assignedOrderIds } },
            { pickupTransporterId: { in: idVariants } },
            { returnTransporterId: { in: idVariants } },
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
              'COMPLETED',
              'REJECTED'
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

      const allShgUsers = await this.prisma.user.findMany({
        where: { role: 'SHG', applicationStatus: 'APPROVED' },
        include: { address: true, shgDetail: true }
      }).catch(() => []);

      const normalizeStr = (s?: string | null): string => {
        if (!s) return '';
        return s.replace(/[^a-z0-9]/gi, '').trim().toLowerCase();
      };

      return orders.map((o: any) => {
        const cleanOrderId = (o.orderId || o.id).replace(/^ORD-/, '');

        const directShgId = o.pickupShgId;
        const assignShgId = o.assignments?.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'SHG')?.assigneeId;
        const holderShgId = o.parcels?.find((p: any) => p.currentHolderType === 'SHG')?.currentHolderId;
        const sellerVillageNorm = normalizeStr(o.seller?.village);

        const shgUser = allShgUsers.find(u =>
          (directShgId && (String(u.id) === String(directShgId) || u.authId === String(directShgId))) ||
          (assignShgId && (String(u.id) === String(assignShgId) || u.authId === String(assignShgId))) ||
          (holderShgId && (String(u.id) === String(holderShgId) || u.authId === String(holderShgId))) ||
          (sellerVillageNorm && normalizeStr(u.address?.village) === sellerVillageNorm)
        ) || null;

        const isRedirected = !!((o as any).isPickupRedirected || o.pickupShgStatus === 'REDIRECTED');

        const shgData = shgUser ? {
          id: shgUser.id,
          authId: shgUser.authId,
          sellerCode: shgUser.uniqueCode || `SHG-${shgUser.id}`,
          crpName: shgUser.shgDetail?.crpName || shgUser.fullName || 'SHG CRP Lead',
          personName: shgUser.shgDetail?.crpName || shgUser.fullName || 'SHG CRP Lead',
          fullName: shgUser.shgDetail?.crpName || shgUser.fullName || 'SHG CRP Lead',
          name: shgUser.shgDetail?.crpName || shgUser.fullName || 'SHG CRP Lead',
          sellerName: shgUser.shgDetail?.crpName || shgUser.fullName || 'SHG CRP Lead',
          mobileNumber: shgUser.shgDetail?.crpMobile || shgUser.phoneNumber || '',
          phoneNumber: shgUser.shgDetail?.crpMobile || shgUser.phoneNumber || '',
          phone: shgUser.shgDetail?.crpMobile || shgUser.phoneNumber || '',
          shgName: shgUser.shgDetail?.shgName || `${shgUser.address?.village || ''} SHG Center`,
          email: shgUser.email,
          addressLine1: shgUser.address?.deliveryAddress || shgUser.address?.landmark || shgUser.address?.houseNo || shgUser.address?.village || '',
          addressLine2: shgUser.address?.houseNo || '',
          village: shgUser.address?.village || o.seller?.village || '',
          taluka: shgUser.address?.taluka || o.seller?.taluka || '',
          district: shgUser.address?.district || o.seller?.district || '',
          state: shgUser.address?.state || o.seller?.state || 'Maharashtra',
          pincode: shgUser.address?.pincode || o.seller?.pincode || '',
          postOffice: shgUser.address?.postOffice || null,
          fullAddress: [
            shgUser.address?.deliveryAddress || shgUser.address?.landmark || shgUser.address?.houseNo,
            shgUser.address?.village,
            shgUser.address?.taluka,
            shgUser.address?.district,
            shgUser.address?.state ? `${shgUser.address.state} - ${shgUser.address.pincode}` : shgUser.address?.pincode
          ].filter(Boolean).join(', ') || `${shgUser.address?.village || ''} Center`,
          address: shgUser.address ? {
            addressLine1: shgUser.address.deliveryAddress || shgUser.address.landmark || shgUser.address.houseNo || shgUser.address.village,
            village: shgUser.address.village,
            taluka: shgUser.address.taluka,
            district: shgUser.address.district,
            state: shgUser.address.state,
            pincode: shgUser.address.pincode,
          } : null,
        } : null;

        if (o.seller) {
          o.seller.fullAddress = [
            o.seller.addressLine1,
            o.seller.addressLine2,
            o.seller.village,
            o.seller.taluka,
            o.seller.district,
            o.seller.state ? `${o.seller.state} - ${o.seller.pincode}` : o.seller.pincode
          ].filter(Boolean).join(', ');
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
          masterOrderId: o.masterOrderId,
          orderId: o.orderId || o.id,
          pickupShgId: o.pickupShgId,
          pickupTransporterId: o.pickupTransporterId,
          pickupTransporterStatus: o.pickupTransporterStatus || 'PENDING',
          mainStatus: o.mainStatus,
          seller: o.seller,
          buyer: o.buyer,
          shg: shgData,
          pickupShg: shgData,
          pickupShgDetails: shgData,
          parcels: o.parcels || [],
        };
      });
    } catch (err) {
      console.error('[OrderService] Error fetching assigned pickups:', err);
      return [];
    }
  }

  async getAssignedDrops(transporterId: any, mobileNumber?: string) {
    try {
      const numId = Number(transporterId);
      const strId = String(transporterId);

      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            ...(isNaN(numId) ? [] : [{ id: numId }]),
            ...(UUID_REGEX.test(strId) ? [{ authId: strId }] : []),
            ...(mobileNumber ? [{ phoneNumber: mobileNumber }] : [])
          ]
        }
      });
      if (!user || user.role !== 'TRANSPORTER') {
        return [];
      }

      const idVariants = [String(user.id), user.authId].filter(Boolean) as string[];

      const assignedOrders = await this.prisma.orderAssignment.findMany({
        where: {
          assigneeId: { in: idVariants },
          assigneeType: 'TRANSPORTER',
          role: 'DROP',
          status: { in: ['PENDING', 'ACCEPTED', 'REJECTED'] },
        },
        select: { orderId: true }
      });
      const assignedOrderIds = assignedOrders.map(a => a.orderId);

      const orders = await this.prisma.order.findMany({
        where: {
          OR: [
            { id: { in: assignedOrderIds } },
            { orderId: { in: assignedOrderIds } },
            { dropTransporterId: { in: idVariants } },
          ],
          mainStatus: { in: ['HUB_RECEIVED', 'STORED', 'BARCODE_GENERATED', 'DROP_PENDING', 'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DISPATCHED', 'HUB_DELIVERED', 'IN_TRANSIT_TO_DROP', 'IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_BUYER', 'DROP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG', 'REJECTED'] }
        },
        include: {
          seller: true,
          buyer: true,
          parcels: true,
          assignments: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const activeOrders = orders.filter((o: any) => {
        const dtStatus = (o.dropTransporterStatus || '').toUpperCase();
        const dShgStatus = (o.dropShgStatus || '').toUpperCase();
        const mStatus = (o.mainStatus || '').toUpperCase();

        if (dtStatus === 'COMPLETED' || dtStatus === 'DROPPED' || dShgStatus === 'DELIVERED' || dShgStatus === 'DROPPED' || mStatus === 'PARCEL_AT_DROP_SHG' || mStatus === 'DELIVERED' || mStatus === 'COMPLETED') {
          return false;
        }
        return true;
      });

      const allShgUsers = await this.prisma.user.findMany({
        where: { role: 'SHG', applicationStatus: 'APPROVED' },
        include: { address: true, shgDetail: true }
      }).catch(() => []);

      const normalizeStr = (s?: string | null): string => {
        if (!s) return '';
        return s.replace(/[^a-z0-9]/gi, '').trim().toLowerCase();
      };

      return activeOrders.map((o: any) => {
        const cleanOrderId = (o.orderId || o.id).replace(/^ORD-/, '');

        const directShgId = o.dropShgId || o.pickupShgId;
        const assignShgId = o.assignments?.find((a: any) => a.role === 'DROP' && a.assigneeType === 'SHG')?.assigneeId;
        const buyerVillageNorm = normalizeStr(o.buyer?.village);

        const shgUser = allShgUsers.find(u =>
          (directShgId && (String(u.id) === String(directShgId) || u.authId === String(directShgId))) ||
          (assignShgId && (String(u.id) === String(assignShgId) || u.authId === String(assignShgId))) ||
          (buyerVillageNorm && normalizeStr(u.address?.village) === buyerVillageNorm)
        ) || null;

        const shgData = shgUser ? {
          id: shgUser.id,
          authId: shgUser.authId,
          crpName: shgUser.shgDetail?.crpName || shgUser.fullName || 'Drop SHG Lead',
          personName: shgUser.shgDetail?.crpName || shgUser.fullName || 'Drop SHG Lead',
          fullName: shgUser.shgDetail?.crpName || shgUser.fullName || 'Drop SHG Lead',
          name: shgUser.shgDetail?.crpName || shgUser.fullName || 'Drop SHG Lead',
          phoneNumber: shgUser.shgDetail?.crpMobile || shgUser.phoneNumber || '',
          mobileNumber: shgUser.shgDetail?.crpMobile || shgUser.phoneNumber || '',
          phone: shgUser.shgDetail?.crpMobile || shgUser.phoneNumber || '',
          shgName: shgUser.shgDetail?.shgName || `${shgUser.address?.village || ''} Drop SHG`,
          village: shgUser.address?.village || o.buyer?.village || '',
          taluka: shgUser.address?.taluka || o.buyer?.taluka || '',
          district: shgUser.address?.district || o.buyer?.district || '',
          state: shgUser.address?.state || o.buyer?.state || 'Maharashtra',
          pincode: shgUser.address?.pincode || o.buyer?.pincode || '',
          addressLine1: shgUser.address?.deliveryAddress || shgUser.address?.landmark || shgUser.address?.houseNo || shgUser.address?.village || '',
          fullAddress: [
            shgUser.address?.deliveryAddress || shgUser.address?.landmark || shgUser.address?.houseNo,
            shgUser.address?.village,
            shgUser.address?.taluka,
            shgUser.address?.district,
            shgUser.address?.state ? `${shgUser.address.state} - ${shgUser.address.pincode}` : shgUser.address?.pincode
          ].filter(Boolean).join(', ') || `${shgUser.address?.village || ''} Drop SHG Center`,
          address: shgUser.address ? {
            addressLine1: shgUser.address.deliveryAddress || shgUser.address.landmark || shgUser.address.houseNo || shgUser.address.village,
            village: shgUser.address.village,
            taluka: shgUser.address.taluka,
            district: shgUser.address.district,
            state: shgUser.address.state,
            pincode: shgUser.address.pincode,
          } : null,
        } : null;

        if (o.seller) {
          o.seller.fullAddress = [
            o.seller.addressLine1,
            o.seller.addressLine2,
            o.seller.village,
            o.seller.taluka,
            o.seller.district,
            o.seller.state ? `${o.seller.state} - ${o.seller.pincode}` : o.seller.pincode
          ].filter(Boolean).join(', ');
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
          dropTransporterId: o.dropTransporterId,
          dropTransporterStatus: o.dropTransporterStatus || 'PENDING',
          mainStatus: o.mainStatus,
          seller: o.seller,
          buyer: o.buyer,
          dropShg: shgData,
          dropShgDetails: shgData,
          shg: shgData,
          parcels: o.parcels || [],
          items: (o.parcels && o.parcels.length > 0) ? o.parcels.map((p: any) => ({
            id: p.id || p.parcelId,
            quantity: p.quantity || 1,
            weight: p.weight || p.weightKg || 2.5,
            product: {
              name: p.productName || 'Agricultural Goods',
              weight: Number(p.weight || p.weightKg || 2.5)
            }
          })) : (o.items || [])
        };
      });
    } catch (err) {
      console.error('[OrderService] Error fetching assigned drops:', err);
      return [];
    }
  }

  private async checkToleranceCapacity(transporterId: number, incomingOrderWeight: number) {
    const transporterUuid = String(transporterId);

    const vehicleDetail = await this.prisma.otherDetails.findFirst({
      where: { userId: transporterId },
      orderBy: { createdAt: 'desc' },
    });

    if (!vehicleDetail || !vehicleDetail.maxWeight) {
      return;
    }

    const baseMaxW = Number(vehicleDetail.maxWeight);
    if (isNaN(baseMaxW) || baseMaxW <= 0) return;

    let bufferPercent = 0.03;
    if (baseMaxW <= 50) bufferPercent = 0.05;
    else if (baseMaxW > 500) bufferPercent = 0.03;

    const effectiveMaxW = Math.round(baseMaxW * (1 + bufferPercent));

    const acceptedOrders = await this.prisma.order.findMany({
      where: {
        OR: [
          { pickupTransporterId: transporterUuid, pickupTransporterStatus: { in: ['TRANSPORTER_ACCEPTED', 'PARCEL_PICKED', 'IN_TRANSIT_TO_HUB'] } },
          { dropTransporterId: transporterUuid, dropTransporterStatus: { in: ['DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP'] } },
        ],
      },
      include: {
        parcels: true,
      },
    });

    let currentLoadWeight = 0;
    for (const o of acceptedOrders) {
      if (o.totalWeight && !isNaN(Number(o.totalWeight))) {
        currentLoadWeight += Number(o.totalWeight);
      } else if (o.parcels && o.parcels.length > 0) {
        currentLoadWeight += o.parcels.reduce((s: number, p: any) => s + (Number(p.weight) || 1), 0);
      }
    }

    const projectedWeight = currentLoadWeight + incomingOrderWeight;
    if (projectedWeight > effectiveMaxW) {
      throw new BadRequestException(
        `Cannot accept order. Total load weight (${projectedWeight.toFixed(1)} kg) exceeds your vehicle capacity with tolerance limit (${effectiveMaxW} kg).`
      );
    }
  }

  async acceptPickup(pickupOrderId: any, transporterId: number) {
    const order = await this.findOrderFlexible(pickupOrderId);
    const transporterUuid = String(transporterId);

    const orderWeight = order.totalWeight ? Number(order.totalWeight) : 5;
    await this.checkToleranceCapacity(transporterId, orderWeight);

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

    const orderWeight = order.totalWeight ? Number(order.totalWeight) : 5;
    await this.checkToleranceCapacity(transporterId, orderWeight);

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
    const order = await this.findOrderFlexible(orderId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupTransporterStatus: 'DELIVERED_TO_HUB',
        mainStatus: 'HUB_RECEIVED',
      }
    });

    return order;
  }

  async rejectPickup(orderId: any, transporterId: number, reason?: string) {
    const order = await this.findOrderFlexible(orderId);
    const remarksStr = reason || 'Rejected by Transporter';

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupTransporterStatus: 'REJECTED',
        mainStatus: 'REJECTED',
      }
    });

    await this.prisma.orderAssignment.updateMany({
      where: {
        orderId: order.id,
      },
      data: {
        status: 'REJECTED',
      }
    });

    const parcels = await this.prisma.parcel.findMany({
      where: {
        OR: [
          { orderId: order.id },
          { orderId: order.orderId }
        ]
      }
    });

    for (const p of parcels) {
      await this.prisma.parcelScanHistory.create({
        data: {
          parcelId: p.parcelId,
          orderId: order.orderId || order.id,
          productId: p.productId,
          productName: p.productName,
          userRole: 'TRANSPORTER',
          userId: String(transporterId),
          action: 'REJECT_PICKUP',
          scanResult: 'REJECTED',
          remarks: remarksStr,
        }
      }).catch(() => { });
    }

    return { success: true, message: 'Pickup rejected successfully.' };
  }

  async generateDropHandoverCode(dropOrderId: any, transporterId: number) {
    const order = await this.findOrderFlexible(dropOrderId);
    return { success: true, code: '5678', orderId: order.id };
  }

  async completeDropPickup(dropOrderId: any, transporterId: number, code?: string) {
    return this.acceptDrop(dropOrderId, transporterId);
  }

  async rejectDrop(dropOrderId: any, transporterId: number, reason?: string) {
    const order = await this.findOrderFlexible(dropOrderId);
    const remarksStr = reason || 'Rejected by Transporter';

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropTransporterStatus: 'REJECTED',
        mainStatus: 'REJECTED',
        returnType: 'TRANSPORTER_RETURN',
        rejectReason: remarksStr,
        remarks: remarksStr,
      }
    });

    await this.prisma.orderAssignment.updateMany({
      where: {
        orderId: order.id,
      },
      data: {
        status: 'REJECTED',
        remarks: remarksStr,
      }
    });

    const parcels = await this.prisma.parcel.findMany({
      where: {
        OR: [
          { orderId: order.id },
          { orderId: order.orderId }
        ]
      }
    });

    for (const p of parcels) {
      await this.prisma.parcelScanHistory.create({
        data: {
          parcelId: p.parcelId,
          orderId: order.orderId || order.id,
          productId: p.productId,
          productName: p.productName,
          userRole: 'TRANSPORTER',
          userId: String(transporterId),
          action: 'REJECT_DROP',
          scanResult: 'REJECTED',
          remarks: remarksStr,
        }
      }).catch(() => { });
    }

    return { success: true, message: 'Drop rejected successfully. Return to origin initiated.' };
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
    const rawId = strId.replace(/^(pickup|drop)-/, '');
    const lastDigits = rawId.match(/\d+$/)?.[0] || rawId;

    let order: any = null;
    const isValidUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawId);
    if (isValidUuid) {
      order = await this.prisma.order.findUnique({ where: { id: rawId } }).catch(() => null);
    }

    if (!order) {
      order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { id: strId },
            { id: rawId },
            { orderId: strId },
            { orderId: rawId },
            { orderId: `ORD-${rawId}` },
            { orderId: { endsWith: lastDigits } },
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
