import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

async function mapOrderToLegacy(prisma: any, order: any) {
  if (!order) return order;
  const { seller, buyer, ...rest } = order;

  // 1. Fetch items/products dynamically from public.master_order_items
  let items: any[] = [];
  try {
    const rawItems: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        p.name as "productName",
        p.category as "productCategory",
        p.weight as "productWeight",
        moi.quantity,
        moi.price
      FROM public.master_orders mo
      JOIN public.master_order_items moi ON mo.id = moi.master_order_id
      JOIN public.products p ON moi.product_id = p.id
      WHERE mo.order_number = $1
    `, order.orderId);

    if (rawItems && rawItems.length > 0) {
      items = rawItems.map((item: any) => ({
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

  // 2. Fetch tracking events from public.pickup_tracking / public.drop_tracking
  let tracking: any[] = [];
  try {
    if (order.phase === 'DROP') {
      const rawDropTracking: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          dt.status,
          dt.remarks,
          dt.updated_at as "updatedAt"
        FROM public.drop_orders _do
        JOIN public.drop_tracking dt ON _do.id = dt.drop_order_id
        WHERE _do.drop_order_number = $1
        ORDER BY dt.updated_at ASC
      `, `DRP-${order.orderId}`);

      if (rawDropTracking && rawDropTracking.length > 0) {
        tracking = rawDropTracking.map((t: any) => ({
          status: t.status,
          remarks: t.remarks,
          updatedAt: t.updatedAt
        }));
      }
    } else {
      const rawTracking: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          pt.status,
          pt.remarks,
          pt.updated_at as "updatedAt"
        FROM public.pickup_orders po
        JOIN public.pickup_tracking pt ON po.id = pt.pickup_order_id
        WHERE po.pickup_order_number = $1
        ORDER BY pt.updated_at ASC
      `, `PKP-${order.orderId}`);

      if (rawTracking && rawTracking.length > 0) {
        tracking = rawTracking.map((t: any) => ({
          status: t.status,
          remarks: t.remarks,
          updatedAt: t.updatedAt
        }));
      }
    }

    if (tracking.length === 0) {
      tracking = [
        {
          status: order.phase === 'DROP' ? 'DROP_CREATED' : 'ORDER_PLACED',
          remarks: order.phase === 'DROP' ? 'Drop Order Created' : 'Order Created',
          updatedAt: order.createdAt
        }
      ];
    }
  } catch (e) {
    console.error('Error fetching tracking in middleware:', e);
  }

  // 3. Fetch SHG Details dynamically
  let shgDetails = null;
  try {
    let activeShgId = null;
    let activeShgRole = 'N/A';
    const isDrop = order.phase === 'DROP';
    if (isDrop) {
      activeShgId = order.dropShgId;
      activeShgRole = 'DROP';
    } else {
      activeShgId = order.pickupShgId;
      activeShgRole = 'PICKUP';
    }

    if (activeShgId) {
      const shg = await prisma.communityMember.findUnique({
        where: { id: activeShgId }
      });
      if (shg) {
        shgDetails = {
          id: shg.id,
          name: shg.fullName,
          mobile: shg.mobileNumber,
          village: shg.village || '',
          pincode: shg.pincode || '',
          address: shg.deliveryAddress || `${shg.houseNo || ''} ${shg.village || ''} ${shg.taluka || ''} ${shg.district || ''}`.trim(),
          shgName: shg.shgName || '',
          role: activeShgRole,
          status: shg.status,
        };
      }
    }

    if (!shgDetails && order.orderId) {
      const masterOrder = await prisma.masterOrder.findUnique({
        where: { orderNumber: order.orderId },
        include: {
          pickupOrders: {
            include: {
              shg: {
                include: {
                  shgDetail: true,
                  address: true
                }
              }
            }
          },
          dropOrders: {
            include: {
              shg: {
                include: {
                  shgDetail: true,
                  address: true
                }
              }
            }
          }
        }
      });

      if (masterOrder) {
        const associatedOrders = isDrop ? masterOrder.dropOrders : masterOrder.pickupOrders;
        const activeAssOrder = associatedOrders.find((ao: any) => ao.shgId !== null);
        if (activeAssOrder && activeAssOrder.shg) {
          const shgUser = activeAssOrder.shg;
          const shgDetail = shgUser.shgDetail;
          const address = shgUser.address;

          shgDetails = {
            id: '00000000-0000-0000-0000-' + String(shgUser.id).padStart(12, '0'),
            name: shgUser.fullName || 'SHG Member',
            mobile: shgUser.phoneNumber,
            village: address?.village || '',
            pincode: address?.pincode || '',
            address: address?.deliveryAddress || `${address?.houseNo || ''} ${address?.village || ''} ${address?.taluka || ''} ${address?.district || ''}`.trim() || 'Local SHG Address',
            shgName: shgDetail?.shgName || 'Local SHG',
            role: activeShgRole,
            status: shgUser.applicationStatus || 'APPROVED',
          };
        }
      }
    }
  } catch (e) {
    console.error('Error fetching SHG details in middleware:', e);
  }

  // 4. Fetch Transporter Details dynamically
  let transporterDetails = null;
  try {
    let activeTransporterId = null;
    const isDrop = order.phase === 'DROP';
    if (isDrop) {
      activeTransporterId = order.dropTransporterId;
    } else {
      activeTransporterId = order.pickupTransporterId;
    }

    if (activeTransporterId) {
      const transporter = await prisma.transporterMember.findUnique({
        where: { id: activeTransporterId }
      });
      if (transporter) {
        transporterDetails = {
          id: transporter.id,
          name: `${transporter.firstName} ${transporter.lastName}`.trim(),
          mobile: transporter.mobileNumber,
          address: transporter.residentialAddress || `${transporter.village || ''} ${transporter.taluka || ''} ${transporter.district || ''}`.trim(),
          vehicleNumber: transporter.vehicleNumber || '',
          vehicleType: transporter.vehicleType || '',
        };
      }
    }

    if (!transporterDetails && order.orderId) {
      const masterOrder = await prisma.masterOrder.findUnique({
        where: { orderNumber: order.orderId },
        include: {
          pickupOrders: {
            include: {
              transporter: {
                include: {
                  transporterDetail: true,
                  address: true
                }
              }
            }
          },
          dropOrders: {
            include: {
              transporter: {
                include: {
                  transporterDetail: true,
                  address: true
                }
              }
            }
          }
        }
      });

      if (masterOrder) {
        const associatedOrders = isDrop ? masterOrder.dropOrders : masterOrder.pickupOrders;
        const activeAssOrder = associatedOrders.find((ao: any) => ao.transporterId !== null);
        if (activeAssOrder && activeAssOrder.transporter) {
          const transUser = activeAssOrder.transporter;
          const transDetail = transUser.transporterDetail;
          const address = transUser.address;

          transporterDetails = {
            id: transUser.id,
            name: transUser.fullName || 'Transporter',
            mobile: transUser.phoneNumber,
            address: address?.deliveryAddress || `${address?.village || ''} ${address?.taluka || ''} ${address?.district || ''}`.trim() || 'Transporter Address',
            vehicleNumber: transDetail?.transporterCode || '',
            vehicleType: transDetail?.vehicleCategory || '',
          };
        }
      }
    }
  } catch (e) {
    console.error('Error fetching Transporter details in middleware:', e);
  }

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
    transporterDetails
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
                return Promise.all(result.map(o => mapOrderToLegacy(self._extendedClient, o)));
              } else {
                return mapOrderToLegacy(self._extendedClient, result);
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
