import axiosInstance from '../api/axiosInstance';

export interface InventorySummary {
  success: boolean;
  inStockCount: number;
  inStockWeight: number;
  outStockCount: number;
  outStockWeight: number;
  breakdown: {
    inStock: {
      waitingForTransporter: number;
      readyForBuyer: number;
      returns: number;
    };
    outStock: {
      handedToTransporter: number;
      deliveredToBuyer: number;
    };
  };
}

export interface InventoryOrder {
  id: string;
  uuid: string;
  orderId: string;
  orderNumber: string;
  barcode: string;
  mainStatus: string;
  stockCategory: 'IN_STOCK' | 'OUT_STOCK';
  stockType: string;
  stockStatusLabel: string;
  stockBadgeColor: string;
  legType: 'pickup' | 'drop';
  totalWeight: number;
  totalQty: number;
  productCount: number;
  storedSince?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  seller?: {
    fullName: string;
    phoneNumber: string;
    village: string;
    taluka?: string;
    pincode?: string;
    addressLine1?: string;
    fullAddress: string;
  } | null;
  buyer?: {
    fullName: string;
    phoneNumber: string;
    village: string;
    taluka?: string;
    pincode?: string;
    addressLine1?: string;
    fullAddress: string;
  } | null;
  transporter?: {
    fullName: string;
    phoneNumber: string;
    vehicleNumber: string;
  } | null;
  parcels?: Array<{
    id: number;
    parcelId: string;
    productName: string;
    weight: number;
    parcelStatus: string;
  }>;
}

export const inventoryService = {
  getSummary: async (): Promise<InventorySummary> => {
    try {
      const response = await axiosInstance.get('/shg/inventory');
      return response.data;
    } catch {
      const response = await axiosInstance.get('/orders/inventory');
      return response.data;
    }
  },

  getInStockOrders: async (): Promise<InventoryOrder[]> => {
    try {
      const response = await axiosInstance.get('/shg/inventory/in-stock');
      return response.data;
    } catch {
      const response = await axiosInstance.get('/orders/inventory/in-stock');
      return response.data;
    }
  },

  getOutStockOrders: async (): Promise<InventoryOrder[]> => {
    try {
      const response = await axiosInstance.get('/shg/inventory/out-stock');
      return response.data;
    } catch {
      const response = await axiosInstance.get('/orders/inventory/out-stock');
      return response.data;
    }
  },
};
