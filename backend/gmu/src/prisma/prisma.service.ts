import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function mapOrderToLegacy(order: any) {
  if (!order) return order;
  const { seller, buyer, ...rest } = order;
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
    buyer
  };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    
    // Register middleware to handle Order relationships and map them back to flat fields
    (this as any).$use(async (params: any, next: any) => {
      if (params.model === 'Order') {
        if (['findUnique', 'findFirst', 'findMany', 'create', 'update'].includes(params.action)) {
          params.args = params.args || {};
          params.args.include = params.args.include || {};
          params.args.include.seller = true;
          params.args.include.buyer = true;
        }
      }
      const result = await next(params);
      if (params.model === 'Order' && result) {
        if (Array.isArray(result)) {
          return result.map(o => mapOrderToLegacy(o));
        } else {
          return mapOrderToLegacy(result);
        }
      }
      return result;
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
