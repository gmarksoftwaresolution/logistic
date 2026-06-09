import { PickupOrder, DropOrder, MasterOrder, User } from '@prisma/client';

export class HistoryEntity {
  // A wrapper to unify PickupOrder and DropOrder for history responses
  id: number;
  legType: 'pickup' | 'drop';
  status: string;
  createdAt: Date;
  pickupOrderNumber?: string;
  dropOrderNumber?: string;
  masterOrder?: any;
  items?: any[];
  seller?: any;
  buyer?: any;
  deliveryAddress?: string;
  
  constructor(partial: Partial<HistoryEntity>) {
    Object.assign(this, partial);
  }
}
