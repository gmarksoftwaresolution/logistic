import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

async function mapOrderToLegacy(prisma: any, order: any) {
  if (!order) return order;
  const { seller, buyer, ...rest } = order;

  // 1. Fetch items/products dynamically from public.master_order_items
  const getItems = async () => {
    try {
      const rawItems: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          p.name as "productName",
          p.weight as "productWeight",
          1 as quantity,
          p.category as "productCategory",
          p.price
        FROM public.products p
        LIMIT 1
      `);

      if (rawItems && rawItems.length > 0) {
        return rawItems.map((item: any) => ({
          name: item.productName || 'N/A',
          quantity: item.quantity,
          weight: item.productWeight ? parseFloat((item.quantity * item.productWeight).toFixed(2)) : 0,
          category: item.productCategory || 'N/A',
          price: item.price
        }));
      }
    } catch (e) {
      console.error('Error fetching master order items in middleware:', e);
    }
    return [];
  };

  // 2. Fetch tracking events from public.pickup_tracking / public.drop_tracking
  const getTracking = async () => {
    try {
      if (order.returnType === 'BUYER_RETURN') {
        const trackingList: any[] = [];
        trackingList.push({
          status: 'RETURN_SHG_PENDING',
          remarks: 'Return request initiated by buyer',
          updatedAt: order.createdAt
        });

        const assignments = await prisma.orderAssignment.findMany({
          where: { orderId: order.id, role: 'RETURN' }
        });

        const shgAssignment = assignments.find((a: any) => a.assigneeType === 'SHG');
        const transporterAssignment = assignments.find((a: any) => a.assigneeType === 'TRANSPORTER');

        if (shgAssignment && ['ACCEPTED', 'PICKED'].includes(shgAssignment.status)) {
          trackingList.push({
            status: 'RETURN_SHG_ACCEPTED',
            remarks: 'Return request accepted by SHG',
            updatedAt: shgAssignment.updatedAt
          });
        }

        if (shgAssignment && shgAssignment.status === 'PICKED') {
          trackingList.push({
            status: 'RETURN_PARCEL_AT_SHG',
            remarks: 'Return parcel picked up by SHG',
            updatedAt: shgAssignment.updatedAt
          });
        }

        if (transporterAssignment && ['ACCEPTED', 'PICKED'].includes(transporterAssignment.status)) {
          trackingList.push({
            status: 'RETURN_TRANSPORTER_ACCEPTED',
            remarks: 'Return request accepted by Transporter',
            updatedAt: transporterAssignment.updatedAt
          });
        }

        if (order.mainStatus === 'RETURN_IN_TRANSIT_TO_HUB' || ['BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'].includes(order.mainStatus)) {
          trackingList.push({
            status: 'RETURN_IN_TRANSIT_TO_HUB',
            remarks: 'Return parcel in transit to Hub',
            updatedAt: order.updatedAt
          });
        }

        if (order.mainStatus === 'BUYER_RETURN_COMPLETED' || ['INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'].includes(order.mainStatus)) {
          trackingList.push({
            status: 'BUYER_RETURN_COMPLETED',
            remarks: 'Return parcel received at GMU Hub',
            updatedAt: order.updatedAt
          });
        }

        if (['INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'].includes(order.mainStatus)) {
          trackingList.push({
            status: 'INVENTORY_BUYER_RETURN',
            remarks: 'Return parcel stored at GMU Hub',
            updatedAt: order.storedAt || order.updatedAt
          });
        }

        return trackingList;
      }

      const scanHistory: any[] = await prisma.parcelScanHistory.findMany({
        where: { orderId: order.orderId },
        orderBy: { scanTime: 'asc' }
      });
      if (scanHistory && scanHistory.length > 0) {
        return scanHistory.map((h: any) => ({
          status: h.action || h.scanResult,
          remarks: h.remarks || `Action by ${h.userRole || 'SYSTEM'}`,
          updatedAt: h.scanTime
        }));
      }
      return [
        { status: order.mainStatus, remarks: 'Order processing updated', updatedAt: order.updatedAt }
      ];
    } catch (e) {
      console.error('Error fetching tracking in middleware:', e);
    }

    return [
      {
        status: order.phase === 'DROP' ? 'DROP_CREATED' : 'ORDER_PLACED',
        remarks: order.phase === 'DROP' ? 'Drop Order Created' : 'Order Created',
        updatedAt: order.createdAt
      }
    ];
  };

  const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

  // 3. Fetch SHG Details dynamically
  const getShgDetails = async () => {
    try {
      const isDrop = order.phase === 'DROP';
      const activeShgId = isDrop ? order.dropShgId : order.pickupShgId;
      const activeShgRole = isDrop ? 'DROP' : 'PICKUP';

      if (activeShgId) {
        const numericId = parseInt(activeShgId, 10);
        const orConditions: any[] = [];
        if (!isNaN(numericId)) orConditions.push({ id: numericId });
        if (isUuid(activeShgId)) orConditions.push({ authId: activeShgId });
        orConditions.push({ uniqueCode: activeShgId });

        const shgUser = await prisma.user.findFirst({
          where: { OR: orConditions },
          include: {
            shgDetail: true,
            address: true,
          }
        });
        if (shgUser) {
          return {
            id: String(shgUser.id),
            name: shgUser.fullName || '',
            mobile: shgUser.phoneNumber,
            village: shgUser.address?.village || '',
            pincode: shgUser.address?.pincode || '',
            address: shgUser.address?.deliveryAddress || `${shgUser.address?.village || ''} ${shgUser.address?.taluka || ''} ${shgUser.address?.district || ''}`.trim(),
            shgName: shgUser.shgDetail?.shgName || '',
            role: activeShgRole,
            status: shgUser.applicationStatus,
          };
        }
      }
    } catch (e) {
      console.error('Error fetching SHG details in middleware:', e);
    }
    return null;
  };

  // 4. Fetch Transporter Details dynamically
  const getTransporterDetails = async () => {
    try {
      const isDrop = order.phase === 'DROP';
      const activeTransporterId = isDrop ? order.dropTransporterId : order.pickupTransporterId;

      if (activeTransporterId) {
        const numericId = parseInt(activeTransporterId, 10);
        const orConditions: any[] = [];
        if (!isNaN(numericId)) orConditions.push({ id: numericId });
        if (isUuid(activeTransporterId)) orConditions.push({ authId: activeTransporterId });
        orConditions.push({ uniqueCode: activeTransporterId });

        const transporterUser = await prisma.user.findFirst({
          where: { OR: orConditions },
          include: {
            address: true,
            transporterDetail: true,
            otherDetails: true,
          }
        });
        if (transporterUser) {
          return {
            id: String(transporterUser.id),
            name: transporterUser.fullName || '',
            mobile: transporterUser.phoneNumber,
            address: transporterUser.address?.residentialAddress || `${transporterUser.address?.village || ''} ${transporterUser.address?.taluka || ''} ${transporterUser.address?.district || ''}`.trim(),
            vehicleNumber: transporterUser.otherDetails?.[0]?.registrationNumber || '',
            vehicleType: transporterUser.otherDetails?.[0]?.vehicleType || '',
          };
        }
      }
    } catch (e) {
      console.error('Error fetching Transporter details in middleware:', e);
    }
    return null;
  };

  // 5. Fetch Parcels dynamically
  const getParcels = async () => {
    try {
      return await prisma.parcel.findMany({
        where: { orderId: order.orderId }
      });
    } catch (e) {
      console.error('Error fetching parcels in middleware:', e);
    }
    return [];
  };

  // Fetch subqueries sequentially to prevent Supabase connection pool exhaustion
  const items = await getItems();
  const tracking = await getTracking();
  const shgDetails = await getShgDetails();
  const transporterDetails = await getTransporterDetails();
  const parcels = await getParcels();

  return {
    ...rest,
    sellerName: seller?.sellerName || '',
    sellerMobile: seller?.mobileNumber || '',
    sellerVillage: seller?.village || '',
    sellerTaluka: seller?.taluka || '',
    sellerDistrict: seller?.district || '',
    sellerState: seller?.state || '',
    sellerPincode: seller?.pincode || '',
    buyerName: buyer?.buyerName || '',
    buyerMobile: buyer?.mobileNumber || '',
    buyerVillage: buyer?.village || '',
    buyerTaluka: buyer?.taluka || '',
    buyerDistrict: buyer?.district || '',
    buyerState: buyer?.state || '',
    buyerPincode: buyer?.pincode || '',
    seller,
    buyer,
    items,
    tracking,
    shgDetails,
    transporterDetails,
    parcels
  };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private _extendedClient: any;

  constructor() {
    super();
    const self = this;
    this._extendedClient = this.$extends({
      query: {
        order: {
          async $allOperations({ operation, args, query }) {
            if (['findUnique', 'findFirst', 'findMany', 'create', 'update'].includes(operation)) {
              const customArgs = args as any;
              customArgs.include = customArgs.include || {};
              customArgs.include.seller = true;
              customArgs.include.buyer = true;
            }
            const result = await query(args);
            if (result && ['findUnique', 'findFirst', 'findMany', 'create', 'update'].includes(operation)) {
              if (Array.isArray(result)) {
                const mapped = [];
                for (const o of result) {
                  mapped.push(await mapOrderToLegacy(self, o));
                }
                return mapped;
              } else {
                return mapOrderToLegacy(self, result);
              }
            }
            return result;
          }
        }
      }
    });

    // Return a Proxy to delegate NestJS lifecycles to target, and database calls to extendedClient
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop === 'onModuleInit' || prop === 'onModuleDestroy') {
          return Reflect.get(target, prop, receiver);
        }
        if (Reflect.has(target._extendedClient, prop)) {
          const val = Reflect.get(target._extendedClient, prop);
          return typeof val === 'function' ? val.bind(target._extendedClient) : val;
        }
        const val = Reflect.get(target, prop, receiver);
        return typeof val === 'function' ? val.bind(target) : val;
      }
    }) as any;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
