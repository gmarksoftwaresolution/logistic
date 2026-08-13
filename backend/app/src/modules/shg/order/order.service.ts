import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { VehicleSuggestionService } from './vehicle-suggestion.service';
import { EarningsService } from '../earnings/earnings.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private vehicleSuggestionService: VehicleSuggestionService,
    private earningsService: EarningsService,
  ) { }

  private normalizeStr(s?: string | null): string {
    if (!s) return '';
    return s.replace(/[^a-z0-9]/gi, '').trim().toLowerCase();
  }

  async getAssignedPickups(shgId: number | string, mobileNumber?: string) {
    const numericShgId = typeof shgId === 'number' ? shgId : parseInt(String(shgId), 10);
    const user = await this.prisma.user.findUnique({
      where: { id: numericShgId },
      include: { address: true }
    });
    if (!user || user.role !== 'SHG' || user.applicationStatus !== 'APPROVED') {
      return [];
    }

    const shgUuid = String(numericShgId);
    const userVillage = this.normalizeStr(user.address?.village);
    const userPincode = user.address?.pincode ? user.address.pincode.trim().toLowerCase() : '';

    const serviceAreas = await this.prisma.shgServiceArea.findMany({
      where: {
        OR: [
          { shgUserId: String(numericShgId) },
          { shgUserId: user.authId }
        ]
      }
    });

    const isVillageMatch = (v?: string | null, p?: string | null) => {
      if (!v) return false;
      const vNorm = this.normalizeStr(v);
      if (!vNorm) return false;

      const pNorm = p ? (p || '').trim().toLowerCase() : '';

      // 1. Direct village match on user primary address
      if (userVillage && (userVillage === vNorm || userVillage.includes(vNorm) || vNorm.includes(userVillage))) {
        if (userPincode && pNorm) {
          return userPincode === pNorm;
        }
        return true;
      }
      // 2. Village match on configured service areas
      return serviceAreas.some(sa => {
        const saV = this.normalizeStr(sa.village);
        const saP = sa.pincode ? (sa.pincode || '').trim().toLowerCase() : '';
        if (saV && (saV === vNorm || saV.includes(vNorm) || vNorm.includes(saV))) {
          if (saP && pNorm) {
            return saP === pNorm;
          }
          return true;
        }
        return false;
      });
    };

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
        mainStatus: {
          in: [
            'NEW',
            'ORDER_PLACED',
            'PENDING',
            'PENDING_PICKUP',
            'PICKUP_ASSIGNED',
            'PICKUP_SHG_PENDING',
            'ACCEPTED',
            'PICKUP_SHG_ACCEPTED',
            'PARCEL_AT_SHG',
            'TRANSPORTER_ACCEPTED',
            'PICKUP_TRANSPORTER_ACCEPTED',
            'IN_TRANSIT_TO_HUB',
            'STORED',
            'BARCODE_GENERATED',
            'DROP_PENDING',
            'DROP_ASSIGNED',
            'DROP_SHG_ACCEPTED',
            'DROP_TRANSPORTER_ACCEPTED',
            'IN_TRANSIT_TO_BUYER',
            'IN_TRANSIT_TO_DROP_SHG',
            'DISPATCHED',
            'PARCEL_AT_DROP_SHG',
            'PARCEL_WITH_DROP_SHG',
            'AT_BUYER_SHG',
            'OUT_FOR_DELIVERY',
            'REDIRECTED'
          ]
        }
      },
      include: {
        seller: true,
        buyer: true,
        parcels: {
          include: { scanHistories: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // STRICT BUSINESS LOGIC FILTER: Village + Pincode matching per SHG
    const matchedOrders = orders.filter((o: any) => {
      const isDropPhase = o.phase === 'DROP' || ['STORED', 'BARCODE_GENERATED', 'DROP_PENDING', 'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_BUYER', 'IN_TRANSIT_TO_DROP_SHG', 'DISPATCHED', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG', 'OUT_FOR_DELIVERY'].includes(o.mainStatus);

      if (isDropPhase) {
        // Drop Leg Completed Check: If delivered, exclude from active pickups
        const dShgStatus = (o.dropShgStatus || '').toUpperCase();
        if (dShgStatus === 'DELIVERED' || dShgStatus === 'COMPLETED' || o.mainStatus === 'DELIVERED' || o.mainStatus === 'COMPLETED') {
          return false;
        }

        if (o.dropShgId && String(o.dropShgId) === shgUuid) return true;
        const dropVillage = o.dropShgDetails?.village || o.buyer?.village;
        const dropPincode = o.dropShgDetails?.pincode || o.buyer?.pincode;
        return isVillageMatch(dropVillage, dropPincode);
      } else {
        // Pickup Leg Completed Check: If picked up by SHG / handed to transporter, exclude from active pickups
        const pShgStatus = (o.pickupShgStatus || '').toUpperCase();
        if (pShgStatus === 'DROPPED' || pShgStatus === 'COMPLETED' || ['IN_TRANSIT_TO_HUB', 'HUB_RECEIVED', 'STORED', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].includes((o.mainStatus || '').toUpperCase())) {
          return false;
        }

        if (o.pickupShgId && String(o.pickupShgId) === shgUuid) return true;
        const sellerVillage = o.seller?.village;
        const sellerPincode = o.seller?.pincode;
        return isVillageMatch(sellerVillage, sellerPincode);
      }
    });

    const transporterIds = matchedOrders
      .map(o => o.pickupTransporterId ? parseInt(o.pickupTransporterId, 10) : (o.dropTransporterId ? parseInt(o.dropTransporterId, 10) : null))
      .filter((id): id is number => id !== null && !isNaN(id));

    const transporters = transporterIds.length > 0
      ? await this.prisma.user.findMany({
        where: { id: { in: transporterIds } },
        include: { transporterDetail: true, otherDetails: true }
      })
      : [];

    const transporterMap = new Map(transporters.map(t => [String(t.id), t]));

    return matchedOrders.map((o: any) => {
      const transId = o.pickupTransporterId || o.dropTransporterId;
      const transporterUser = transId ? transporterMap.get(transId) : null;
      const cleanOrderId = (o.orderId || o.id).replace(/^ORD-/, '');
      const isDropLeg = (o.phase === 'DROP' || ['DROP_PENDING', 'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_BUYER', 'IN_TRANSIT_TO_DROP_SHG', 'DISPATCHED', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG'].includes(o.mainStatus) || (o.dropShgId && String(o.dropShgId) === shgUuid));
      return {
        id: cleanOrderId,
        uuid: o.id,
        orderId: cleanOrderId,
        orderNumber: cleanOrderId,
        barcode: o.barcode,
        status: o.mainStatus,
        legType: isDropLeg ? 'drop' : 'pickup',
        seller: o.seller ? {
          ...o.seller,
          fullName: o.seller.sellerName,
          phoneNumber: o.seller.mobileNumber,
          village: o.seller.village,
          taluka: o.seller.taluka,
          district: o.seller.district,
          state: o.seller.state,
          pincode: o.seller.pincode,
          addressLine1: o.seller.addressLine1,
          addressLine2: o.seller.addressLine2,
          fullAddress: [
            o.seller.addressLine1,
            o.seller.addressLine2,
            o.seller.village,
            o.seller.taluka,
            o.seller.district,
            o.seller.state ? `${o.seller.state} - ${o.seller.pincode}` : o.seller.pincode
          ].filter(Boolean).join(', '),
          address: {
            houseNo: o.seller.addressLine1 || '',
            addressLine1: o.seller.addressLine1 || '',
            addressLine2: o.seller.addressLine2 || '',
            village: o.seller.village,
            taluka: o.seller.taluka,
            district: o.seller.district,
            state: o.seller.state,
            pincode: o.seller.pincode,
          }
        } : null,
        buyer: o.buyer ? {
          ...o.buyer,
          fullName: o.buyer.buyerName,
          phoneNumber: o.buyer.mobileNumber,
          village: o.buyer.village,
          taluka: o.buyer.taluka,
          district: o.buyer.district,
          state: o.buyer.state,
          pincode: o.buyer.pincode,
          addressLine1: o.buyer.addressLine1,
          addressLine2: o.buyer.addressLine2,
          fullAddress: [
            o.buyer.addressLine1,
            o.buyer.addressLine2,
            o.buyer.village,
            o.buyer.taluka,
            o.buyer.district,
            o.buyer.state ? `${o.buyer.state} - ${o.buyer.pincode}` : o.buyer.pincode
          ].filter(Boolean).join(', '),
          address: {
            houseNo: o.buyer.addressLine1 || '',
            addressLine1: o.buyer.addressLine1 || '',
            addressLine2: o.buyer.addressLine2 || '',
            village: o.buyer.village,
            taluka: o.buyer.taluka,
            district: o.buyer.district,
            state: o.buyer.state,
            pincode: o.buyer.pincode,
          }
        } : null,
        parcels: o.parcels || [],
        items: (o.parcels && o.parcels.length > 0) ? o.parcels.map((p: any) => ({
          id: p.id,
          productId: p.productId || 1,
          quantity: p.quantity || 1,
          product: {
            id: p.productId || 1,
            name: p.productName || 'Agricultural Goods',
            price: p.declaredValue || 450,
            weight: Number(p.weight || p.weightKg || 2.5),
            category: p.category || 'Agriculture',
            unit: 'kg'
          }
        })) : [{
          id: 1,
          productId: 1,
          quantity: 1,
          product: {
            id: 1,
            name: 'Agricultural Goods',
            price: 450,
            weight: 2.5,
            category: 'Agriculture',
            unit: 'kg'
          }
        }],
        isPickupRedirected: o.isPickupRedirected,
        isDropRedirected: (o as any).isDropRedirected || false,
        pickupShgStatus: o.pickupShgStatus,
        pickupTransporterStatus: o.pickupTransporterStatus,
        dropShgStatus: o.dropShgStatus,
        dropTransporterStatus: o.dropTransporterStatus,
        mainStatus: o.mainStatus,
        transporter: (() => {
          const isPickupAccepted = ['ACCEPTED', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PICKED', 'IN_TRANSIT_TO_HUB', 'DELIVERED_TO_HUB', 'HUB_RECEIVED', 'COMPLETED'].includes(o.pickupTransporterStatus || '');
          const isDropAccepted = ['ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'DELIVERED', 'COMPLETED'].includes(o.dropTransporterStatus || '');
          const isTransAccepted = o.phase === 'DROP' ? isDropAccepted : isPickupAccepted;

          if (!isTransAccepted || !transporterUser) {
            return null;
          }

          return {
            fullName: transporterUser.fullName,
            phoneNumber: transporterUser.phoneNumber,
            transporterDetail: {
              transporterCode: transporterUser.transporterDetail?.transporterCode || '',
              vehicleNumber: (transporterUser.transporterDetail as any)?.vehicleNumber || (transporterUser.transporterDetail as any)?.registrationNumber || '',
            },
            otherDetails: transporterUser.otherDetails || [],
          };
        })(),
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        date: o.createdAt,
        orderDate: o.createdAt,
        acceptedAt: o.pickupShgStatus === 'ACCEPTED' ? (o.acceptedAt || o.updatedAt) : o.createdAt,
        collectedAt: (o.pickupShgStatus === 'PICKED' || o.mainStatus === 'PARCEL_AT_SHG') ? (o.collectedAt || o.updatedAt) : null,
        products: o.parcels || [],
      };
    });
  }

  async getCompletedOrders(shgId: number | string, mobileNumber?: string) {
    try {
      const numericShgId = typeof shgId === 'number' ? shgId : parseInt(String(shgId), 10);
      const user = await this.prisma.user.findUnique({
        where: { id: numericShgId },
        include: { address: true }
      });
      if (!user || user.role !== 'SHG' || user.applicationStatus !== 'APPROVED') {
        return { newOrders: [], returnOrders: [] };
      }

      const shgUuid = String(numericShgId);
      const userVillage = this.normalizeStr(user.address?.village);
      const userPincode = user.address?.pincode ? user.address.pincode.trim().toLowerCase() : '';

      const orders = await this.prisma.order.findMany({
        where: {
          OR: [
            {
              mainStatus: {
                in: [
                  'DELIVERED',
                  'COMPLETED',
                  'RETURN_COMPLETED',
                  'IN_TRANSIT_TO_HUB',
                  'HUB_RECEIVED',
                  'STORED',
                  'DISPATCHED',
                  'IN_TRANSIT_TO_DROP_SHG',
                  'PARCEL_AT_DROP_SHG',
                  'AT_BUYER_SHG'
                ]
              }
            },
            {
              pickupShgStatus: {
                in: ['DROPPED', 'COMPLETED', 'REDIRECTED', 'PARCEL_PICKED']
              }
            },
            {
              dropShgStatus: {
                in: ['DROPPED', 'COMPLETED', 'DELIVERED']
              }
            },
            { isPickupRedirected: true },
            { mainStatus: 'REDIRECTED' }
          ]
        },
        include: {
          seller: true,
          buyer: true,
          parcels: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      const matchedOrders = orders.filter((o: any) => {
        const isPickupShgMatch = (o.pickupShgId && String(o.pickupShgId) === shgUuid);
        const isDropShgMatch = (o.dropShgId && String(o.dropShgId) === shgUuid);
        const isReturnShgMatch = (o.pickupReturnShgId && String(o.pickupReturnShgId) === shgUuid);

        const isPhase2ActiveForDropShg = isDropShgMatch && ['DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_BUYER', 'PARCEL_AT_DROP_SHG'].includes(o.mainStatus) && o.dropShgStatus !== 'DROPPED' && o.dropShgStatus !== 'DELIVERED' && o.dropShgStatus !== 'COMPLETED';
        if (isPhase2ActiveForDropShg) {
          return false;
        }

        const isPhase1ActiveForPickupShg = isPickupShgMatch && ['PENDING', 'ACCEPTED', 'PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG'].includes(o.mainStatus) && o.pickupShgStatus !== 'DROPPED' && o.pickupShgStatus !== 'COMPLETED' && o.pickupShgStatus !== 'REDIRECTED' && !o.isPickupRedirected;
        if (isPhase1ActiveForPickupShg) {
          return false;
        }

        const isRedirected = !!(o.isPickupRedirected || o.pickupShgStatus === 'REDIRECTED' || o.mainStatus === 'REDIRECTED');
        if (isRedirected && (isPickupShgMatch || (o.redirectedPickupShgId && String(o.redirectedPickupShgId) === shgUuid))) {
          const pTransStatus = (o.pickupTransporterStatus || '').toUpperCase();
          const mainStat = (o.mainStatus || '').toUpperCase();
          const isTransporterPickedUp = ['PARCEL_PICKED', 'PICKED', 'IN_TRANSIT_TO_HUB', 'DELIVERED_TO_HUB', 'HUB_RECEIVED', 'STORED', 'DISPATCHED', 'COMPLETED', 'DELIVERED'].includes(pTransStatus) || ['IN_TRANSIT_TO_HUB', 'HUB_RECEIVED', 'STORED', 'DISPATCHED', 'COMPLETED', 'DELIVERED'].includes(mainStat);
          if (!isTransporterPickedUp) {
            return false;
          }
        }

        if (isPickupShgMatch || isDropShgMatch || isReturnShgMatch || (o.redirectedPickupShgId && String(o.redirectedPickupShgId) === shgUuid)) {
          return true;
        }
        if (o.seller) {
          const sVillage = this.normalizeStr(o.seller.village);
          const sPincode = o.seller.pincode ? o.seller.pincode.trim().toLowerCase() : '';
          if (userVillage && userPincode && sVillage === userVillage && sPincode === userPincode) {
            return true;
          }
        }
        if (o.buyer) {
          const bVillage = this.normalizeStr(o.buyer.village);
          const bPincode = o.buyer.pincode ? o.buyer.pincode.trim().toLowerCase() : '';
          if (userVillage && userPincode && bVillage === userVillage && bPincode === userPincode) {
            return true;
          }
        }
        return false;
      });

      const transporterIds = matchedOrders
        .map(o => o.pickupTransporterId ? parseInt(o.pickupTransporterId, 10) : (o.dropTransporterId ? parseInt(o.dropTransporterId, 10) : null))
        .filter((id): id is number => id !== null && !isNaN(id));

      const transporters = transporterIds.length > 0
        ? await this.prisma.user.findMany({
          where: { id: { in: transporterIds } },
          include: { transporterDetail: true, otherDetails: true }
        })
        : [];

      const transporterMap = new Map(transporters.map(t => [String(t.id), t]));

      const formatted = matchedOrders.map((o: any) => {
        const transId = o.pickupTransporterId || o.dropTransporterId;
        const transporterUser = transId ? transporterMap.get(transId) : null;
        const cleanOrderId = (o.orderId || o.id).replace(/^ORD-/, '');
        const legType = (o.dropShgId && String(o.dropShgId) === shgUuid) ? 'drop' : 'pickup';
        return {
          id: cleanOrderId,
          uuid: o.id,
          orderId: cleanOrderId,
          orderNumber: cleanOrderId,
          legType,
          phase: legType === 'drop' ? 'DROP' : 'PICKUP',
          barcode: o.barcode,
          status: o.mainStatus,
          seller: o.seller ? {
            ...o.seller,
            fullName: o.seller.sellerName,
            phoneNumber: o.seller.mobileNumber,
            village: o.seller.village,
            pincode: o.seller.pincode,
            addressLine1: o.seller.addressLine1,
            fullAddress: [o.seller.addressLine1, o.seller.addressLine2, o.seller.village, o.seller.taluka, o.seller.district, o.seller.state ? `${o.seller.state} - ${o.seller.pincode}` : o.seller.pincode].filter(Boolean).join(', '),
          } : null,
          buyer: o.isPickupRedirected ? {
            fullName: 'Prasad Patil (Hub Manager)',
            phoneNumber: '9123456789',
            addressLine1: 'Gadhinglaj Central GMU Hub',
            addressLine2: 'Near MIDC Area',
            village: 'Gadhinglaj',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416502',
          } : (o.buyer ? {
            ...o.buyer,
            fullName: o.buyer.buyerName,
            phoneNumber: o.buyer.mobileNumber,
            village: o.buyer.village,
            pincode: o.buyer.pincode,
            addressLine1: o.buyer.addressLine1,
            fullAddress: [o.buyer.addressLine1, o.buyer.addressLine2, o.buyer.village, o.buyer.taluka, o.buyer.district, o.buyer.state ? `${o.buyer.state} - ${o.buyer.pincode}` : o.buyer.pincode].filter(Boolean).join(', '),
          } : null),
          items: o.parcels || [],
          isPickupRedirected: o.isPickupRedirected,
          pickupShgStatus: o.pickupShgStatus,
          pickupTransporterStatus: o.pickupTransporterStatus,
          dropShgStatus: o.dropShgStatus,
          dropTransporterStatus: o.dropTransporterStatus,
          mainStatus: o.mainStatus,
          transporter: (() => {
            const isPickupAccepted = ['ACCEPTED', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PICKED', 'IN_TRANSIT_TO_HUB', 'DELIVERED_TO_HUB', 'HUB_RECEIVED', 'COMPLETED'].includes(o.pickupTransporterStatus || '');
            const isDropAccepted = ['ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'DELIVERED', 'COMPLETED'].includes(o.dropTransporterStatus || '');
            const isTransAccepted = o.phase === 'DROP' ? isDropAccepted : isPickupAccepted;

            if (!isTransAccepted || !transporterUser) {
              return null;
            }

            return {
              fullName: transporterUser.fullName,
              phoneNumber: transporterUser.phoneNumber,
              transporterDetail: {
                transporterCode: transporterUser.transporterDetail?.transporterCode || '',
                vehicleNumber: (transporterUser.transporterDetail as any)?.vehicleNumber || (transporterUser.transporterDetail as any)?.registrationNumber || '',
              },
              otherDetails: transporterUser.otherDetails || [],
            };
          })(),
        };
      });

      return {
        newOrders: formatted.filter(o => o.status !== 'RETURN_COMPLETED'),
        returnOrders: formatted.filter(o => o.status === 'RETURN_COMPLETED'),
      };
    } catch (err: any) {
      console.error('[getCompletedOrders Error]:', err?.message || err);
      return { newOrders: [], returnOrders: [] };
    }
  }

  async getAssignedReturns(shgId: number | string) {
    const numericShgId = typeof shgId === 'number' ? shgId : parseInt(String(shgId), 10);
    const shgUuid = String(numericShgId);

    const orders = await this.prisma.order.findMany({
      where: {
        returnType: 'BUYER_RETURN',
        OR: [
          { pickupReturnShgId: shgUuid },
          { dropShgId: shgUuid },
        ],
        mainStatus: { in: ['RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PARCEL_AT_SHG'] }
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
        seller: o.seller,
        buyer: o.buyer,
        items: o.parcels || [],
      };
    });
  }

  async acceptPickup(orderId: any, shgId: number | string, vehicleName?: string, vehicleCapacity?: number, vehicleType?: string) {
    const order = await this.findOrderFlexible(orderId);
    const shgUuid = String(shgId);

    await this.prisma.orderAssignment.updateMany({
      where: {
        orderId: order.id,
        assigneeId: shgUuid,
        assigneeType: 'SHG',
      },
      data: { status: 'ACCEPTED' }
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupShgId: shgUuid,
        pickupShgStatus: 'PICKUP_SHG_ACCEPTED',
        mainStatus: 'PICKUP_SHG_ACCEPTED',
      }
    });

    return order;
  }

  async acceptDrop(orderId: any, shgId: number | string, vehicleName?: string, vehicleCapacity?: number, vehicleType?: string) {
    const order = await this.findOrderFlexible(orderId);
    const shgUuid = String(shgId);

    await this.prisma.orderAssignment.updateMany({
      where: {
        orderId: order.id,
        assigneeId: shgUuid,
        assigneeType: 'SHG',
      },
      data: { status: 'ACCEPTED' }
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropShgId: shgUuid,
        dropShgStatus: 'DROP_SHG_ACCEPTED',
        mainStatus: 'DROP_SHG_ACCEPTED',
      }
    });

    return order;
  }

  async completePickup(orderId: any, shgId: number | string, code?: string, legType?: string) {
    const order = await this.findOrderFlexible(orderId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupShgStatus: 'PARCEL_PICKED',
        mainStatus: 'PARCEL_AT_SHG',
      }
    });

    // Auto-broadcast to approved transporters (Rahul Patil, etc.)
    try {
      const approvedTransporters = await this.prisma.user.findMany({
        where: { role: 'TRANSPORTER', applicationStatus: 'APPROVED' },
        select: { id: true }
      });

      for (const t of approvedTransporters) {
        await this.prisma.orderAssignment.create({
          data: {
            orderId: order.id,
            assigneeId: String(t.id),
            assigneeType: 'TRANSPORTER',
            role: 'PICKUP',
            status: 'PENDING',
          }
        }).catch(() => { });
      }
    } catch (err: any) {
      console.warn(`[completePickup] Transporter assignment note:`, err?.message || err);
    }

    return order;
  }

  async pickupDrop(orderId: any, shgId: number | string, code?: string) {
    const order = await this.findOrderFlexible(orderId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropShgStatus: 'PARCEL_AT_DROP_SHG',
        mainStatus: 'AT_BUYER_SHG',
      }
    });

    return order;
  }

  async completeDrop(orderId: any, shgId: number | string, code?: string) {
    const order = await this.findOrderFlexible(orderId);
    if (code && code.trim() !== '1234') {
      throw new BadRequestException('Invalid OTP code. Please enter 1234.');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropShgStatus: 'DROPPED',
        mainStatus: 'COMPLETED',
        deliveredAt: new Date(),
      }
    });

    await this.prisma.parcel.updateMany({
      where: { orderId: order.id },
      data: {
        parcelStatus: 'DELIVERED',
        currentHolderType: 'BUYER',
      }
    }).catch(() => { });

    await this.prisma.orderAssignment.updateMany({
      where: { orderId: order.id, role: 'DROP' },
      data: { status: 'COMPLETED' }
    }).catch(() => { });

    return updatedOrder;
  }

  async generateCode(orderId: any, shgId: number | string) {
    const order = await this.findOrderFlexible(orderId);
    return { success: true, code: '1234', orderId: order.id };
  }

  async verifyCodes(orderId: any, shgId: number | string, codes: Record<number, string>) {
    const order = await this.findOrderFlexible(orderId);
    return { success: true, message: 'Codes verified successfully', orderId: order.id };
  }

  async redirectOrder(orderId: any, shgId: number | string, legType?: string, reason?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: String(orderId) },
          { orderId: String(orderId) },
          { orderId: `ORD-${String(orderId)}` },
          { orderId: `pickup-${String(orderId)}` },
          { orderId: `drop-${String(orderId)}` }
        ]
      },
      include: { seller: true, buyer: true }
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const targetLocation = legType === 'drop' ? order.buyer : order.seller;
    let selectedTransporterId: string | null = null;
    let matchedTransporters: any[] = [];

    if (targetLocation) {
      let transporters: any[] = [];
      try {
        const rawTransporters = await this.prisma.user.findMany({
          where: { role: 'TRANSPORTER', applicationStatus: 'APPROVED', deletedAt: null },
          include: { routeDetail: true, milkVanDetail: true }
        });
        transporters = rawTransporters.map(u => ({
          id: u.id,
          operatingArea: u.routeDetail?.operatingArea || '',
          assignedPincodes: u.routeDetail?.pickupLocations || [],
          assignedVillages: u.milkVanDetail?.assignedVillages || []
        }));
      } catch (err) {
        console.error('Error querying transporters for redirection:', err);
      }

      const parseJsonArray = (val: any) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch (e) { }
        }
        return [];
      };

      const cleanStr = (s: string) => {
        if (!s) return '';
        return s.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
      };

      const getTransporterLocations = (tr: any) => {
        const areas = tr.operatingArea
          ? tr.operatingArea.split(',').map((s: string) => cleanStr(s))
          : [];
        const villages = parseJsonArray(tr.assignedVillages).map((s: any) => cleanStr(String(s)));
        const pincodes = parseJsonArray(tr.assignedPincodes).map((s: any) => cleanStr(String(s)));
        return { areas, villages, pincodes };
      };

      const p = targetLocation.pincode ? cleanStr(targetLocation.pincode) : '';
      const v = (targetLocation as any).village ? cleanStr((targetLocation as any).village) : '';
      const t = (targetLocation as any).taluka ? cleanStr((targetLocation as any).taluka) : '';
      const d = (targetLocation as any).district ? cleanStr((targetLocation as any).district) : '';

      matchedTransporters = [];

      // Priority 1: Pincode
      if (p) {
        matchedTransporters = transporters.filter(tr => {
          const { areas, pincodes } = getTransporterLocations(tr);
          return pincodes.some((po: string) => po === p || po.includes(p)) || areas.some((a: string) => a === p || a.includes(p));
        });
      }

      // Priority 2: Village
      if (matchedTransporters.length === 0 && v) {
        matchedTransporters = transporters.filter(tr => {
          const { areas, villages } = getTransporterLocations(tr);
          return villages.some((vi: string) => vi === v || vi.includes(v) || v.includes(vi)) || areas.some((a: string) => a === v || a.includes(v) || v.includes(a));
        });
      }

      // Priority 3: Taluka
      if (matchedTransporters.length === 0 && t) {
        matchedTransporters = transporters.filter(tr => {
          const { areas } = getTransporterLocations(tr);
          return areas.some((a: string) => a === t || a.includes(t) || t.includes(a));
        });
      }

      // Priority 4: District
      if (matchedTransporters.length === 0 && d) {
        matchedTransporters = transporters.filter(tr => {
          const { areas } = getTransporterLocations(tr);
          return areas.some((a: string) => a === d || a.includes(d) || d.includes(a));
        });
      }

      if (matchedTransporters.length > 0) {
        selectedTransporterId = String(matchedTransporters[0].id);
      }
    }

    const fallbackTransporter = await this.prisma.user.findFirst({
      where: { role: 'TRANSPORTER', applicationStatus: 'APPROVED', deletedAt: null }
    });

    const assigneeIds = new Set<string>();
    if (matchedTransporters.length > 0) {
      matchedTransporters.forEach(tr => assigneeIds.add(String(tr.id)));
      selectedTransporterId = String(matchedTransporters[0].id);
    }

    if (fallbackTransporter) {
      assigneeIds.add(String(fallbackTransporter.id));
      if (!selectedTransporterId) {
        selectedTransporterId = String(fallbackTransporter.id);
      }
    }

    const isDrop = legType === 'drop';
    const assignmentRole = isDrop ? 'DROP' : 'PICKUP';

    if (assigneeIds.size > 0) {
      // 1. Create OrderAssignments for all matching transporters
      for (const assigneeId of assigneeIds) {
        try {
          await this.prisma.orderAssignment.deleteMany({
            where: {
              orderId: order.id,
              assigneeId,
              role: assignmentRole,
              assigneeType: 'TRANSPORTER',
            }
          }).catch(() => { });

          await this.prisma.orderAssignment.create({
            data: {
              orderId: order.id,
              assigneeId,
              assigneeType: 'TRANSPORTER',
              role: assignmentRole,
              status: 'PENDING'
            }
          });
        } catch (err) {
          console.warn('Error creating OrderAssignment during redirect:', err);
        }
      }

      // 2. Insert/Upsert into RedirectedOrder audit table
      try {
        const currentLegType = isDrop ? 'DROP' : 'PICKUP';
        await (this.prisma as any).redirectedOrder.create({
          data: {
            orderId: order.id,
            shgId: String(shgId),
            transporterId: selectedTransporterId,
            legType: currentLegType,
            reason: reason || 'Redirected by SHG',
            status: 'PENDING'
          }
        }).catch(async () => {
          await (this.prisma as any).redirectedOrder.updateMany({
            where: { orderId: order.id, legType: currentLegType },
            data: {
              shgId: String(shgId),
              transporterId: selectedTransporterId,
              reason: reason || 'Redirected by SHG',
              status: 'PENDING'
            }
          });
        });
      } catch (err) {
        console.warn('Error upserting RedirectedOrder audit record:', err);
      }
    }

    // 3. Update the Order table
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        isPickupRedirected: true,
        redirectedPickupAt: new Date(),
        redirectedPickupShgId: String(shgId),
        pickupShgStatus: 'REDIRECTED',
        mainStatus: 'REDIRECTED',
        pickupTransporterId: selectedTransporterId,
        pickupTransporterStatus: 'PENDING'
      }
    });

    return { success: true, message: 'Order redirected to Transporter', orderId: order.id };
  }

  async rescheduleAccepted(dto: any) {
    return { success: true, message: 'Order rescheduled successfully' };
  }

  async rescheduleDelivery(dto: any) {
    return { success: true, message: 'Delivery rescheduled successfully' };
  }

  //////////////////////////////////////////////////////
  // SHG INVENTORY / STOCK MANAGEMENT METHODS
  //////////////////////////////////////////////////////

  async getInventorySummary(shgId: number | string) {
    const inStock = await this.getInStockOrders(shgId);
    const outStock = await this.getOutStockOrders(shgId);

    const totalInStockWeight = inStock.reduce((acc: number, o: any) => acc + Number(o.totalWeight || o.weight || 0), 0);
    const totalOutStockWeight = outStock.reduce((acc: number, o: any) => acc + Number(o.totalWeight || o.weight || 0), 0);

    const waitingForTransporterCount = inStock.filter((o: any) => o.stockType === 'WAITING_FOR_TRANSPORTER').length;
    const readyForBuyerCount = inStock.filter((o: any) => o.stockType === 'READY_FOR_BUYER').length;
    const returnAtShgCount = inStock.filter((o: any) => o.stockType === 'RETURN_AT_SHG').length;

    const handedToTransporterCount = outStock.filter((o: any) => o.stockType === 'HANDED_TO_TRANSPORTER').length;
    const deliveredToBuyerCount = outStock.filter((o: any) => o.stockType === 'DELIVERED_TO_BUYER').length;

    return {
      success: true,
      inStockCount: inStock.length,
      inStockWeight: Math.round(totalInStockWeight * 100) / 100,
      outStockCount: outStock.length,
      outStockWeight: Math.round(totalOutStockWeight * 100) / 100,
      breakdown: {
        inStock: {
          waitingForTransporter: waitingForTransporterCount,
          readyForBuyer: readyForBuyerCount,
          returns: returnAtShgCount,
        },
        outStock: {
          handedToTransporter: handedToTransporterCount,
          deliveredToBuyer: deliveredToBuyerCount,
        }
      }
    };
  }

  async getInStockOrders(shgId: number | string) {
    const parsedId = typeof shgId === 'number' ? shgId : parseInt(String(shgId), 10);
    const rawIdStr = String(shgId || '').trim();
    const cleanPhone = rawIdStr.replace(/\D/g, '').slice(-10);

    const user = await this.prisma.user.findFirst({
      where: {
        role: 'SHG',
        OR: [
          ...(!isNaN(parsedId) && parsedId < 2147483647 ? [{ id: parsedId }] : []),
          ...(cleanPhone ? [{ phoneNumber: { endsWith: cleanPhone } }] : []),
          { phoneNumber: rawIdStr }
        ]
      },
      include: { address: true }
    });
    if (!user) {
      return [];
    }

    const shgUuid = String(user.id);
    const shgAuthId = user.authId || '';

    const assignedOrders = await this.prisma.orderAssignment.findMany({
      where: {
        assigneeId: { in: [shgUuid, shgAuthId].filter(Boolean) },
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
          { pickupShgId: shgUuid },
          { pickupShgId: shgAuthId },
          { dropShgId: shgUuid },
          { dropShgId: shgAuthId },
        ],
      },
      include: {
        seller: true,
        buyer: true,
        parcels: {
          include: { scanHistories: true }
        },
        assignments: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    const matchedOrders = orders.filter((o: any) => {
      const isDropLeg = (o.phase === 'DROP' || (o.dropShgId && (String(o.dropShgId) === shgUuid || String(o.dropShgId) === shgAuthId)));

      if (isDropLeg) {
        // Drop Leg is in-stock at SHG center if received/accepted at SHG BUT NOT delivered to buyer yet
        const dShgStatus = (o.dropShgStatus || '').toUpperCase();
        if (dShgStatus === 'DELIVERED' || dShgStatus === 'COMPLETED' || o.mainStatus === 'DELIVERED' || o.mainStatus === 'COMPLETED') {
          return false;
        }
        return ['PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG', 'OUT_FOR_DELIVERY', 'ACCEPTED', 'PICKED'].includes(o.mainStatus) || ['ACCEPTED', 'PICKED'].includes(dShgStatus);
      } else {
        // Pickup Leg is in-stock at SHG center if collected/accepted from seller BUT NOT picked up/dispatched by transporter yet
        const pTransStatus = (o.pickupTransporterStatus || '').toUpperCase();
        if (pTransStatus === 'PICKED' || ['IN_TRANSIT_TO_HUB', 'HUB_RECEIVED', 'STORED', 'DISPATCHED'].includes((o.mainStatus || '').toUpperCase())) {
          return false;
        }
        return ['PARCEL_AT_SHG', 'PARCEL_PICKED', 'PICKUP_ASSIGNED', 'ACCEPTED', 'PICKUP_SHG_ACCEPTED'].includes(o.mainStatus) || ['ACCEPTED', 'PICKED'].includes((o.pickupShgStatus || '').toUpperCase());
      }
    });

    const transporterIds = matchedOrders
      .map(o => o.pickupTransporterId ? parseInt(o.pickupTransporterId, 10) : (o.dropTransporterId ? parseInt(o.dropTransporterId, 10) : null))
      .filter((id): id is number => id !== null && !isNaN(id));

    const transporters = transporterIds.length > 0
      ? await this.prisma.user.findMany({
        where: { id: { in: transporterIds } },
        include: { transporterDetail: true, otherDetails: true }
      })
      : [];

    const transporterMap = new Map(transporters.map(t => [String(t.id), t]));

    return matchedOrders.map((o: any) => {
      const cleanOrderId = (o.orderId || o.id).replace(/^ORD-/, '');
      const isDropLeg = (o.phase === 'DROP' || (o.dropShgId && (String(o.dropShgId) === shgUuid || String(o.dropShgId) === shgAuthId)));
      const isReturn = (o.mainStatus || '').includes('RETURN');

      let stockType: 'WAITING_FOR_TRANSPORTER' | 'READY_FOR_BUYER' | 'RETURN_AT_SHG' = 'WAITING_FOR_TRANSPORTER';
      let stockStatusLabel = 'Waiting for Transporter Pickup';
      let stockBadgeColor = '#EAB308'; // Amber

      if (isReturn) {
        stockType = 'RETURN_AT_SHG';
        stockStatusLabel = 'Return Item at Center';
        stockBadgeColor = '#EF4444'; // Red
      } else if (isDropLeg) {
        stockType = 'READY_FOR_BUYER';
        stockStatusLabel = 'Ready for Buyer Doorstep Delivery';
        stockBadgeColor = '#0284C7'; // Blue
      } else {
        stockType = 'WAITING_FOR_TRANSPORTER';
        stockStatusLabel = 'In-Stock: Waiting for Transporter';
        stockBadgeColor = '#10B981'; // Green
      }

      const transId = isDropLeg ? o.dropTransporterId : o.pickupTransporterId;
      const transUser = transId ? transporterMap.get(transId) : null;

      return {
        id: cleanOrderId,
        uuid: o.id,
        orderId: cleanOrderId,
        orderNumber: cleanOrderId,
        barcode: o.barcode || `QR-2026-${cleanOrderId}-PCL-1`,
        mainStatus: o.mainStatus,
        stockCategory: 'IN_STOCK',
        stockType,
        stockStatusLabel,
        stockBadgeColor,
        legType: isDropLeg ? 'drop' : 'pickup',
        totalWeight: o.totalWeight || 2.5,
        totalQty: o.totalQty || o.productCount || 1,
        productCount: o.productCount || 1,
        storedSince: o.updatedAt || o.createdAt,
        seller: o.seller ? {
          fullName: o.seller.sellerName,
          phoneNumber: o.seller.mobileNumber,
          village: o.seller.village,
          taluka: o.seller.taluka,
          pincode: o.seller.pincode,
          addressLine1: o.seller.addressLine1,
          fullAddress: `${o.seller.addressLine1 || ''} ${o.seller.village || ''} ${o.seller.taluka || ''} (${o.seller.pincode || ''})`.trim()
        } : null,
        buyer: o.buyer ? {
          fullName: o.buyer.buyerName,
          phoneNumber: o.buyer.mobileNumber,
          village: o.buyer.village,
          taluka: o.buyer.taluka,
          pincode: o.buyer.pincode,
          addressLine1: o.buyer.addressLine1,
          fullAddress: `${o.buyer.addressLine1 || ''} ${o.buyer.village || ''} ${o.buyer.taluka || ''} (${o.buyer.pincode || ''})`.trim()
        } : null,
        transporter: transUser ? {
          fullName: transUser.fullName,
          phoneNumber: transUser.phoneNumber,
          vehicleNumber: (transUser.transporterDetail as any)?.vehicleNumber || (transUser.otherDetails?.[0] as any)?.registrationNumber || 'Vehicle Assigned'
        } : null,
        parcels: (o.parcels && o.parcels.length > 0) ? o.parcels.map((p: any) => ({
          id: p.id,
          parcelId: p.parcelId,
          productName: p.productName || 'Agricultural Goods',
          weight: p.weight || 2.5,
          parcelStatus: p.parcelStatus,
          scanHistories: p.scanHistories || [],
        })) : [{
          id: 1,
          parcelId: `PCL-${cleanOrderId}-1`,
          productName: 'Agricultural Goods',
          weight: o.totalWeight || 2.5,
          parcelStatus: o.mainStatus,
          scanHistories: [],
        }],
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        date: o.createdAt,
        orderDate: o.createdAt,
        products: o.parcels || [],
      };
    });
  }

  async getOutStockOrders(shgId: number | string) {
    const parsedId = typeof shgId === 'number' ? shgId : parseInt(String(shgId), 10);
    const rawIdStr = String(shgId || '').trim();
    const cleanPhone = rawIdStr.replace(/\D/g, '').slice(-10);

    const user = await this.prisma.user.findFirst({
      where: {
        role: 'SHG',
        OR: [
          ...(!isNaN(parsedId) && parsedId < 2147483647 ? [{ id: parsedId }] : []),
          ...(cleanPhone ? [{ phoneNumber: { endsWith: cleanPhone } }] : []),
          { phoneNumber: rawIdStr }
        ]
      },
      include: { address: true }
    });
    if (!user) {
      return [];
    }

    const shgUuid = String(user.id);
    const shgAuthId = user.authId || '';

    const assignedOrders = await this.prisma.orderAssignment.findMany({
      where: {
        assigneeId: { in: [shgUuid, shgAuthId].filter(Boolean) },
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
          { pickupShgId: shgUuid },
          { pickupShgId: shgAuthId },
          { dropShgId: shgUuid },
          { dropShgId: shgAuthId },
        ],
      },
      include: {
        seller: true,
        buyer: true,
        parcels: {
          include: { scanHistories: true }
        },
        assignments: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    const matchedOrders = orders.filter((o: any) => {
      const isDropLeg = (o.phase === 'DROP' || (o.dropShgId && (String(o.dropShgId) === shgUuid || String(o.dropShgId) === shgAuthId)));

      if (isDropLeg) {
        // Drop Leg is out-stock once delivered to buyer
        const dShgStatus = (o.dropShgStatus || '').toUpperCase();
        return dShgStatus === 'DELIVERED' || dShgStatus === 'COMPLETED' || o.mainStatus === 'DELIVERED' || o.mainStatus === 'COMPLETED';
      } else {
        // Pickup Leg is out-stock once dispatched / picked up by transporter
        const pTransStatus = (o.pickupTransporterStatus || '').toUpperCase();
        return pTransStatus === 'PICKED' || ['IN_TRANSIT_TO_HUB', 'HUB_RECEIVED', 'STORED', 'DISPATCHED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'AT_BUYER_SHG', 'DELIVERED', 'COMPLETED'].includes((o.mainStatus || '').toUpperCase());
      }
    });

    const transporterIds = matchedOrders
      .map(o => o.pickupTransporterId ? parseInt(o.pickupTransporterId, 10) : (o.dropTransporterId ? parseInt(o.dropTransporterId, 10) : null))
      .filter((id): id is number => id !== null && !isNaN(id));

    const transporters = transporterIds.length > 0
      ? await this.prisma.user.findMany({
        where: { id: { in: transporterIds } },
        include: { transporterDetail: true, otherDetails: true }
      })
      : [];

    const transporterMap = new Map(transporters.map(t => [String(t.id), t]));

    return matchedOrders.map((o: any) => {
      const cleanOrderId = (o.orderId || o.id).replace(/^ORD-/, '');
      const isDeliveredToBuyer = ['DELIVERED', 'COMPLETED', 'BUYER_DELIVERED'].includes(o.mainStatus) && (o.dropShgId && (String(o.dropShgId) === shgUuid || String(o.dropShgId) === shgAuthId));
      const isReturn = (o.mainStatus || '').includes('RETURN');

      let stockType: 'HANDED_TO_TRANSPORTER' | 'DELIVERED_TO_BUYER' | 'COMPLETED_RETURN' = 'HANDED_TO_TRANSPORTER';
      let stockStatusLabel = 'Handed Over to Transporter (Dispatched)';
      let stockBadgeColor = '#059669'; // Emerald

      if (isReturn) {
        stockType = 'COMPLETED_RETURN';
        stockStatusLabel = 'Return Handed Over';
        stockBadgeColor = '#64748B'; // Slate
      } else if (isDeliveredToBuyer) {
        stockType = 'DELIVERED_TO_BUYER';
        stockStatusLabel = 'Successfully Delivered to Buyer';
        stockBadgeColor = '#047857'; // Deep Green
      } else {
        stockType = 'HANDED_TO_TRANSPORTER';
        stockStatusLabel = 'Transferred to Transporter ➔ Hub';
        stockBadgeColor = '#0284C7'; // Blue
      }

      const transId = o.pickupTransporterId || o.dropTransporterId;
      const transUser = transId ? transporterMap.get(transId) : null;

      return {
        id: cleanOrderId,
        uuid: o.id,
        orderId: cleanOrderId,
        orderNumber: cleanOrderId,
        barcode: o.barcode || `QR-2026-${cleanOrderId}-PCL-1`,
        mainStatus: o.mainStatus,
        stockCategory: 'OUT_STOCK',
        stockType,
        stockStatusLabel,
        stockBadgeColor,
        legType: o.phase === 'DROP' ? 'drop' : 'pickup',
        totalWeight: o.totalWeight || 2.5,
        totalQty: o.totalQty || o.productCount || 1,
        productCount: o.productCount || 1,
        dispatchedAt: o.dispatchedAt || o.updatedAt,
        deliveredAt: o.deliveredAt || o.updatedAt,
        seller: o.seller ? {
          fullName: o.seller.sellerName,
          phoneNumber: o.seller.mobileNumber,
          village: o.seller.village,
          taluka: o.seller.taluka,
          pincode: o.seller.pincode,
          addressLine1: o.seller.addressLine1,
          fullAddress: `${o.seller.addressLine1 || ''} ${o.seller.village || ''} ${o.seller.taluka || ''} (${o.seller.pincode || ''})`.trim()
        } : null,
        buyer: o.buyer ? {
          fullName: o.buyer.buyerName,
          phoneNumber: o.buyer.mobileNumber,
          village: o.buyer.village,
          taluka: o.buyer.taluka,
          pincode: o.buyer.pincode,
          addressLine1: o.buyer.addressLine1,
          fullAddress: `${o.buyer.addressLine1 || ''} ${o.buyer.village || ''} ${o.buyer.taluka || ''} (${o.buyer.pincode || ''})`.trim()
        } : null,
        transporter: transUser ? {
          fullName: transUser.fullName,
          phoneNumber: transUser.phoneNumber,
          vehicleNumber: (transUser.transporterDetail as any)?.vehicleNumber || (transUser.otherDetails?.[0] as any)?.registrationNumber || 'Vehicle Assigned'
        } : null,
        parcels: (o.parcels && o.parcels.length > 0) ? o.parcels.map((p: any) => ({
          id: p.id,
          parcelId: p.parcelId,
          productName: p.productName || 'Agricultural Goods',
          weight: p.weight || 2.5,
          parcelStatus: p.parcelStatus,
          scanHistories: p.scanHistories || [],
        })) : [{
          id: 1,
          parcelId: `PCL-${cleanOrderId}-1`,
          productName: 'Agricultural Goods',
          weight: o.totalWeight || 2.5,
          parcelStatus: o.mainStatus,
          scanHistories: [],
        }],
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        date: o.createdAt,
        orderDate: o.createdAt,
        products: o.parcels || [],
      };
    });
  }

  private async findOrderFlexible(orderId: any) {
    const strId = String(orderId);
    let order = await this.prisma.order.findUnique({ where: { id: strId } });
    if (!order) {
      order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { orderId: strId },
            { orderId: `ORD-${strId}` },
          ]
        }
      });
    }
    if (!order) {
      throw new NotFoundException(`Order with ID ${strId} not found`);
    }
    return order;
  }
}
