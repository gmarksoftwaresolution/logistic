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
        },
        select: {
          id: true,
          authId: true,
          role: true,
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
              'PARCEL_AT_PICKUP_SHG',
              'RETURN_PARCEL_AT_SHG',
              'TRANSPORTER_ACCEPTED',
              'IN_TRANSIT',
              'IN_DIRECT_TRANSIT',
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
        select: {
          id: true,
          orderId: true,
          barcode: true,
          phase: true,
          flowType: true,
          sellerId: true,
          buyerId: true,
          productCount: true,
          totalQty: true,
          totalWeight: true,
          pickupShgId: true,
          pickupTransporterId: true,
          dropShgId: true,
          dropTransporterId: true,
          mainStatus: true,
          pickupShgStatus: true,
          pickupTransporterStatus: true,
          dropShgStatus: true,
          dropTransporterStatus: true,
          createdAt: true,
          seller: {
            select: {
              id: true,
              sellerName: true,
              mobileNumber: true,
              village: true,
              taluka: true,
              district: true,
              state: true,
              pincode: true,
              addressLine1: true,
            }
          },
          buyer: {
            select: {
              id: true,
              buyerName: true,
              mobileNumber: true,
              village: true,
              taluka: true,
              district: true,
              state: true,
              pincode: true,
              addressLine1: true,
            }
          },
          parcels: {
            select: {
              parcelId: true,
              productName: true,
              quantity: true,
              weight: true,
              parcelStatus: true,
              currentHolderId: true,
              currentHolderType: true,
              verificationToken: true,
              qrCodeValue: true,
            }
          },
          assignments: {
            select: {
              role: true,
              assigneeId: true,
              assigneeType: true,
              status: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      const allShgUsers = await this.prisma.user.findMany({
        where: { role: 'SHG', applicationStatus: 'APPROVED' },
        select: {
          id: true,
          authId: true,
          fullName: true,
          phoneNumber: true,
          address: { select: { village: true, pincode: true } },
          shgDetail: { select: { shgName: true } }
        }
      }).catch(() => []);

      const normalizeStr = (s?: string | null): string => {
        if (!s) return '';
        return s.replace(/[^a-z0-9]/gi, '').trim().toLowerCase();
      };

      const activePickupOrders = orders.filter((o: any) => {
        const pTransStatus = (o.pickupTransporterStatus || '').toUpperCase();
        const mStatus = (o.mainStatus || '').toUpperCase();
        if (pTransStatus === 'COMPLETED' || ['IN_TRANSIT', 'IN_DIRECT_TRANSIT', 'PARCEL_AT_DROP_SHG', 'DELIVERED', 'COMPLETED'].includes(mStatus)) {
          return false;
        }
        return true;
      });

      return activePickupOrders.map((o: any) => {
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

        const isRedirected = !!((o as any).isPickupRedirected || o.pickupShgStatus === 'REDIRECTED' || o.pickupShgStatus === 'REJECTED' || o.pickupShgStatus === 'DECLINED' || o.pickupShgStatus === 'SHG_DECLINED' || o.pickupType === 'DIRECT_SELLER' || o.pickupType === 'SELLER_DIRECT' || o.pickupType === 'SELLER');

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

        const buyerVillageNorm = normalizeStr(o.buyer?.village);
        const dropShgId = o.dropShgId;
        const dropAssignShgId = o.assignments?.find((a: any) => a.role === 'DROP' && a.assigneeType === 'SHG')?.assigneeId;

        const dropShgUser = allShgUsers.find(u =>
          (dropShgId && (String(u.id) === String(dropShgId) || u.authId === String(dropShgId))) ||
          (dropAssignShgId && (String(u.id) === String(dropAssignShgId) || u.authId === String(dropAssignShgId))) ||
          (buyerVillageNorm && normalizeStr(u.address?.village) === buyerVillageNorm)
        ) || null;

        const dropShgData = dropShgUser ? {
          id: dropShgUser.id,
          authId: dropShgUser.authId,
          crpName: dropShgUser.shgDetail?.crpName || dropShgUser.fullName || 'Drop SHG Lead',
          personName: dropShgUser.shgDetail?.crpName || dropShgUser.fullName || 'Drop SHG Lead',
          fullName: dropShgUser.shgDetail?.crpName || dropShgUser.fullName || 'Drop SHG Lead',
          name: dropShgUser.shgDetail?.crpName || dropShgUser.fullName || 'Drop SHG Lead',
          phoneNumber: dropShgUser.shgDetail?.crpMobile || dropShgUser.phoneNumber || '',
          mobileNumber: dropShgUser.shgDetail?.crpMobile || dropShgUser.phoneNumber || '',
          phone: dropShgUser.shgDetail?.crpMobile || dropShgUser.phoneNumber || '',
          shgName: dropShgUser.shgDetail?.shgName || `${dropShgUser.address?.village || o.buyer?.village || ''} Drop SHG`,
          village: dropShgUser.address?.village || o.buyer?.village || '',
          taluka: dropShgUser.address?.taluka || o.buyer?.taluka || '',
          district: dropShgUser.address?.district || o.buyer?.district || '',
          state: dropShgUser.address?.state || o.buyer?.state || 'Maharashtra',
          pincode: dropShgUser.address?.pincode || o.buyer?.pincode || '',
          addressLine1: dropShgUser.address?.deliveryAddress || dropShgUser.address?.landmark || dropShgUser.address?.houseNo || dropShgUser.address?.village || '',
          fullAddress: [
            dropShgUser.address?.deliveryAddress || dropShgUser.address?.landmark || dropShgUser.address?.houseNo,
            dropShgUser.address?.village || o.buyer?.village,
            dropShgUser.address?.taluka || o.buyer?.taluka,
            dropShgUser.address?.district || o.buyer?.district,
            dropShgUser.address?.state ? `${dropShgUser.address.state} - ${dropShgUser.address.pincode}` : (dropShgUser.address?.pincode || o.buyer?.pincode)
          ].filter(Boolean).join(', ') || `${dropShgUser.address?.village || o.buyer?.village || ''} Drop SHG Center`,
          address: dropShgUser.address ? {
            addressLine1: dropShgUser.address.deliveryAddress || dropShgUser.address.landmark || dropShgUser.address.houseNo || dropShgUser.address.village,
            village: dropShgUser.address.village,
            taluka: dropShgUser.address.taluka,
            district: dropShgUser.address.district,
            state: dropShgUser.address.state,
            pincode: dropShgUser.address.pincode,
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
          flowType: o.flowType,
          pickupShgId: o.pickupShgId,
          dropShgId: o.dropShgId,
          pickupTransporterId: o.pickupTransporterId,
          pickupTransporterStatus: o.pickupTransporterStatus || 'PENDING',
          pickupShgStatus: o.pickupShgStatus,
          dropShgStatus: o.dropShgStatus,
          mainStatus: o.mainStatus,
          isPickupRedirected: o.isPickupRedirected || isRedirected,
          isRedirected: isRedirected,
          pickupType: o.pickupType,
          seller: o.seller,
          buyer: o.buyer,
          shg: shgData,
          pickupShg: shgData,
          pickupShgDetails: shgData,
          dropShg: dropShgData,
          dropShgDetails: dropShgData,
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
          mainStatus: { in: ['IN_TRANSIT', 'IN_DIRECT_TRANSIT', 'HUB_RECEIVED', 'STORED', 'BARCODE_GENERATED', 'DROP_PENDING', 'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DISPATCHED', 'HUB_DELIVERED', 'IN_TRANSIT_TO_DROP', 'IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_BUYER', 'DROP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG', 'REJECTED'] }
        },
        include: {
          seller: true,
          buyer: true,
          parcels: true,
          assignments: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const activeOrders = orders.slice(0, 50);

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

        const dropShgIdVal = o.dropShgId;
        const dropAssignShgId = o.assignments?.find((a: any) => a.role === 'DROP' && a.assigneeType === 'SHG')?.assigneeId;
        const buyerVillageNorm = normalizeStr(o.buyer?.village);

        const dropShgUser = allShgUsers.find(u =>
          (dropShgIdVal && (String(u.id) === String(dropShgIdVal) || u.authId === String(dropShgIdVal))) ||
          (dropAssignShgId && (String(u.id) === String(dropAssignShgId) || u.authId === String(dropAssignShgId))) ||
          (buyerVillageNorm && normalizeStr(u.address?.village) === buyerVillageNorm)
        ) || null;

        const pickupShgIdVal = o.pickupShgId;
        const pickupAssignShgId = o.assignments?.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'SHG')?.assigneeId;
        const sellerVillageNorm = normalizeStr(o.seller?.village);

        const pickupShgUser = allShgUsers.find(u =>
          (pickupShgIdVal && (String(u.id) === String(pickupShgIdVal) || u.authId === String(pickupShgIdVal))) ||
          (pickupAssignShgId && (String(u.id) === String(pickupAssignShgId) || u.authId === String(pickupAssignShgId))) ||
          (sellerVillageNorm && normalizeStr(u.address?.village) === sellerVillageNorm)
        ) || null;

        const dropShgData = dropShgUser ? {
          id: dropShgUser.id,
          authId: dropShgUser.authId,
          crpName: dropShgUser.shgDetail?.crpName || dropShgUser.fullName || 'Drop SHG Lead',
          personName: dropShgUser.shgDetail?.crpName || dropShgUser.fullName || 'Drop SHG Lead',
          fullName: dropShgUser.shgDetail?.crpName || dropShgUser.fullName || 'Drop SHG Lead',
          name: dropShgUser.shgDetail?.crpName || dropShgUser.fullName || 'Drop SHG Lead',
          phoneNumber: dropShgUser.shgDetail?.crpMobile || dropShgUser.phoneNumber || '',
          mobileNumber: dropShgUser.shgDetail?.crpMobile || dropShgUser.phoneNumber || '',
          phone: dropShgUser.shgDetail?.crpMobile || dropShgUser.phoneNumber || '',
          shgName: dropShgUser.shgDetail?.shgName || `${dropShgUser.address?.village || ''} Drop SHG`,
          village: dropShgUser.address?.village || o.buyer?.village || '',
          taluka: dropShgUser.address?.taluka || o.buyer?.taluka || '',
          district: dropShgUser.address?.district || o.buyer?.district || '',
          state: dropShgUser.address?.state || o.buyer?.state || 'Maharashtra',
          pincode: dropShgUser.address?.pincode || o.buyer?.pincode || '',
          addressLine1: dropShgUser.address?.deliveryAddress || dropShgUser.address?.landmark || dropShgUser.address?.houseNo || dropShgUser.address?.village || '',
          fullAddress: [
            dropShgUser.address?.deliveryAddress || dropShgUser.address?.landmark || dropShgUser.address?.houseNo,
            dropShgUser.address?.village,
            dropShgUser.address?.taluka,
            dropShgUser.address?.district,
            dropShgUser.address?.state ? `${dropShgUser.address.state} - ${dropShgUser.address.pincode}` : dropShgUser.address?.pincode
          ].filter(Boolean).join(', ') || `${dropShgUser.address?.village || ''} Drop SHG Center`,
          address: dropShgUser.address ? {
            addressLine1: dropShgUser.address.deliveryAddress || dropShgUser.address.landmark || dropShgUser.address.houseNo || dropShgUser.address.village,
            village: dropShgUser.address.village,
            taluka: dropShgUser.address.taluka,
            district: dropShgUser.address.district,
            state: dropShgUser.address.state,
            pincode: dropShgUser.address.pincode,
          } : null,
        } : null;

        const pickupShgData = pickupShgUser ? {
          id: pickupShgUser.id,
          authId: pickupShgUser.authId,
          crpName: pickupShgUser.shgDetail?.crpName || pickupShgUser.fullName || 'Pickup SHG Lead',
          personName: pickupShgUser.shgDetail?.crpName || pickupShgUser.fullName || 'Pickup SHG Lead',
          fullName: pickupShgUser.shgDetail?.crpName || pickupShgUser.fullName || 'Pickup SHG Lead',
          name: pickupShgUser.shgDetail?.crpName || pickupShgUser.fullName || 'Pickup SHG Lead',
          phoneNumber: pickupShgUser.shgDetail?.crpMobile || pickupShgUser.phoneNumber || '',
          mobileNumber: pickupShgUser.shgDetail?.crpMobile || pickupShgUser.phoneNumber || '',
          phone: pickupShgUser.shgDetail?.crpMobile || pickupShgUser.phoneNumber || '',
          shgName: pickupShgUser.shgDetail?.shgName || `${pickupShgUser.address?.village || ''} Pickup SHG`,
          village: pickupShgUser.address?.village || o.seller?.village || '',
          taluka: pickupShgUser.address?.taluka || o.seller?.taluka || '',
          district: pickupShgUser.address?.district || o.seller?.district || '',
          state: pickupShgUser.address?.state || o.seller?.state || 'Maharashtra',
          pincode: pickupShgUser.address?.pincode || o.seller?.pincode || '',
          addressLine1: pickupShgUser.address?.deliveryAddress || pickupShgUser.address?.landmark || pickupShgUser.address?.houseNo || pickupShgUser.address?.village || '',
          fullAddress: [
            pickupShgUser.address?.deliveryAddress || pickupShgUser.address?.landmark || pickupShgUser.address?.houseNo,
            pickupShgUser.address?.village,
            pickupShgUser.address?.taluka,
            pickupShgUser.address?.district,
            pickupShgUser.address?.state ? `${pickupShgUser.address.state} - ${pickupShgUser.address.pincode}` : pickupShgUser.address?.pincode
          ].filter(Boolean).join(', ') || `${pickupShgUser.address?.village || ''} Pickup SHG Center`,
          address: pickupShgUser.address ? {
            addressLine1: pickupShgUser.address.deliveryAddress || pickupShgUser.address.landmark || pickupShgUser.address.houseNo || pickupShgUser.address.village,
            village: pickupShgUser.address.village,
            taluka: pickupShgUser.address.taluka,
            district: pickupShgUser.address.district,
            state: pickupShgUser.address.state,
            pincode: pickupShgUser.address.pincode,
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
          flowType: o.flowType,
          status: o.mainStatus,
          dropTransporterId: o.dropTransporterId,
          dropTransporterStatus: o.dropTransporterStatus || 'PENDING',
          mainStatus: o.mainStatus,
          seller: o.seller,
          buyer: o.buyer,
          dropShg: dropShgData,
          dropShgDetails: dropShgData,
          pickupShg: pickupShgData,
          pickupShgDetails: pickupShgData,
          shg: dropShgData,
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

    const isDirectFlow = order.flowType === 'DIRECT_SHG_TO_SHG' || order.flowType === 'shg_to_shg' || String(order.flowType || '').toUpperCase() === 'DIRECT_SHG_TO_SHG';

    if (isDirectFlow) {
      await this.prisma.order.updateMany({
        where: {
          OR: [
            { id: order.id },
            { orderId: order.id },
            ...(order.orderId ? [{ id: order.orderId }, { orderId: order.orderId }] : [])
          ]
        },
        data: {
          pickupTransporterId: transporterUuid,
          dropTransporterId: transporterUuid,
          pickupTransporterStatus: 'TRANSPORTER_ACCEPTED',
          dropTransporterStatus: 'ACCEPTED',
          mainStatus: 'PICKUP_TRANSPORTER_ACCEPTED',
        }
      });

      await this.prisma.orderAssignment.deleteMany({
        where: {
          orderId: order.id,
          assigneeType: 'TRANSPORTER',
        }
      }).catch(() => { });

      await this.prisma.orderAssignment.createMany({
        data: [
          {
            orderId: order.id,
            assigneeId: transporterUuid,
            assigneeType: 'TRANSPORTER',
            role: 'PICKUP',
            status: 'ACCEPTED'
          },
          {
            orderId: order.id,
            assigneeId: transporterUuid,
            assigneeType: 'TRANSPORTER',
            role: 'DROP',
            status: 'ACCEPTED'
          }
        ]
      }).catch(() => { });
    } else {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          pickupTransporterId: transporterUuid,
          pickupTransporterStatus: 'TRANSPORTER_ACCEPTED',
          mainStatus: 'PICKUP_TRANSPORTER_ACCEPTED',
        }
      });
    }

    // Update RedirectedOrder audit record
    await (this.prisma as any).redirectedOrder.updateMany({
      where: { orderId: order.id },
      data: {
        transporterId: transporterUuid,
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    }).catch(() => { });

    return order;
  }

  async completePickup(pickupOrderId: any, transporterId: number, code?: string) {
    const order = await this.findOrderFlexible(pickupOrderId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupShgStatus: 'DROPPED',
        pickupTransporterStatus: 'PARCEL_PICKED',
        mainStatus: 'IN_TRANSIT_TO_HUB',
      }
    });

    // Update RedirectedOrder pickedUpAt timestamp
    await (this.prisma.redirectedOrder as any).updateMany({
      where: { orderId: order.id },
      data: {
        pickedUpAt: new Date()
      }
    }).catch(() => { });

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
        phase: 'DROP',
        mainStatus: 'PARCEL_AT_DROP_SHG',
        dropTransporterStatus: 'COMPLETED',
        dropShgStatus: 'COMPLETED',
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

  async declinePrePickup(orderId: any, transporterId: number, reason?: string) {
    const order = await this.findOrderFlexible(orderId);
    const remarksStr = reason || 'Pre-pickup declined by Transporter';

    const ptStatus = (order.pickupTransporterStatus || '').toUpperCase();
    const mStatus = (order.mainStatus || '').toUpperCase();
    const isPickedUp = ['PICKED', 'PARCEL_PICKED', 'IN_TRANSIT_TO_HUB', 'DROPPED', 'DELIVERED_TO_HUB'].includes(ptStatus) || ['IN_TRANSIT_TO_HUB', 'PARCEL_PICKED', 'DELIVERED_TO_HUB'].includes(mStatus);

    if (isPickedUp) {
      throw new BadRequestException('Parcel has already been picked up. Please use Post-Pickup RTO Rejection instead.');
    }

    // Reset transporter assignment so order is freed for re-assignment/re-broadcasting
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupTransporterId: null,
        pickupTransporterStatus: 'REJECTED',
        mainStatus: order.pickupShgId ? 'PARCEL_AT_SHG' : 'PENDING',
        rejectReason: remarksStr,
        remarks: remarksStr,
      }
    });

    await this.prisma.orderAssignment.updateMany({
      where: {
        orderId: order.id,
        assigneeId: String(transporterId),
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
          action: 'DECLINE_PRE_PICKUP',
          scanResult: 'DECLINED',
          remarks: remarksStr,
        }
      }).catch(() => { });
    }

    return { success: true, message: 'Pickup assignment declined successfully. Order released for re-assignment.' };
  }

  async rejectPostPickup(orderId: any, transporterId: number, reason?: string) {
    const order = await this.findOrderFlexible(orderId);
    const remarksStr = reason || 'Rejected by Transporter (Post-Pickup RTO)';

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupTransporterStatus: 'REJECTED',
        dropTransporterStatus: 'REJECTED',
        mainStatus: 'REJECTED',
        returnType: 'TRANSPORTER_RETURN',
        rejectReason: remarksStr,
        remarks: remarksStr,
      } as any
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
          action: 'REJECT_POST_PICKUP',
          scanResult: 'REJECTED',
          remarks: remarksStr,
        }
      }).catch(() => { });
    }

    return { success: true, message: 'Rejection reported. Return to origin (RTO) task created.' };
  }

  async rejectPickup(orderId: any, transporterId: number, reason?: string) {
    const order = await this.findOrderFlexible(orderId);
    const ptStatus = (order.pickupTransporterStatus || '').toUpperCase();
    const mStatus = (order.mainStatus || '').toUpperCase();
    const isPickedUp = ['PICKED', 'PARCEL_PICKED', 'IN_TRANSIT_TO_HUB', 'DROPPED', 'DELIVERED_TO_HUB'].includes(ptStatus) || ['IN_TRANSIT_TO_HUB', 'PARCEL_PICKED', 'DELIVERED_TO_HUB'].includes(mStatus);

    if (isPickedUp) {
      return this.rejectPostPickup(orderId, transporterId, reason);
    } else {
      return this.declinePrePickup(orderId, transporterId, reason);
    }
  }

  async generateDropHandoverCode(dropOrderId: any, transporterId: number) {
    const order = await this.findOrderFlexible(dropOrderId);
    return { success: true, code: '5678', orderId: order.id };
  }

  async completeDropPickup(dropOrderId: any, transporterId: number, code?: string) {
    return this.acceptDrop(dropOrderId, transporterId);
  }

  async declinePrePickupDrop(dropOrderId: any, transporterId: number, reason?: string) {
    const order = await this.findOrderFlexible(dropOrderId);
    const remarksStr = reason || 'Pre-pickup drop assignment declined by Transporter';

    // Reset drop transporter assignment so order is freed for re-assignment by GMU Hub
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropTransporterId: null,
        dropTransporterStatus: 'REJECTED',
        mainStatus: 'STORED',
        rejectReason: remarksStr,
        remarks: remarksStr,
      }
    });

    await this.prisma.orderAssignment.updateMany({
      where: {
        orderId: order.id,
        assigneeId: String(transporterId),
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
          action: 'DECLINE_PRE_PICKUP_DROP',
          scanResult: 'DECLINED',
          remarks: remarksStr,
        }
      }).catch(() => { });
    }

    return { success: true, message: 'Drop assignment declined successfully. Order released for re-assignment at Hub.' };
  }

  async rejectDrop(dropOrderId: any, transporterId: number, reason?: string) {
    const order = await this.findOrderFlexible(dropOrderId);
    const dtStatus = (order.dropTransporterStatus || '').toUpperCase();
    const mStatus = (order.mainStatus || '').toUpperCase();
    const isPickedUp = ['PICKED', 'IN_TRANSIT_TO_DROP_SHG', 'DELIVERED_TO_DROP_SHG', 'DROPPED', 'COMPLETED'].includes(dtStatus) || ['IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_BUYER', 'PARCEL_AT_DROP_SHG', 'DELIVERED'].includes(mStatus);

    if (isPickedUp) {
      return this.rejectPostPickup(dropOrderId, transporterId, reason);
    } else {
      return this.declinePrePickupDrop(dropOrderId, transporterId, reason);
    }
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

  async getUpcomingOrders(transporterUserId: number) {
    const orders = await this.prisma.order.findMany({
      where: {
        mainStatus: {
          notIn: ['DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED']
        }
      },
      include: {
        seller: true,
        buyer: true,
        parcels: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }).catch(() => []);

    const allShgUsers = await this.prisma.user.findMany({
      where: { role: 'SHG', applicationStatus: 'APPROVED', deletedAt: null },
      select: {
        id: true,
        authId: true,
        fullName: true,
        phoneNumber: true,
        address: { select: { village: true, pincode: true, taluka: true, district: true, deliveryAddress: true } },
        shgDetail: { select: { shgName: true, crpName: true, crpMobile: true } }
      }
    }).catch(() => []);

    const normalizeStr = (s?: string | null): string => {
      if (!s) return '';
      return s.replace(/[^a-z0-9]/gi, '').trim().toLowerCase();
    };

    const matchedUpcoming: any[] = [];

    for (const order of orders) {
      const mainStatus = (order.mainStatus || '').toUpperCase();
      const pTransStatus = (order.pickupTransporterStatus || '').toUpperCase();
      const dTransStatus = (order.dropTransporterStatus || '').toUpperCase();

      const isDirect = order.flowType === 'DIRECT_SHG_TO_SHG' || order.flowType === 'shg_to_shg' || String(order.flowType || '').toUpperCase() === 'DIRECT_SHG_TO_SHG';

      const isDropPhase = !isDirect && (order.phase === 'DROP' || ['STORED', 'HUB_RECEIVED', 'PARCEL_AT_HUB', 'BARCODE_GENERATED', 'DISPATCHED', 'DROP_PENDING', 'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED'].includes(mainStatus));

      if (isDropPhase) {
        // Leg 2: Hub -> Drop SHG
        const isDropAccepted = ['DROP_TRANSPORTER_ACCEPTED', 'PARCEL_PICKED', 'IN_TRANSIT_TO_BUYER', 'DELIVERED', 'COMPLETED'].includes(dTransStatus);
        if (!isDropAccepted) {
          matchedUpcoming.push({ ...order, legType: 'hub_to_drop_shg', isPickupLeg: false, isDirect });
        }
      } else {
        // Leg 1 / Direct Leg: SHG -> Hub or Direct SHG -> SHG
        const isAccepted = isDirect
          ? (['ACCEPTED', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_PICKED', 'IN_TRANSIT', 'IN_DIRECT_TRANSIT', 'COMPLETED'].includes(pTransStatus) || ['IN_TRANSIT', 'IN_DIRECT_TRANSIT', 'COMPLETED'].includes(mainStatus))
          : (['ACCEPTED', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_PICKED', 'IN_TRANSIT_TO_HUB', 'DELIVERED_TO_HUB', 'HUB_RECEIVED', 'STORED', 'COMPLETED'].includes(pTransStatus) || ['IN_TRANSIT_TO_HUB', 'HUB_RECEIVED', 'STORED', 'DISPATCHED', 'COMPLETED'].includes(mainStatus));
        if (!isAccepted) {
          matchedUpcoming.push({ ...order, legType: isDirect ? 'shg_to_shg' : 'shg_to_hub', isPickupLeg: true, isDirect });
        }
      }
    }

    const formattedUpcoming = matchedUpcoming.map((order: any) => {
      const isPickupLeg = order.isPickupLeg;
      const legType = order.legType;
      const isDirect = order.isDirect;

      const sellerVillageNorm = normalizeStr(order.seller?.village);
      const buyerVillageNorm = normalizeStr(order.buyer?.village);

      // Find Pickup SHG user
      const pickupShgUser = allShgUsers.find(u =>
        (order.pickupShgId && (String(u.id) === String(order.pickupShgId) || u.authId === String(order.pickupShgId))) ||
        (sellerVillageNorm && normalizeStr(u.address?.village) === sellerVillageNorm)
      );

      // Find Drop SHG user
      const dropShgUser = allShgUsers.find(u =>
        (order.dropShgId && (String(u.id) === String(order.dropShgId) || u.authId === String(order.dropShgId))) ||
        (buyerVillageNorm && normalizeStr(u.address?.village) === buyerVillageNorm)
      );

      const pickupShgName = pickupShgUser?.shgDetail?.shgName || (order.seller?.village ? `${order.seller.village} SHG Center` : 'Pickup SHG Center');
      const pickupShgCrp = pickupShgUser?.shgDetail?.crpName || pickupShgUser?.fullName || order.seller?.sellerName || 'Pickup SHG CRP Lead';
      const pickupShgPhone = pickupShgUser?.shgDetail?.crpMobile || pickupShgUser?.phoneNumber || order.seller?.mobileNumber || '';

      const dropShgName = dropShgUser?.shgDetail?.shgName || (order.buyer?.village ? `${order.buyer.village} SHG Center` : 'Drop SHG Center');
      const dropShgCrp = dropShgUser?.shgDetail?.crpName || dropShgUser?.fullName || order.buyer?.buyerName || 'Drop SHG CRP Lead';
      const dropShgPhone = dropShgUser?.shgDetail?.crpMobile || dropShgUser?.phoneNumber || order.buyer?.mobileNumber || '';

      const originAddress = {
        name: isDirect
          ? pickupShgCrp
          : (isPickupLeg ? (order.seller?.sellerName || order.seller?.fullName || 'Seller SHG') : 'Central GMU Hub'),
        shgName: isDirect ? pickupShgName : undefined,
        phone: isDirect
          ? pickupShgPhone
          : (isPickupLeg ? (order.seller?.phoneNumber || order.seller?.mobileNumber || '') : '9876543210'),
        address: isDirect
          ? [pickupShgUser?.address?.deliveryAddress || order.seller?.addressLine1, order.seller?.village, order.seller?.taluka, order.seller?.district].filter(Boolean).join(', ')
          : (isPickupLeg
            ? [order.seller?.addressLine1, order.seller?.village, order.seller?.taluka, order.seller?.district].filter(Boolean).join(', ')
            : 'Central GMU Warehouse, Market Road'),
        village: isDirect ? (pickupShgUser?.address?.village || order.seller?.village || 'Pickup Village') : (isPickupLeg ? (order.seller?.village || 'Gadhinglaj Market Area') : 'Gadhinglaj'),
        taluka: isDirect ? (pickupShgUser?.address?.taluka || order.seller?.taluka || 'Gadhinglaj') : (isPickupLeg ? (order.seller?.taluka || 'Gadhinglaj') : 'Gadhinglaj'),
        district: isDirect ? (pickupShgUser?.address?.district || order.seller?.district || 'Kolhapur') : (isPickupLeg ? (order.seller?.district || 'Kolhapur') : 'Kolhapur'),
        pincode: isDirect ? (pickupShgUser?.address?.pincode || order.seller?.pincode || '416502') : (isPickupLeg ? (order.seller?.pincode || '416502') : '416502'),
      };

      const destinationAddress = {
        name: isDirect
          ? dropShgCrp
          : (isPickupLeg ? 'Central GMU Hub' : (order.buyer?.buyerName || order.buyer?.fullName || 'Buyer / Drop SHG')),
        shgName: isDirect ? dropShgName : undefined,
        phone: isDirect
          ? dropShgPhone
          : (isPickupLeg ? '9876543210' : (order.buyer?.phoneNumber || order.buyer?.mobileNumber || '')),
        address: isDirect
          ? [dropShgUser?.address?.deliveryAddress || order.buyer?.addressLine1, order.buyer?.village, order.buyer?.taluka, order.buyer?.district].filter(Boolean).join(', ')
          : (isPickupLeg
            ? 'Central GMU Warehouse, Market Road'
            : [order.buyer?.addressLine1, order.buyer?.village, order.buyer?.taluka, order.buyer?.district].filter(Boolean).join(', ')),
        village: isDirect ? (dropShgUser?.address?.village || order.buyer?.village || 'Buyer Village') : (isPickupLeg ? 'Gadhinglaj' : (order.buyer?.village || 'Market Area')),
        taluka: isDirect ? (dropShgUser?.address?.taluka || order.buyer?.taluka || 'Gadhinglaj') : (isPickupLeg ? 'Gadhinglaj' : (order.buyer?.taluka || 'Gadhinglaj')),
        district: isDirect ? (dropShgUser?.address?.district || order.buyer?.district || 'Kolhapur') : (isPickupLeg ? 'Kolhapur' : (order.buyer?.district || 'Kolhapur')),
        pincode: isDirect ? (dropShgUser?.address?.pincode || order.buyer?.pincode || '416502') : (isPickupLeg ? '416502' : (order.buyer?.pincode || '416502')),
      };

      const displayOrderNumber = order.orderId ? (order.orderId.startsWith('#') ? order.orderId : `#${order.orderId}`) : `#ORD-${order.id.slice(0, 6)}`;

      return {
        id: order.id,
        orderId: order.orderId || order.id,
        displayId: displayOrderNumber,
        legType,
        flowType: isDirect ? 'shg_to_shg' : 'shg_to_gmu',
        legTitle: isDirect ? 'Direct Delivery' : (isPickupLeg ? 'SHG ➔ GMU Hub' : 'GMU Hub ➔ Drop SHG'),
        status: 'UPCOMING',
        statusText: isDirect ? 'Direct Delivery Request' : (isPickupLeg ? 'Expected Pickup Request' : 'Expected Delivery Request'),
        totalQty: order.totalQty || (order.parcels ? order.parcels.length : 1),
        totalWeight: order.totalWeight ? `${order.totalWeight} kg` : '2.5 kg',
        originAddress,
        destinationAddress,
        createdAt: order.createdAt,
        expectedDate: order.createdAt 
          ? new Date(new Date(order.createdAt).getTime() + 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Today',
      };
    });

    return {
      success: true,
      data: formattedUpcoming,
      count: formattedUpcoming.length,
    };
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
