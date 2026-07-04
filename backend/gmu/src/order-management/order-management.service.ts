import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderFilterDto } from './dto/order-filter.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderManagementService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Start background auto-broadcast polling loop
    setInterval(async () => {
      try {
        await this.runAutoBroadcastLoop();
      } catch (err: any) {
        console.error('[AutoBroadcastLoop] Error running loop:', err.message);
      }
    }, 5000); // Check every 5 seconds
  }

  async runAutoBroadcastLoop() {
    // 1. Check SHG auto-broadcasts
    const ordersPlaced = await this.prisma.order.findMany({
      where: {
        phase: 'PICKUP',
        mainStatus: 'ORDER_PLACED',
        OR: [
          { pickupShgStatus: null },
          { pickupShgStatus: { not: 'NO_PARTNERS_FOUND' } }
        ]
      },
      include: {
        assignments: {
          where: {
            role: 'PICKUP',
            assigneeType: 'SHG',
            status: { in: ['PENDING', 'ACCEPTED'] },
          },
        },
      },
    });

    for (const order of ordersPlaced) {
      if (order.assignments.length === 0) {
        console.log(`[AutoBroadcastLoop] Automatically triggering SHG broadcast for order ${order.orderId} (${order.id})`);
        try {
          await this.broadcastShg(order.id);
        } catch (err: any) {
          console.error(`[AutoBroadcastLoop] SHG broadcast failed for order ${order.id}:`, err.message);
        }
      }
    }

    // 2. Check Transporter auto-broadcasts
    const ordersAtShg = await this.prisma.order.findMany({
      where: {
        phase: 'PICKUP',
        mainStatus: 'PARCEL_AT_SHG',
        OR: [
          { pickupTransporterStatus: null },
          { pickupTransporterStatus: { not: 'NO_PARTNERS_FOUND' } }
        ]
      },
      include: {
        assignments: {
          where: {
            role: 'PICKUP',
            assigneeType: 'TRANSPORTER',
            status: { in: ['PENDING', 'ACCEPTED'] },
          },
        },
      },
    });

    for (const order of ordersAtShg) {
      if (order.assignments.length === 0) {
        console.log(`[AutoBroadcastLoop] Automatically triggering Transporter broadcast for order ${order.orderId} (${order.id})`);
        try {
          await this.broadcastTransporter(order.id);
        } catch (err: any) {
          console.error(`[AutoBroadcastLoop] Transporter broadcast failed for order ${order.id}:`, err.message);
        }
      }
    }

    // 3. Check Drop SHG auto-broadcasts
    const dropOrdersPlaced = await this.prisma.order.findMany({
      where: {
        phase: 'DROP',
        mainStatus: { in: ['DROP_PENDING', 'DROP_CREATED'] },
        OR: [
          { dropShgStatus: null },
          { dropShgStatus: { not: 'NO_PARTNERS_FOUND' } }
        ]
      },
      include: {
        assignments: {
          where: {
            role: 'DROP',
            assigneeType: 'SHG',
            status: { in: ['PENDING', 'ACCEPTED'] },
          },
        },
      },
    });

    for (const order of dropOrdersPlaced) {
      if (order.assignments.length === 0) {
        console.log(`[AutoBroadcastLoop] Automatically triggering Drop SHG broadcast for order ${order.orderId} (${order.id})`);
        try {
          await this.broadcastDropShg(order.id);
        } catch (err: any) {
          console.error(`[AutoBroadcastLoop] Drop SHG broadcast failed for order ${order.id}:`, err.message);
        }
      }
    }
  }

  // Parse helper for transporter JSON fields safely
  private parseJsonArray(fieldVal: any): string[] {
    if (Array.isArray(fieldVal)) return fieldVal;
    if (typeof fieldVal === 'string') {
      try {
        const parsed = JSON.parse(fieldVal);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  }

  async findMatchingShgs(address: { village?: string; pincode?: string; taluka?: string; district?: string }) {
    try {
      const approvedUsers = await this.prisma.$queryRawUnsafe(`
        SELECT u.id, u."fullName", u."phoneNumber", sd."shgName", 
               a.village, a.taluka, a.district, a.state, a.pincode, a."deliveryAddress"
        FROM public."User" u
        LEFT JOIN public."ShgDetail" sd ON u.id = sd."userId"
        LEFT JOIN public."Address" a ON u.id = a."userId"
        WHERE u.role = 'SHG' AND u."applicationStatus" = 'APPROVED';
      `) as any[];

      for (const u of approvedUsers) {
        const shgUuid = '00000000-0000-0000-0000-' + String(u.id).padStart(12, '0');
        await this.prisma.$executeRawUnsafe(`
          INSERT INTO gmu."CommunityMember" (
            id, "memberCode", type, status, "fullName", "mobileNumber", "shgName", 
            village, taluka, district, state, pincode, "deliveryAddress", "createdAt"
          ) VALUES ($1, $2, 'SHG', 'APPROVED', $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (id) DO UPDATE SET 
            "mobileNumber" = EXCLUDED."mobileNumber",
            "fullName" = EXCLUDED."fullName",
            "shgName" = EXCLUDED."shgName",
            village = EXCLUDED.village,
            taluka = EXCLUDED.taluka,
            district = EXCLUDED.district,
            state = EXCLUDED.state,
            pincode = EXCLUDED.pincode,
            "deliveryAddress" = EXCLUDED."deliveryAddress",
            status = 'APPROVED';
        `,
          shgUuid,
          `CM-SHG-${u.id}`,
          u.fullName || 'SHG Member',
          u.phoneNumber,
          u.shgName || 'Local SHG',
          u.village || '',
          u.taluka || '',
          u.district || '',
          u.state || '',
          u.pincode || '',
          u.deliveryAddress || ''
        );
      }
    } catch (err) {
      console.error('Error synchronizing approved SHGs in findMatchingShgs:', err.message);
    }

    const shgs = await this.prisma.communityMember.findMany({
      where: {
        type: 'SHG',
        status: 'APPROVED',
      }
    });

    const normalizeVillage = (v?: string | null): string => {
      if (!v) return '';
      return v.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
    };

    const targetVillage = normalizeVillage(address.village);
    const targetPincode = address.pincode ? address.pincode.toLowerCase().trim() : '';

    return shgs.filter(shg => {
      const shgVillage = normalizeVillage(shg.village);
      const shgPincode = shg.pincode ? shg.pincode.toLowerCase().trim() : '';

      // BOTH village and pincode must match
      const villageMatches = !targetVillage || shgVillage === targetVillage;
      const pincodeMatches = !targetPincode || shgPincode === targetPincode;

      return villageMatches && pincodeMatches;
    });
  }

  async findMatchingTransporters(address: { village?: string; pincode?: string; taluka?: string; district?: string }) {
    const transporters = await this.prisma.$queryRawUnsafe(`
      SELECT tm.id, tm."assignedVillages", tm."assignedPincodes", u.id AS "userId", rd."operatingArea"
      FROM gmu."TransporterMember" tm
      JOIN public."User" u ON tm."mobileNumber" = u."phoneNumber"
      LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
      WHERE tm.status = 'APPROVED' AND u."applicationStatus" = 'APPROVED';
    `) as any[];

    const parseJsonArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { }
      }
      return [];
    };

    const getTransporterLocations = (tr: any) => {
      const areas = tr.operatingArea
        ? tr.operatingArea.split(',').map((s: string) => s.trim().toLowerCase())
        : [];
      const villages = parseJsonArray(tr.assignedVillages).map((s: any) => String(s).toLowerCase());
      const pincodes = parseJsonArray(tr.assignedPincodes).map((s: any) => String(s).toLowerCase());
      return { areas, villages, pincodes };
    };

    const p = address.pincode ? address.pincode.toLowerCase().trim() : '';
    const v = address.village ? address.village.toLowerCase().trim() : '';
    const t = address.taluka ? address.taluka.toLowerCase().trim() : '';
    const d = address.district ? address.district.toLowerCase().trim() : '';

    // Priority 1: Pincode
    if (p) {
      const matches = transporters.filter(tr => {
        const { areas, pincodes } = getTransporterLocations(tr);
        return pincodes.includes(p) || areas.includes(p);
      });
      if (matches.length > 0) return matches;
    }

    // Priority 2: Village
    if (v) {
      const matches = transporters.filter(tr => {
        const { areas, villages } = getTransporterLocations(tr);
        return villages.includes(v) || areas.includes(v);
      });
      if (matches.length > 0) return matches;
    }

    // Priority 3: Taluka
    if (t) {
      const matches = transporters.filter(tr => {
        const { areas } = getTransporterLocations(tr);
        return areas.includes(t);
      });
      if (matches.length > 0) return matches;
    }

    // Priority 4: District
    if (d) {
      const matches = transporters.filter(tr => {
        const { areas } = getTransporterLocations(tr);
        return areas.includes(d);
      });
      if (matches.length > 0) return matches;
    }

    return [];
  }

  // --- QUERY FILTER HELPERS ---

  private mapQueryStatus(status: string): string[] {
    const s = status.toUpperCase().trim().replace(/[\s-]/g, '_');

    // ── Phase 1: Order Creation ──────────────────────────────────────────────
    if (s === 'ORDER_PLACED' || s === 'PENDING' || s === 'PENDING_PICKUP') {
      return ['ORDER_PLACED', 'PENDING_PICKUP', 'PENDING_DROP', 'DISPATCHED', 'PENDING'];
    }

    // ── Phase 2: Pickup Assignment ────────────────────────────────────────────
    if (s === 'PICKUP_ASSIGNED' || s === 'PENDING_ACCEPTANCE') {
      return ['PICKUP_ASSIGNED', 'PICKUP_SHG_PENDING', 'DROP_SHG_PENDING', 'PENDING_DROP', 'DISPATCHED', 'PENDING_ACCEPTANCE'];
    }
    if (s === 'PICKUP_SHG_ACCEPTED') {
      return ['PICKUP_SHG_ACCEPTED', 'DROP_SHG_ACCEPTED', 'RETURN_SHG_ASSIGNED'];
    }
    if (s === 'SHG_PICKUP_DECLINED') {
      return ['SHG_PICKUP_DECLINED'];
    }

    // ── Phase 3: Parcel Collection ────────────────────────────────────────────
    if (s === 'PARCEL_AT_SHG') {
      return ['PARCEL_AT_SHG', 'RETURN_PARCEL_AT_SHG'];
    }

    // ── Phase 4: Transporter Pickup from SHG ──────────────────────────────────
    if (s === 'TRANSPORTER_ACCEPTED') {
      return ['TRANSPORTER_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'RETURN_TRANSPORTER_ACCEPTED'];
    }
    if (s === 'TRANSPORTER_DECLINED') {
      return ['TRANSPORTER_DECLINED'];
    }
    if (s === 'IN_TRANSIT_TO_HUB') {
      return ['IN_TRANSIT_TO_HUB', 'RETURN_IN_TRANSIT_TO_GMU'];
    }

    // ── Phase 5: Hub Receive & Dispatch ───────────────────────────────────────
    if (s === 'AT_HUB') {
      return ['AT_HUB', 'HUB_RECEIVED', 'PARCEL_AT_HUB'];
    }
    if (s === 'HUB_RECEIVED' || s === 'PICKUPHUB_RECEIVE') {
      return ['HUB_RECEIVED', 'AT_HUB', 'BARCODE_GENERATED', 'PARCEL_AT_HUB'];
    }
    if (s === 'BARCODE_GENERATED') {
      return ['BARCODE_GENERATED', 'HUB_RECEIVED'];
    }
    if (s === 'STORED') {
      return ['STORED', 'AT_HUB', 'PARCEL_AT_HUB'];
    }
    if (s === 'DROP_ASSIGNED' || s === 'DISPATCH' || s === 'DISPATCHED') {
      return ['DROP_ASSIGNED', 'DISPATCHED', 'DISPATCH', 'PENDING_DROP', 'DROP_SHG_PENDING', 'DROP_PENDING'];
    }
    if (s === 'DROP_PENDING' || s === 'PENDING_DROP' || s === 'DROP_SHG_PENDING') {
      return ['DROP_PENDING', 'PENDING_DROP', 'DROP_SHG_PENDING'];
    }

    // ── Phase 6: Drop Leg ─────────────────────────────────────────────────────
    if (s === 'DROP_TRANSPORTER_ACCEPTED') {
      return ['DROP_TRANSPORTER_ACCEPTED'];
    }
    if (s === 'IN_TRANSIT_TO_DROP_SHG') {
      return ['IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_SHG'];
    }
    if (s === 'PARCEL_AT_DROP_SHG') {
      return ['PARCEL_AT_DROP_SHG'];
    }

    // ── Phase 7: Last Mile Delivery ───────────────────────────────────────────
    if (s === 'DROP_SHG_ACCEPTED') {
      return ['DROP_SHG_ACCEPTED'];
    }
    if (s === 'DELIVERED') {
      return ['DELIVERED'];
    }

    // ── Phase 8: Completion ───────────────────────────────────────────────────
    if (s === 'COMPLETED') {
      return ['COMPLETED', 'RETURN_COMPLETED', 'BUYER_RETURN_COMPLETED', 'TRANSPORTER_RETURN_COMPLETED'];
    }

    // ── Exception Statuses ────────────────────────────────────────────────────
    if (s === 'ON_HOLD') {
      return ['ON_HOLD', 'TRANSPORTER_RETURN', 'TRANSPORTER_RETURN_PENDING'];
    }
    if (s === 'TRANSPORTER_RETURN_PENDING') {
      return ['TRANSPORTER_RETURN_PENDING'];
    }
    if (s === 'TRANSPORTER_RETURN_COMPLETED') {
      return ['TRANSPORTER_RETURN_COMPLETED'];
    }
    if (s === 'INVENTORY_TRANSPORTER_RETURN') {
      return ['INVENTORY_TRANSPORTER_RETURN'];
    }
    if (s === 'RETURN_SHG_PENDING') {
      return ['RETURN_SHG_PENDING'];
    }
    if (s === 'RETURN_SHG_ACCEPTED') {
      return ['RETURN_SHG_ACCEPTED'];
    }
    if (s === 'RETURN_IN_TRANSIT_TO_HUB') {
      return ['RETURN_IN_TRANSIT_TO_HUB'];
    }
    if (s === 'BUYER_RETURN_COMPLETED') {
      return ['BUYER_RETURN_COMPLETED'];
    }
    if (s === 'INVENTORY_BUYER_RETURN') {
      return ['INVENTORY_BUYER_RETURN'];
    }
    if (s === 'REASSIGNED') {
      return ['REASSIGNED', 'RESCHEDULED'];
    }
    if (s === 'CANCELLED') {
      return ['CANCELLED'];
    }
    if (s === 'SLA_BREACHED') {
      return ['SLA_BREACHED'];
    }

    // Legacy catch-all
    if (s === 'ACCEPTED') {
      return [
        'PICKUP_SHG_ACCEPTED', 'PICKUP_ASSIGNED', 'DROP_SHG_ACCEPTED',
        'DROP_ASSIGNED', 'RETURN_SHG_ASSIGNED', 'TRANSPORTER_RETURN',
        'RETURN_SHG_ACCEPTED', 'RETURN_TRANSPORTER_ACCEPTED'
      ];
    }
    if (s === 'PICKED') {
      return ['PARCEL_AT_SHG', 'PARCEL_AT_DROP_SHG', 'RETURN_PARCEL_AT_SHG', 'RETURN_COMPLETED', 'STORED', 'INVENTORY_TRANSPORTER_RETURN', 'INVENTORY_BUYER_RETURN'];
    }

    return [s, status];
  }

  private applyFilters(whereClause: any, filter?: OrderFilterDto, allowedStatuses?: string[]) {
    const where = { ...whereClause };

    if (filter?.status) {
      const mapped = this.mapQueryStatus(filter.status);
      if (
        where.mainStatus === 'RESCHEDULED' ||
        (where.mainStatus && where.mainStatus.in && where.mainStatus.in.includes('RESCHEDULED'))
      ) {
        where.OR = [
          { pickupShgStatus: { in: mapped } },
          { pickupTransporterStatus: { in: mapped } },
          { dropShgStatus: { in: mapped } },
          { dropTransporterStatus: { in: mapped } },
          { mainStatus: { in: mapped } },
        ];
      } else {
        if (allowedStatuses) {
          const intersection = allowedStatuses.filter((s) => mapped.includes(s));
          where.mainStatus = { in: intersection };
        } else {
          where.mainStatus = { in: mapped };
        }
      }
    } else if (allowedStatuses) {
      if (!where.mainStatus) {
        where.mainStatus = { in: allowedStatuses };
      }
    }

    if (filter?.date) {
      const startDate = new Date(`${filter.date}T00:00:00.000+05:30`);
      const endDate = new Date(`${filter.date}T23:59:59.999+05:30`);
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    return where;
  }

  async getCounts() {
    const [
      pickupNew,
      pickupAssigned,
      pickupWarehouse,
      pickupRejected,
      pickupRescheduled,
      dropNew,
      dropAssigned,
      dropCompleted,
      dropRejected,
      dropRescheduled,
      transporterReturn,
      buyerReturn,
      inventoryStored,
      inventoryTransporterReturn,
      inventoryBuyerReturn
    ] = await Promise.all([
      // pickup.new — Phase 1
      this.prisma.order.count({
        where: this.applyFilters(
          {
            phase: 'PICKUP',
            returnType: null,
            OR: [
              { mainStatus: { in: ['ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING'] } },
              { mainStatus: 'PICKUP_ASSIGNED', OR: [{ pickupShgStatus: 'PENDING' }, { pickupShgStatus: 'pending' }, { pickupShgStatus: null }] }
            ]
          },
          undefined,
          ['ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING', 'PICKUP_ASSIGNED']
        )
      }),
      // pickup.assigned — Phase 2-4
      this.prisma.order.count({
        where: this.applyFilters(
          {
            phase: 'PICKUP',
            returnType: null,
            OR: [
              { mainStatus: { in: ['PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER', 'IN_TRANSIT_TO_HUB', 'SHG_PICKUP_DECLINED', 'TRANSPORTER_DECLINED'] } },
              { mainStatus: 'PICKUP_ASSIGNED', NOT: { OR: [{ pickupShgStatus: 'PENDING' }, { pickupShgStatus: 'pending' }, { pickupShgStatus: null }] } }
            ]
          },
          undefined,
          ['PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER', 'IN_TRANSIT_TO_HUB', 'SHG_PICKUP_DECLINED', 'TRANSPORTER_DECLINED']
        )
      }),
      // pickup.warehouse — Phase 5
      this.prisma.order.count({ where: this.applyFilters({ phase: 'PICKUP', returnType: null }, undefined, ['AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'PARCEL_AT_HUB']) }),
      // pickup.rejected — orders with any rejected assignment
      this.prisma.order.count({ where: this.applyFilters({ phase: 'PICKUP', assignments: { some: { role: 'PICKUP', status: 'REJECTED' } }, returnType: null }, undefined, ['ORDER_PLACED', 'PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER', 'IN_TRANSIT_TO_HUB', 'SHG_PICKUP_DECLINED', 'TRANSPORTER_DECLINED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING']) }),
      // pickup.rescheduled — REASSIGNED or legacy RESCHEDULED
      this.prisma.order.count({ where: this.applyFilters({ phase: 'PICKUP', mainStatus: { in: ['REASSIGNED', 'RESCHEDULED'] }, rescheduleType: { in: ['PICKUP_SHG', 'PICKUP_TRANSPORTER'] }, returnType: null }) }),

      // drop.new — Phase 5 dispatch
      this.prisma.order.count({
        where: this.applyFilters(
          {
            phase: 'DROP',
            AND: [
              {
                OR: [
                  { returnType: null },
                  { returnType: 'TRANSPORTER_RETURN' }
                ]
              },
              {
                OR: [
                  { mainStatus: { in: ['AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'STORED', 'DISPATCHED', 'DROP_SHG_PENDING', 'PENDING_DROP', 'INVENTORY_TRANSPORTER_RETURN', 'DROP_CREATED', 'DROP_TRANSPORTER_PENDING', 'PARCEL_AT_HUB'] } },
                  { mainStatus: 'DROP_ASSIGNED', OR: [{ dropShgStatus: 'PENDING' }, { dropShgStatus: 'pending' }, { dropShgStatus: null }] }
                ]
              }
            ]
          },
          undefined,
          ['DROP_ASSIGNED', 'AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'STORED', 'DISPATCHED', 'DROP_SHG_PENDING', 'PENDING_DROP', 'INVENTORY_TRANSPORTER_RETURN', 'DROP_CREATED', 'DROP_TRANSPORTER_PENDING', 'PARCEL_AT_HUB']
        )
      }),
      // drop.assigned — Phase 6-7
      this.prisma.order.count({
        where: this.applyFilters(
          {
            phase: 'DROP',
            AND: [
              {
                OR: [
                  { returnType: null },
                  { returnType: 'TRANSPORTER_RETURN' }
                ]
              },
              {
                OR: [
                  { mainStatus: { in: ['DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_DROP_SHG', 'IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_SHG'] } },
                  { mainStatus: 'DROP_ASSIGNED', NOT: { OR: [{ dropShgStatus: 'PENDING' }, { dropShgStatus: 'pending' }, { dropShgStatus: null }] } }
                ]
              }
            ]
          },
          undefined,
          ['DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_DROP_SHG', 'IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_SHG']
        )
      }),
      // drop.completed — Phase 7-8
      this.prisma.order.count({ where: this.applyFilters({ phase: 'DROP', OR: [{ returnType: null }, { returnType: 'TRANSPORTER_RETURN' }] }, undefined, ['DELIVERED', 'COMPLETED']) }),
      // drop.rejected
      this.prisma.order.count({ where: this.applyFilters({ phase: 'DROP', assignments: { some: { role: 'DROP', status: 'REJECTED' } }, OR: [{ returnType: null }, { returnType: 'TRANSPORTER_RETURN' }] }, undefined, ['DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_DROP_SHG', 'IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_SHG', 'DISPATCHED', 'DROP_SHG_PENDING', 'PENDING_DROP']) }),
      // drop.rescheduled
      this.prisma.order.count({ where: this.applyFilters({ phase: 'DROP', mainStatus: { in: ['REASSIGNED', 'RESCHEDULED'] }, rescheduleType: { in: ['DROP_SHG', 'DROP_TRANSPORTER'] }, OR: [{ returnType: null }, { returnType: 'TRANSPORTER_RETURN' }] }) }),

      // return.transporter
      this.prisma.order.count({ where: this.applyFilters({ returnType: 'TRANSPORTER_RETURN' }, undefined, ['TRANSPORTER_RETURN_PENDING', 'TRANSPORTER_RETURN_COMPLETED']) }),
      // return.buyer
      this.prisma.order.count({ where: this.applyFilters({ returnType: 'BUYER_RETURN' }, undefined, ['RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PARCEL_AT_SHG', 'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_ACCEPTED', 'RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED']) }),

      // inventory.stored
      this.prisma.order.count({ where: this.applyFilters({ phase: 'PICKUP', returnType: null }, undefined, ['STORED', 'AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'DROP_ASSIGNED', 'DISPATCHED', 'PARCEL_AT_HUB']) }),
      // inventory.transporterReturn
      this.prisma.order.count({ where: this.applyFilters({ returnType: 'TRANSPORTER_RETURN' }, undefined, ['INVENTORY_TRANSPORTER_RETURN', 'DROP_ASSIGNED', 'DISPATCHED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'DELIVERED', 'COMPLETED']) }),
      // inventory.buyerReturn
      this.prisma.order.count({ where: this.applyFilters({ returnType: 'BUYER_RETURN' }, undefined, ['INVENTORY_BUYER_RETURN']) })
    ]);

    return {
      pickup: {
        new: pickupNew,
        assigned: pickupAssigned,
        warehouse: pickupWarehouse,
        rejected: pickupRejected,
        rescheduled: pickupRescheduled
      },
      drop: {
        new: dropNew,
        assigned: dropAssigned,
        completed: dropCompleted,
        rejected: dropRejected,
        rescheduled: dropRescheduled
      },
      return: {
        transporter: transporterReturn,
        buyer: buyerReturn
      },
      inventory: {
        stored: inventoryStored,
        transporterReturn: inventoryTransporterReturn,
        buyerReturn: inventoryBuyerReturn
      }
    };
  }

  // --- QUERY ENDPOINTS ---

  async getOrderDetails(id: string, phase?: string): Promise<any> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const whereClause: any = isUuid ? { id } : { orderId: id };
    if (phase) {
      whereClause.phase = phase;
    }
    const order = await this.prisma.order.findFirst({
      where: whereClause,
      include: { assignments: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID/OrderId ${id} not found`);
    }
    return order as any;
  }

  async getPickupNewOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        phase: 'PICKUP',
        returnType: null,
        OR: [
          { mainStatus: { in: ['ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING'] } },
          { mainStatus: 'PICKUP_ASSIGNED', OR: [{ pickupShgStatus: 'PENDING' }, { pickupShgStatus: 'pending' }, { pickupShgStatus: null }] }
        ]
      },
      filter,
      ['ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING', 'PICKUP_ASSIGNED']
    );
    return this.prisma.order.findMany({
      where,
      include: { assignments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPickupAssignedOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        phase: 'PICKUP',
        returnType: null,
        OR: [
          { mainStatus: { in: ['PICKUP_SHG_ACCEPTED', 'SHG_PICKUP_DECLINED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER', 'TRANSPORTER_DECLINED', 'IN_TRANSIT_TO_HUB', 'PICKUP_SHG_PENDING'] } },
          { mainStatus: 'PICKUP_ASSIGNED', NOT: { OR: [{ pickupShgStatus: 'PENDING' }, { pickupShgStatus: 'pending' }, { pickupShgStatus: null }] } }
        ]
      },
      filter,
      [
        'PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'SHG_PICKUP_DECLINED',
        'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED',
        'PARCEL_AT_TRANSPORTER', 'TRANSPORTER_DECLINED',
        'IN_TRANSIT_TO_HUB', 'PICKUP_SHG_PENDING',
      ]
    );
    return this.prisma.order.findMany({
      where,
      include: { assignments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPickupWarehouseOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { phase: 'PICKUP', returnType: null },
      filter,
      // Phase 5: hub received (AT_HUB new canonical + legacy HUB_RECEIVED, BARCODE_GENERATED)
      ['AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'PARCEL_AT_HUB']
    );
    return this.prisma.order.findMany({
      where,
      include: { assignments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPickupRejectedOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        phase: 'PICKUP',
        assignments: {
          some: { role: 'PICKUP', status: 'REJECTED' },
        },
        returnType: null,
      },
      filter,
      [
        'ORDER_PLACED', 'PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED',
        'SHG_PICKUP_DECLINED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED',
        'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER',
        'TRANSPORTER_DECLINED', 'IN_TRANSIT_TO_HUB',
        // legacy
        'PENDING_PICKUP', 'PICKUP_SHG_PENDING',
      ]
    );
    return this.prisma.order.findMany({
      where,
      include: { assignments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPickupRescheduledOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        phase: 'PICKUP',
        mainStatus: { in: ['REASSIGNED', 'RESCHEDULED'] },
        rescheduleType: { in: ['PICKUP_SHG', 'PICKUP_TRANSPORTER'] },
        returnType: null,
      },
      filter
    );
    return this.prisma.order.findMany({
      where,
      include: { assignments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDropNewOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        phase: 'DROP',
        AND: [
          {
            OR: [
              { returnType: null },
              { returnType: 'TRANSPORTER_RETURN' }
            ]
          },
          {
            OR: [
              { mainStatus: { in: ['DROP_PENDING', 'AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'STORED', 'DISPATCHED', 'DROP_SHG_PENDING', 'PENDING_DROP', 'INVENTORY_TRANSPORTER_RETURN', 'DROP_CREATED', 'DROP_TRANSPORTER_PENDING', 'PARCEL_AT_HUB'] } },
              { mainStatus: 'DROP_ASSIGNED', OR: [{ dropShgStatus: 'PENDING' }, { dropShgStatus: 'pending' }, { dropShgStatus: null }] }
            ]
          }
        ]
      },
      filter,
      ['DROP_PENDING', 'DROP_ASSIGNED', 'AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'STORED', 'DISPATCHED', 'DROP_SHG_PENDING', 'PENDING_DROP', 'INVENTORY_TRANSPORTER_RETURN', 'DROP_CREATED', 'DROP_TRANSPORTER_PENDING', 'PARCEL_AT_HUB']
    );
    return this.prisma.order.findMany({
      where,
      include: { assignments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDropAssignedOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        phase: 'DROP',
        AND: [
          {
            OR: [
              { returnType: null },
              { returnType: 'TRANSPORTER_RETURN' }
            ]
          },
          {
            OR: [
              { mainStatus: { in: ['DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'IN_TRANSIT_TO_SHG'] } },
              { mainStatus: 'DROP_ASSIGNED', NOT: { OR: [{ dropShgStatus: 'PENDING' }, { dropShgStatus: 'pending' }, { dropShgStatus: null }] } }
            ]
          }
        ]
      },
      filter,
      [
        'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED',
        'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'IN_TRANSIT_TO_SHG',
      ]
    );
    return this.prisma.order.findMany({
      where,
      include: { assignments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDropCompletedOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { phase: 'DROP', OR: [{ returnType: null }, { returnType: 'TRANSPORTER_RETURN' }] },
      filter,
      // Phase 7-8: Delivered and Completed
      ['DELIVERED', 'COMPLETED']
    );
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDropRejectedOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        phase: 'DROP',
        assignments: {
          some: { role: 'DROP', status: 'REJECTED' },
        },
        OR: [{ returnType: null }, { returnType: 'TRANSPORTER_RETURN' }],
      },
      filter,
      [
        'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED',
        'PARCEL_AT_DROP_SHG', 'IN_TRANSIT_TO_DROP_SHG',
        // legacy
        'DISPATCHED', 'DROP_SHG_PENDING', 'PENDING_DROP', 'IN_TRANSIT_TO_SHG',
      ]
    );
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDropRescheduledOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        phase: 'DROP',
        mainStatus: { in: ['REASSIGNED', 'RESCHEDULED'] },
        rescheduleType: { in: ['DROP_SHG', 'DROP_TRANSPORTER'] },
        OR: [{ returnType: null }, { returnType: 'TRANSPORTER_RETURN' }],
      },
      filter
    );
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransporterReturnOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { returnType: 'TRANSPORTER_RETURN' },
      filter,
      ['TRANSPORTER_RETURN_PENDING', 'TRANSPORTER_RETURN_COMPLETED']
    );
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBuyerReturnOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { returnType: 'BUYER_RETURN' },
      filter,
      [
        'RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PARCEL_AT_SHG',
        'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_ACCEPTED',
        'RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED',
      ]
    );
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInventoryStoredOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { phase: 'PICKUP', returnType: null },
      filter,
      // Phase 5: all warehouse/hub/dispatch states
      ['AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'STORED', 'DROP_ASSIGNED', 'DISPATCHED', 'PARCEL_AT_HUB']
    );
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInventoryTransporterReturnOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { returnType: 'TRANSPORTER_RETURN' },
      filter,
      ['INVENTORY_TRANSPORTER_RETURN', 'DROP_ASSIGNED', 'DISPATCHED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'DELIVERED', 'COMPLETED']
    );
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInventoryBuyerReturnOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { returnType: 'BUYER_RETURN' },
      filter,
      ['INVENTORY_BUYER_RETURN']
    );
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- TRANSITIONS ---

  async createOrder(dto: CreateOrderDto) {
    const orderId = dto.orderId || `ORD-PICK-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Check uniqueness of orderId for PICKUP phase
    const existing = await this.prisma.order.findFirst({ where: { orderId, phase: 'PICKUP' } });
    if (existing) {
      throw new BadRequestException(`Order ID ${orderId} already exists`);
    }

    // Find or create Seller
    let seller = await this.prisma.seller.findFirst({
      where: { mobileNumber: dto.sellerMobile },
    });
    if (!seller) {
      seller = await this.prisma.seller.create({
        data: {
          sellerCode: `SEL-${Math.floor(100000 + Math.random() * 900000)}`,
          sellerName: dto.sellerName,
          mobileNumber: dto.sellerMobile,
          village: dto.sellerVillage,
          taluka: dto.sellerTaluka,
          district: dto.sellerDistrict,
          state: dto.sellerState,
          pincode: dto.sellerPincode,
        },
      });
    }

    // Find or create Buyer
    let buyer = await this.prisma.buyer.findFirst({
      where: { mobileNumber: dto.buyerMobile },
    });
    if (!buyer) {
      buyer = await this.prisma.buyer.create({
        data: {
          buyerCode: `BUY-${Math.floor(100000 + Math.random() * 900000)}`,
          buyerName: dto.buyerName,
          mobileNumber: dto.buyerMobile,
          village: dto.buyerVillage,
          taluka: dto.buyerTaluka,
          district: dto.buyerDistrict,
          state: dto.buyerState,
          pincode: dto.buyerPincode,
        },
      });
    }

    const order = await this.prisma.order.create({
      data: {
        orderId,
        sellerId: seller.id,
        buyerId: buyer.id,
        productCount: dto.productCount,
        totalQty: dto.totalQty,
        totalWeight: dto.totalWeight,
        mainStatus: 'ORDER_PLACED',
        phase: 'PICKUP',
      },
    });

    try {
      await this.broadcastShg(order.id);
    } catch (err: any) {
      console.warn(`[broadcastShg auto-run] Failed to broadcast order ${order.id}:`, err.message);
    }

    return order;
  }

  async broadcastShg(id: string) {
    const order = await this.getOrderDetails(id);

    // Find APPROVED & ACTIVE SHGs
    // Join public."User" u to make sure the account is active/approved
    const approvedShgs = await this.prisma.$queryRawUnsafe(`
      SELECT cm.id, cm.pincode, cm.village
      FROM gmu."CommunityMember" cm
      JOIN public."User" u ON cm."mobileNumber" = u."phoneNumber"
      WHERE cm.type = 'SHG' AND cm.status = 'APPROVED' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL;
    `) as any[];

    // Match approved SHGs with fallback layers (Priority 1: Pincode + Village, Priority 2: Pincode, Priority 3: Village)
    const normalizeStr = (s: string) => {
      if (!s) return '';
      return s.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
    };

    let matchingShgs = approvedShgs.filter(shg => 
      shg.pincode && order.sellerPincode && 
      shg.pincode.trim().toLowerCase() === order.sellerPincode.trim().toLowerCase() &&
      shg.village && order.sellerVillage && 
      normalizeStr(shg.village) === normalizeStr(order.sellerVillage)
    );

    if (matchingShgs.length === 0 && order.sellerPincode) {
      matchingShgs = approvedShgs.filter(shg => 
        shg.pincode && 
        shg.pincode.trim().toLowerCase() === order.sellerPincode.trim().toLowerCase()
      );
    }

    if (matchingShgs.length === 0 && order.sellerVillage) {
      matchingShgs = approvedShgs.filter(shg => 
        shg.village && 
        normalizeStr(shg.village) === normalizeStr(order.sellerVillage)
      );
    }

    if (matchingShgs.length === 0) {
      console.log(`[SHG Broadcast]
        Order ID: ${order.orderId} (${order.id})
        Seller Village: ${order.sellerVillage}
        Seller Pincode: ${order.sellerPincode}
        Matching SHG IDs: []
        Number of assignments created: 0
        Reason: No approved and active SHG matches Seller Pincode or Village.
      `);
      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          mainStatus: 'ORDER_PLACED',
          pickupShgStatus: 'NO_PARTNERS_FOUND',
        },
        include: { assignments: true },
      });
    }

    // Create PENDING assignments with duplicate protection
    let assignmentsCreatedCount = 0;
    for (const shg of matchingShgs) {
      const existing = await this.prisma.orderAssignment.findFirst({
        where: {
          orderId: order.id,
          assigneeId: shg.id,
          assigneeType: 'SHG',
          role: 'PICKUP',
          status: 'PENDING',
        },
      });
      if (!existing) {
        await this.prisma.orderAssignment.create({
          data: {
            orderId: order.id,
            assigneeId: shg.id,
            assigneeType: 'SHG',
            role: 'PICKUP',
            status: 'PENDING',
          },
        });
        assignmentsCreatedCount++;
      }
    }

    console.log(`[SHG Broadcast]
      Order ID: ${order.orderId} (${order.id})
      Seller Village: ${order.sellerVillage}
      Seller Pincode: ${order.sellerPincode}
      Matching SHG IDs: ${JSON.stringify(matchingShgs.map(s => s.id))}
      Number of assignments created: ${assignmentsCreatedCount}
    `);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'PICKUP_ASSIGNED',
        pickupShgStatus: 'PENDING',
      },
      include: { assignments: true },
    });
  }

  async shgAccept(id: string, shgId: string) {
    const order = await this.getOrderDetails(id);

    const assignment = await this.prisma.orderAssignment.findFirst({
      where: { orderId: order.id, assigneeId: shgId, role: 'PICKUP', assigneeType: 'SHG' },
    });

    if (!assignment) {
      throw new BadRequestException(`No pickup SHG assignment request found for SHG ID ${shgId}`);
    }

    // Set assignment status to ACCEPTED
    await this.prisma.orderAssignment.update({
      where: { id: assignment.id },
      data: { status: 'ACCEPTED' },
    });

    // Remove other pending SHG pickup requests
    await this.prisma.orderAssignment.deleteMany({
      where: {
        orderId: order.id,
        role: 'PICKUP',
        assigneeType: 'SHG',
        status: 'PENDING',
        id: { not: assignment.id },
      },
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupShgId: shgId,
        pickupShgStatus: 'ACCEPTED',
        mainStatus: 'PICKUP_SHG_ACCEPTED',
      },
    });
  }

  async shgReject(id: string, shgId: string) {
    const order = await this.getOrderDetails(id);

    const assignment = await this.prisma.orderAssignment.findFirst({
      where: { orderId: order.id, assigneeId: shgId, role: 'PICKUP', assigneeType: 'SHG' },
    });

    if (assignment) {
      await this.prisma.orderAssignment.update({
        where: { id: assignment.id },
        data: { status: 'REJECTED' },
      });
    } else {
      // Create a rejected assignment record for tracking
      await this.prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: shgId,
          assigneeType: 'SHG',
          role: 'PICKUP',
          status: 'REJECTED',
        },
      });
    }

    // Auto re-broadcast to matching approved SHGs that haven't rejected yet
    const rejections = await this.prisma.orderAssignment.findMany({
      where: { orderId: order.id, role: 'PICKUP', assigneeType: 'SHG', status: 'REJECTED' },
    });
    const rejectedIds = rejections.map((r) => r.assigneeId);

    const matchingShgs = await this.prisma.communityMember.findMany({
      where: {
        type: 'SHG',
        status: 'APPROVED',
        village: order.sellerVillage,
        pincode: order.sellerPincode,
        id: { notIn: rejectedIds },
      },
    });

    if (matchingShgs.length > 0) {
      // Delete existing pending ones
      await this.prisma.orderAssignment.deleteMany({
        where: { orderId: order.id, role: 'PICKUP', assigneeType: 'SHG', status: 'PENDING' },
      });

      // Create new pending assignments
      await this.prisma.orderAssignment.createMany({
        data: matchingShgs.map((shg) => ({
          orderId: order.id,
          assigneeId: shg.id,
          assigneeType: 'SHG',
          role: 'PICKUP',
          status: 'PENDING',
        })),
      });

      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          mainStatus: 'PICKUP_ASSIGNED',
          pickupShgStatus: 'PENDING',
        },
      });
    } else {
      // All SHGs declined — set SHG_PICKUP_DECLINED, revert to ORDER_PLACED for re-broadcast
      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          mainStatus: 'SHG_PICKUP_DECLINED',
          pickupShgStatus: null,
        },
      });
    }
  }

  async shgReschedule(id: string, shgId: string, duration: string) {
    const order = await this.getOrderDetails(id);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        // Exception: REASSIGNED is the new canonical status for rescheduled
        mainStatus: 'REASSIGNED',
        rescheduleType: 'PICKUP_SHG',
        rescheduleDuration: duration,
        rescheduledAt: new Date(),
        pickupShgStatus: 'PENDING',
      },
    });
  }

  async shgPicked(id: string) {
    const order = await this.getOrderDetails(id);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupShgStatus: 'PICKED',
        mainStatus: 'PARCEL_AT_SHG',
      },
    });
  }

  async broadcastTransporter(id: string) {
    const order = await this.getOrderDetails(id);

    // Get all approved and active transporters joining route details and user accounts
    const approvedTransporters = await this.prisma.$queryRawUnsafe(`
      SELECT tm.id, tm."assignedVillages", tm."assignedPincodes", u.id AS "userId", rd.id AS "routeDetailId", rd."operatingArea", rd."pickupLocations"
      FROM gmu."TransporterMember" tm
      JOIN public."User" u ON tm."mobileNumber" = u."phoneNumber"
      LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
      WHERE tm.status = 'APPROVED' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL;
    `) as any[];

    const parseJsonArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch(e) {}
      }
      return [];
    };

    const p = order.sellerPincode?.trim()?.toLowerCase();
    const v = order.sellerVillage?.trim()?.toLowerCase();

    // Match only Transporters whose assigned routes contain the same Village AND Pincode
    const matchingTransporters = approvedTransporters.filter((tr) => {
      const areas = tr.operatingArea
        ? tr.operatingArea.split(',').map((s: string) => s.trim().toLowerCase())
        : [];
      const villages = parseJsonArray(tr.assignedVillages).map((s: any) => String(s).trim().toLowerCase());
      const pincodes = [
        ...parseJsonArray(tr.assignedPincodes),
        ...parseJsonArray(tr.pickupLocations)
      ].map((s: any) => String(s).trim().toLowerCase());

      const villageMatched = v && (villages.includes(v) || areas.includes(v));
      const pincodeMatched = p && (pincodes.includes(p) || areas.includes(p));
      return !!(villageMatched && pincodeMatched);
    });

    if (matchingTransporters.length === 0) {
      console.log(`[Transporter Broadcast]
        Order ID: ${order.orderId} (${order.id})
        Seller Village: ${order.sellerVillage}
        Seller Pincode: ${order.sellerPincode}
        Matching Transporter IDs: []
        Number of assignments created: 0
        Reason: No approved and active transporter matches Seller Pincode and Village.
      `);
      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          pickupTransporterStatus: 'NO_PARTNERS_FOUND',
        },
        include: { assignments: true },
      });
    }

    // Create PENDING assignments with duplicate protection
    let assignmentsCreatedCount = 0;
    for (const t of matchingTransporters) {
      const existing = await this.prisma.orderAssignment.findFirst({
        where: {
          orderId: order.id,
          assigneeId: t.id,
          assigneeType: 'TRANSPORTER',
          role: 'PICKUP',
          status: 'PENDING',
        },
      });
      if (!existing) {
        await this.prisma.orderAssignment.create({
          data: {
            orderId: order.id,
            assigneeId: t.id,
            assigneeType: 'TRANSPORTER',
            role: 'PICKUP',
            status: 'PENDING',
          },
        });
        assignmentsCreatedCount++;
      }
    }

    console.log(`[Transporter Broadcast]
      Order ID: ${order.orderId} (${order.id})
      Seller Village: ${order.sellerVillage}
      Seller Pincode: ${order.sellerPincode}
      Matching Transporter IDs: ${JSON.stringify(matchingTransporters.map(t => t.id))}
      Number of assignments created: ${assignmentsCreatedCount}
    `);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupTransporterStatus: 'PENDING',
      },
      include: { assignments: true },
    });
  }

  async transporterAccept(id: string, transporterId: string) {
    const order = await this.getOrderDetails(id);

    const assignment = await this.prisma.orderAssignment.findFirst({
      where: { orderId: order.id, assigneeId: transporterId, role: 'PICKUP', assigneeType: 'TRANSPORTER' },
    });

    if (!assignment) {
      throw new BadRequestException(`No pickup transporter request found for Transporter ID ${transporterId}`);
    }

    await this.prisma.orderAssignment.update({
      where: { id: assignment.id },
      data: { status: 'ACCEPTED' },
    });

    await this.prisma.orderAssignment.deleteMany({
      where: {
        orderId: order.id,
        role: 'PICKUP',
        assigneeType: 'TRANSPORTER',
        status: 'PENDING',
        id: { not: assignment.id },
      },
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupTransporterId: transporterId,
        pickupTransporterStatus: 'TRANSPORTER_ACCEPTED',
        mainStatus: 'TRANSPORTER_ACCEPTED',
      },
    });
  }

  async transporterReject(id: string, transporterId: string) {
    const order = await this.getOrderDetails(id);

    const assignment = await this.prisma.orderAssignment.findFirst({
      where: { orderId: order.id, assigneeId: transporterId, role: 'PICKUP', assigneeType: 'TRANSPORTER' },
    });

    if (assignment) {
      await this.prisma.orderAssignment.update({
        where: { id: assignment.id },
        data: { status: 'REJECTED' },
      });
    } else {
      await this.prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: transporterId,
          assigneeType: 'TRANSPORTER',
          role: 'PICKUP',
          status: 'REJECTED',
        },
      });
    }

    // Rebroadcast to remaining matching transporters
    const rejections = await this.prisma.orderAssignment.findMany({
      where: { orderId: order.id, role: 'PICKUP', assigneeType: 'TRANSPORTER', status: 'REJECTED' },
    });
    const rejectedIds = rejections.map((r) => r.assigneeId);

    const approvedTransporters = await this.prisma.transporterMember.findMany({
      where: { status: 'APPROVED', id: { notIn: rejectedIds } },
    });

    const matchingTransporters = approvedTransporters.filter((t) => {
      const villages = this.parseJsonArray(t.assignedVillages);
      const pincodes = this.parseJsonArray(t.assignedPincodes);
      return villages.includes(order.sellerVillage) || pincodes.includes(order.sellerPincode);
    });

    if (matchingTransporters.length > 0) {
      await this.prisma.orderAssignment.deleteMany({
        where: { orderId: order.id, role: 'PICKUP', assigneeType: 'TRANSPORTER', status: 'PENDING' },
      });

      await this.prisma.orderAssignment.createMany({
        data: matchingTransporters.map((t) => ({
          orderId: order.id,
          assigneeId: t.id,
          assigneeType: 'TRANSPORTER',
          role: 'PICKUP',
          status: 'PENDING',
        })),
      });

      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          mainStatus: 'PICKUP_ASSIGNED',
          pickupTransporterStatus: 'PENDING',
        },
      });
    } else {
      // All transporters declined — TRANSPORTER_DECLINED
      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          mainStatus: 'TRANSPORTER_DECLINED',
          pickupTransporterStatus: null,
        },
      });
    }
  }

  async transporterReschedule(id: string, transporterId: string) {
    const order = await this.getOrderDetails(id);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'RESCHEDULED',
        rescheduleType: 'PICKUP_TRANSPORTER',
        rescheduledAt: new Date(),
        pickupTransporterStatus: 'PENDING',
      },
    });
  }

  async transporterPicked(id: string) {
    const order = await this.getOrderDetails(id);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupTransporterStatus: 'IN_TRANSIT_TO_HUB',
        mainStatus: 'IN_TRANSIT_TO_HUB',
      },
    });
  }

  async warehouseIntake(id: string) {
    const order = await this.getOrderDetails(id);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        // Phase 5: Parcel arrives at hub → AT_HUB
        mainStatus: 'AT_HUB',
        warehouseReceivedAt: new Date(),
      },
    });
  }

  async generateBarcode(id: string) {
    const order = await this.getOrderDetails(id);
    const barcode = `BAR-ORD-${order.orderId.replace('ORD-', '')}`;

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        barcode,
        // Phase 5: Barcode generated → HUB_RECEIVED
        mainStatus: 'HUB_RECEIVED',
        barcodeGeneratedAt: new Date(),
      },
    });
  }

  async storeInventory(id: string) {
    const order = await this.getOrderDetails(id);

    // Find the master order to get items and buyer address details using raw SQL from public schema
    const rawMasterOrders = await this.prisma.$queryRawUnsafe(`
      SELECT id, order_number, buyer_id FROM public.master_orders WHERE order_number = $1 LIMIT 1;
    `, order.orderId) as any[];
    const masterOrder = rawMasterOrders?.[0] || null;

    let buyer: any = null;
    let items: any[] = [];

    if (masterOrder) {
      const rawBuyers = await this.prisma.$queryRawUnsafe(`
        SELECT id, village, pincode, taluka, district, address_line1, address_line2 FROM public.buyers WHERE id = $1 LIMIT 1;
      `, masterOrder.buyer_id) as any[];
      buyer = rawBuyers?.[0] || null;

      items = await this.prisma.$queryRawUnsafe(`
        SELECT product_id, quantity FROM public.master_order_items WHERE master_order_id = $1;
      `, masterOrder.id) as any[];
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const parseDate = (d: any) => {
        if (!d) return null;
        try {
          if (d && typeof d === 'object') {
            if ('prisma__value' in d && d.prisma__value) {
              return new Date(d.prisma__value).toISOString();
            }
            if (d.prisma__value !== undefined && d.prisma__value) {
              return new Date(d.prisma__value).toISOString();
            }
            if (d instanceof Date) {
              return d.toISOString();
            }
          }
          const parsed = new Date(d);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString();
          }
        } catch (e) {}
        return null;
      };

      if (masterOrder) {
        // Increment warehouse inventory
        let warehouse = await tx.warehouse.findFirst();
        if (!warehouse) {
          warehouse = await tx.warehouse.create({
            data: {
              name: 'GMU Hub Warehouse',
              address: 'Kolhapur',
            }
          });
        }

        // Synchronize products and seller users from public schema to gmu schema
        for (const item of items) {
          const rawPubProducts = await tx.$queryRawUnsafe(`
            SELECT * FROM public.products WHERE id = $1 LIMIT 1;
          `, item.product_id) as any[];
          const pubProduct = rawPubProducts?.[0];

          if (pubProduct) {
            // Check if seller exists in gmu."User"
            const rawGmuUsers = await tx.$queryRawUnsafe(`
              SELECT id FROM gmu."User" WHERE id = $1 LIMIT 1;
            `, pubProduct.seller_id) as any[];
            const gmuUser = rawGmuUsers?.[0];

            if (!gmuUser) {
              // Fetch user from public."User"
              const rawPubUsers = await tx.$queryRawUnsafe(`
                SELECT * FROM public."User" WHERE id = $1 LIMIT 1;
              `, pubProduct.seller_id) as any[];
              const pubUser = rawPubUsers?.[0];

              if (pubUser) {
                // Insert into gmu."User"
                await tx.$executeRawUnsafe(`
                  INSERT INTO gmu."User" (
                    id, "authId", role, "phoneNumber", email, "fullName", "profilePhoto", 
                    language, "isVerified", "currentStep", "profileCompletion", "applicationStatus", 
                    "uniqueCode", "approvedAt", "rejectedAt", "rejectionReason", "createdAt", "updatedAt", "deletedAt"
                  ) VALUES (
                    $1, $2::uuid, $3::"UserRole", $4, $5, $6, $7, 
                    $8, $9, $10, $11, $12::"ApplicationStatus", 
                    $13, $14::timestamp, $15::timestamp, $16, $17::timestamp, $18::timestamp, $19::timestamp
                  ) ON CONFLICT (id) DO NOTHING;
                `,
                  pubUser.id, pubUser.authId, pubUser.role, pubUser.phoneNumber, pubUser.email, pubUser.fullName, pubUser.profilePhoto,
                  pubUser.language, pubUser.isVerified, pubUser.currentStep, pubUser.profileCompletion, pubUser.applicationStatus,
                  pubUser.uniqueCode, parseDate(pubUser.approvedAt), parseDate(pubUser.rejectedAt), pubUser.rejectionReason, parseDate(pubUser.createdAt), parseDate(pubUser.updatedAt), parseDate(pubUser.deletedAt)
                );
              }
            }

            // Check if product exists in gmu.products
            const rawGmuProducts = await tx.$queryRawUnsafe(`
              SELECT id FROM gmu.products WHERE id = $1 LIMIT 1;
            `, item.product_id) as any[];
            const gmuProduct = rawGmuProducts?.[0];

            if (!gmuProduct) {
              // Insert product into gmu.products
              await tx.$executeRawUnsafe(`
                INSERT INTO gmu.products (
                  id, seller_id, name, category, price, weight, image, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamp)
                ON CONFLICT (id) DO NOTHING;
              `,
                pubProduct.id, pubProduct.seller_id, pubProduct.name, pubProduct.category,
                pubProduct.price, pubProduct.weight, pubProduct.image || pubProduct.image_uri || null,
                parseDate(pubProduct.createdAt || pubProduct.created_at || new Date())
              );
            }
          }

          await tx.warehouseInventory.upsert({
            where: {
              warehouseId_productId: {
                warehouseId: warehouse.id,
                productId: item.product_id
              }
            },
            update: {
              quantity: { increment: item.quantity }
            },
            create: {
              warehouseId: warehouse.id,
              productId: item.product_id,
              quantity: item.quantity,
              qcStatus: 'PASSED'
            }
          });
        }
      }

      // 1. Update Phase 1 Pickup Order status strictly to STORED
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          mainStatus: 'STORED',
          storedAt: new Date(),
        },
      });

      // Update public.master_orders status
      await tx.masterOrder.updateMany({
        where: { orderNumber: order.orderId },
        data: { status: 'STORED' }
      });

      // 2. Create the new Phase 2 Drop Order in gmu."Order"
      const dropOrderUuid = () => '00000000-0000-4000-8000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString();
      const dropId = dropOrderUuid();
      await tx.order.create({
        data: {
          id: dropId,
          orderId: order.orderId,
          barcode: order.barcode,
          sellerId: order.sellerId,
          buyerId: order.buyerId,
          productCount: order.productCount,
          totalQty: order.totalQty,
          totalWeight: order.totalWeight,
          mainStatus: 'DROP_PENDING',
          dropShgStatus: 'PENDING',
          phase: 'DROP',
        }
      });

      // 3. Create the corresponding public DropOrder if it doesn't exist
      if (masterOrder && buyer) {
        const existingDrop = await tx.$queryRawUnsafe(`
          SELECT id FROM public.drop_orders WHERE drop_order_number = $1 LIMIT 1;
        `, `DRP-${order.orderId}`) as any[];

        if (existingDrop.length === 0) {
          const deliveryAddress = [buyer.address_line1, buyer.address_line2, buyer.village, buyer.taluka, buyer.district, buyer.pincode]
            .filter(Boolean)
            .join(', ') || '';

          await tx.$executeRawUnsafe(`
            INSERT INTO public.drop_orders (
              master_order_id, buyer_id, status, delivery_address, created_at, drop_order_number
            ) VALUES ($1, $2, 'PENDING', $3, NOW(), $4);
          `, masterOrder.id, buyer.id, deliveryAddress, `DRP-${order.orderId}`);

          const generatedDrop = await tx.$queryRawUnsafe(`
            SELECT id FROM public.drop_orders WHERE drop_order_number = $1 LIMIT 1;
          `, `DRP-${order.orderId}`) as any[];

          if (generatedDrop?.[0]) {
            const dropOrderId = generatedDrop[0].id;
            for (const item of items) {
              await tx.$executeRawUnsafe(`
                INSERT INTO public.drop_order_items (
                  drop_order_id, product_id, quantity, verification_status
                ) VALUES ($1, $2, $3, 'PENDING');
              `, dropOrderId, item.product_id, item.quantity);
            }

            await tx.$executeRawUnsafe(`
              INSERT INTO public.drop_tracking (
                drop_order_id, status, remarks, updated_at
              ) VALUES ($1, 'PENDING', 'Delivery leg created upon arrival at GMU Hub.', NOW());
            `, dropOrderId);
          }
        }
      }

      return { updated, dropId };
    }, {
      timeout: 30000
    });

    try {
      await this.broadcastDropShg(result.dropId);
    } catch (err: any) {
      console.error(`[storeInventory] Immediate drop SHG broadcast failed:`, err.message);
    }

    return result.updated;
  }

  async scanInventory(id: string, barcode: string) {
    const order = await this.getOrderDetails(id);

    if (order.barcode !== barcode) {
      throw new BadRequestException(`Scanned barcode ${barcode} does not match order barcode ${order.barcode}`);
    }

    if (
      order.mainStatus !== 'STORED' &&
      order.mainStatus !== 'DROP_ASSIGNED' &&
      order.mainStatus !== 'HUB_RECEIVED' &&
      order.mainStatus !== 'BARCODE_GENERATED'
    ) {
      throw new BadRequestException(`Order must be in STORED or DROP_ASSIGNED status to perform inventory dispatch scan`);
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'DISPATCHED',
        dispatchedAt: new Date(),
      },
    });

    // Find and update corresponding DROP order
    const dropOrder = await this.prisma.order.findFirst({
      where: { orderId: order.orderId, phase: 'DROP' }
    });
    if (dropOrder) {
      await this.prisma.order.update({
        where: { id: dropOrder.id },
        data: {
          mainStatus: 'DROP_CREATED',
          updatedAt: new Date(),
        }
      });
    }

    return updated;
  }

  // --- DROP FLOW WORKFLOWS ---

  async broadcastDropShg(id: string) {
    const order = await this.getOrderDetails(id);

    // Find APPROVED & ACTIVE buyer-side SHGs matching exact Village + Pincode
    const approvedShgs = await this.prisma.$queryRawUnsafe(`
      SELECT cm.id, cm.pincode, cm.village
      FROM gmu."CommunityMember" cm
      JOIN public."User" u ON cm."mobileNumber" = u."phoneNumber"
      WHERE cm.type = 'SHG' AND cm.status = 'APPROVED' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL;
    `) as any[];

    const normalizeVillage = (v: string) => {
      if (!v) return '';
      return v.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
    };

    let matchingShgs = approvedShgs.filter(shg => 
      shg.pincode && order.buyerPincode && 
      shg.pincode.trim().toLowerCase() === order.buyerPincode.trim().toLowerCase() &&
      shg.village && order.buyerVillage && 
      normalizeVillage(shg.village) === normalizeVillage(order.buyerVillage)
    );

    if (matchingShgs.length === 0 && order.buyerPincode) {
      matchingShgs = approvedShgs.filter(shg => 
        shg.pincode && 
        shg.pincode.trim().toLowerCase() === order.buyerPincode.trim().toLowerCase()
      );
    }

    if (matchingShgs.length === 0 && order.buyerVillage) {
      matchingShgs = approvedShgs.filter(shg => 
        shg.village && 
        normalizeVillage(shg.village) === normalizeVillage(order.buyerVillage)
      );
    }

    if (matchingShgs.length === 0) {
      console.log(`[Drop SHG Broadcast]
        Order ID: ${order.orderId} (${order.id})
        Buyer Village: ${order.buyerVillage}
        Buyer Pincode: ${order.buyerPincode}
        Matching SHG IDs: []
        Number of assignments created: 0
        Reason: No approved and active SHG matches Buyer Pincode or Village.
      `);
      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          mainStatus: 'DROP_PENDING',
          dropShgStatus: 'NO_PARTNERS_FOUND',
        },
        include: { assignments: true },
      });
    }

    // Create PENDING assignments with duplicate protection
    let assignmentsCreatedCount = 0;
    for (const shg of matchingShgs) {
      const existing = await this.prisma.orderAssignment.findFirst({
        where: {
          orderId: order.id,
          assigneeId: shg.id,
          assigneeType: 'SHG',
          role: 'DROP',
          status: 'PENDING',
        },
      });
      if (!existing) {
        await this.prisma.orderAssignment.create({
          data: {
            orderId: order.id,
            assigneeId: shg.id,
            assigneeType: 'SHG',
            role: 'DROP',
            status: 'PENDING',
          },
        });
        assignmentsCreatedCount++;
      }
    }

    console.log(`[Drop SHG Broadcast]
      Order ID: ${order.orderId} (${order.id})
      Buyer Village: ${order.buyerVillage}
      Buyer Pincode: ${order.buyerPincode}
      Matching SHG IDs: ${JSON.stringify(matchingShgs.map(s => s.id))}
      Number of assignments created: ${assignmentsCreatedCount}
    `);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'DROP_PENDING',
        dropShgStatus: 'PENDING',
      },
      include: { assignments: true },
    });
  }

  async dropShgAccept(id: string, shgId: string) {
    const order = await this.getOrderDetails(id);

    const assignment = await this.prisma.orderAssignment.findFirst({
      where: { orderId: order.id, assigneeId: shgId, role: 'DROP', assigneeType: 'SHG' },
    });

    if (!assignment) {
      throw new BadRequestException(`No drop SHG assignment request found for SHG ID ${shgId}`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.orderAssignment.update({
        where: { id: assignment.id },
        data: { status: 'ACCEPTED' },
      });

      await tx.orderAssignment.deleteMany({
        where: {
          orderId: order.id,
          role: 'DROP',
          assigneeType: 'SHG',
          status: 'PENDING',
          id: { not: assignment.id },
        },
      });

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          dropShgId: shgId,
          dropShgStatus: 'ACCEPTED',
          mainStatus: 'DROP_SHG_ACCEPTED',
        },
      });

      // Update public.master_orders status
      await tx.masterOrder.updateMany({
        where: { orderNumber: order.orderId },
        data: { status: 'DROP_SHG_ACCEPTED' }
      });

      // Update public.drop_orders status
      const cmUser = await tx.$queryRawUnsafe(`
        SELECT u.id FROM public."User" u
        JOIN gmu."CommunityMember" cm ON u."phoneNumber" = cm."mobileNumber"
        WHERE cm.id = $1 LIMIT 1;
      `, shgId) as any[];
      const shgUserId = cmUser?.[0]?.id || null;

      await tx.dropOrder.updateMany({
        where: { dropOrderNumber: `DRP-${order.orderId}` },
        data: { status: 'ACCEPTED', shgId: shgUserId }
      });

      // Update public.drop_tracking
      const dropOrders = await tx.dropOrder.findMany({
        where: { dropOrderNumber: `DRP-${order.orderId}` }
      });
      if (dropOrders && dropOrders[0]) {
        const dropOrderId = dropOrders[0].id;
        await tx.dropTracking.create({
          data: {
            dropOrderId: dropOrderId,
            status: 'DROP_SHG_ACCEPTED',
            remarks: 'Drop Order accepted by SHG Member.',
          }
        });
      }

      /*
      // Broadcast to matching transporters based on configured routes (priority: Pincode -> Village -> Taluka -> District)
      const buyerVillage = order.buyer?.village || order.buyerVillage;
      const buyerPincode = order.buyer?.pincode || order.buyerPincode;
      
      const rawBuyer = await tx.$queryRawUnsafe(`
        SELECT taluka, district FROM public.buyers WHERE id = $1 LIMIT 1;
      `, order.buyerId) as any[];
      const buyerTaluka = rawBuyer?.[0]?.taluka || '';
      const buyerDistrict = rawBuyer?.[0]?.district || '';

      const approvedTransporters = await tx.$queryRawUnsafe(`
        SELECT tm.id, tm."assignedVillages", tm."assignedPincodes", u.id AS "userId", rd."operatingArea"
        FROM gmu."TransporterMember" tm
        JOIN public."User" u ON tm."mobileNumber" = u."phoneNumber"
        LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
        WHERE tm.status = 'APPROVED' AND u."applicationStatus" = 'APPROVED';
      `) as any[];

      const parseJsonArray = (val: any) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch(e) {}
        }
        return [];
      };

      const p = buyerPincode?.toLowerCase();
      const v = buyerVillage?.toLowerCase();
      const t = buyerTaluka?.toLowerCase();
      const d = buyerDistrict?.toLowerCase();

      const getTransporterLocations = (tr: any) => {
        const areas = tr.operatingArea
          ? tr.operatingArea.split(',').map((s: string) => s.trim().toLowerCase())
          : [];
        const villages = parseJsonArray(tr.assignedVillages).map((s: any) => String(s).toLowerCase());
        const pincodes = parseJsonArray(tr.assignedPincodes).map((s: any) => String(s).toLowerCase());
        return { areas, villages, pincodes };
      };

      // Priority 1: Pincode
      let matchingTransporters = approvedTransporters.filter(tr => {
        const { areas, pincodes } = getTransporterLocations(tr);
        return p && (pincodes.includes(p) || areas.includes(p));
      });

      // Priority 2: Village
      if (matchingTransporters.length === 0 && v) {
        matchingTransporters = approvedTransporters.filter(tr => {
          const { areas, villages } = getTransporterLocations(tr);
          return villages.includes(v) || areas.includes(v);
        });
      }

      // Priority 3: Taluka
      if (matchingTransporters.length === 0 && t) {
        matchingTransporters = approvedTransporters.filter(tr => {
          const { areas } = getTransporterLocations(tr);
          return areas.includes(t);
        });
      }

      // Priority 4: District
      if (matchingTransporters.length === 0 && d) {
        matchingTransporters = approvedTransporters.filter(tr => {
          const { areas } = getTransporterLocations(tr);
          return areas.includes(d);
        });
      }

      if (matchingTransporters.length > 0) {
        await tx.$executeRawUnsafe(`
          DELETE FROM gmu."OrderAssignment" WHERE "orderId" = $1 AND role = 'DROP' AND "assigneeType" = 'TRANSPORTER' AND status = 'PENDING';
        `, order.id);

        for (const tr of matchingTransporters) {
          const uuidv4 = () => '00000000-0000-4000-8000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString();
          await tx.$executeRawUnsafe(`
            INSERT INTO gmu."OrderAssignment" (id, "orderId", "assigneeId", "assigneeType", role, status, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, 'TRANSPORTER', 'DROP', 'PENDING', NOW(), NOW());
          `, uuidv4(), order.id, tr.id);
        }

        await tx.$executeRawUnsafe(`
          UPDATE gmu."Order" SET "dropTransporterStatus" = 'PENDING' WHERE id = $1;
        `, order.id);
      }
      */

      return updated;
    });
  }

  async dropShgReject(id: string, shgId: string) {
    const order = await this.getOrderDetails(id);

    const assignment = await this.prisma.orderAssignment.findFirst({
      where: { orderId: order.id, assigneeId: shgId, role: 'DROP', assigneeType: 'SHG' },
    });

    if (assignment) {
      await this.prisma.orderAssignment.update({
        where: { id: assignment.id },
        data: { status: 'REJECTED' },
      });
    } else {
      await this.prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: shgId,
          assigneeType: 'SHG',
          role: 'DROP',
          status: 'REJECTED',
        },
      });
    }

    const rejections = await this.prisma.orderAssignment.findMany({
      where: { orderId: order.id, role: 'DROP', assigneeType: 'SHG', status: 'REJECTED' },
    });
    const rejectedIds = rejections.map((r) => r.assigneeId);

    const matchingShgs = await this.prisma.communityMember.findMany({
      where: {
        type: 'SHG',
        status: 'APPROVED',
        village: order.buyerVillage,
        pincode: order.buyerPincode,
        id: { notIn: rejectedIds },
      },
    });

    if (matchingShgs.length > 0) {
      await this.prisma.orderAssignment.deleteMany({
        where: { orderId: order.id, role: 'DROP', assigneeType: 'SHG', status: 'PENDING' },
      });

      await this.prisma.orderAssignment.createMany({
        data: matchingShgs.map((shg) => ({
          orderId: order.id,
          assigneeId: shg.id,
          assigneeType: 'SHG',
          role: 'DROP',
          status: 'PENDING',
        })),
      });

      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          mainStatus: 'DROP_ASSIGNED',
          dropShgStatus: 'PENDING',
        },
      });
    } else {
      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          mainStatus: 'DROP_ASSIGNED',
          dropShgStatus: null,
        },
      });
    }
  }

  async dropShgReschedule(id: string, shgId: string, duration: string) {
    const order = await this.getOrderDetails(id);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'REASSIGNED',
        rescheduleType: 'DROP_SHG',
        rescheduleDuration: duration,
        rescheduledAt: new Date(),
        dropShgStatus: 'PENDING',
      },
    });
  }

  async broadcastDropTransporter(id: string) {
    const order = await this.getOrderDetails(id);

    const approvedTransporters = await this.prisma.transporterMember.findMany({
      where: { status: 'APPROVED' },
    });

    const matchingTransporters = approvedTransporters.filter((t) => {
      const villages = this.parseJsonArray(t.assignedVillages);
      const pincodes = this.parseJsonArray(t.assignedPincodes);
      return villages.includes(order.buyerVillage) || pincodes.includes(order.buyerPincode);
    });

    if (matchingTransporters.length === 0) {
      throw new BadRequestException(`No matching approved transporters found for buyer village ${order.buyerVillage} or pincode ${order.buyerPincode}`);
    }

    await this.prisma.orderAssignment.deleteMany({
      where: { orderId: order.id, role: 'DROP', assigneeType: 'TRANSPORTER', status: 'PENDING' },
    });

    await this.prisma.orderAssignment.createMany({
      data: matchingTransporters.map((t) => ({
        orderId: order.id,
        assigneeId: t.id,
        assigneeType: 'TRANSPORTER',
        role: 'DROP',
        status: 'PENDING',
      })),
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'DROP_ASSIGNED',
        dropTransporterStatus: 'PENDING',
      },
      include: { assignments: true },
    }); // DROP_ASSIGNED stays — transporter broadcast doesn't change displayed status
  }

  async dropTransporterAccept(id: string, transporterId: string) {
    const order = await this.getOrderDetails(id);

    const assignment = await this.prisma.orderAssignment.findFirst({
      where: { orderId: order.id, assigneeId: transporterId, role: 'DROP', assigneeType: 'TRANSPORTER' },
    });

    if (!assignment) {
      throw new BadRequestException(`No drop transporter request found for Transporter ID ${transporterId}`);
    }

    await this.prisma.orderAssignment.update({
      where: { id: assignment.id },
      data: { status: 'ACCEPTED' },
    });

    await this.prisma.orderAssignment.deleteMany({
      where: {
        orderId: order.id,
        role: 'DROP',
        assigneeType: 'TRANSPORTER',
        status: 'PENDING',
        id: { not: assignment.id },
      },
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropTransporterId: transporterId,
        dropTransporterStatus: 'ACCEPTED',
        mainStatus: 'DROP_TRANSPORTER_ACCEPTED',
      },
    });
  }

  async dropTransporterPicked(id: string) {
    const order = await this.getOrderDetails(id);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        // Phase 6: Transporter picks from hub → IN_TRANSIT_TO_DROP_SHG
        mainStatus: 'IN_TRANSIT_TO_DROP_SHG',
      },
    });
  }

  async dropTransporterReject(id: string, transporterId: string) {
    const order = await this.getOrderDetails(id);

    const assignment = await this.prisma.orderAssignment.findFirst({
      where: { orderId: order.id, assigneeId: transporterId, role: 'DROP', assigneeType: 'TRANSPORTER' },
    });

    if (assignment) {
      await this.prisma.orderAssignment.update({
        where: { id: assignment.id },
        data: { status: 'REJECTED' },
      });
    } else {
      await this.prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: transporterId,
          assigneeType: 'TRANSPORTER',
          role: 'DROP',
          status: 'REJECTED',
        },
      });
    }

    const rejections = await this.prisma.orderAssignment.findMany({
      where: { orderId: order.id, role: 'DROP', assigneeType: 'TRANSPORTER', status: 'REJECTED' },
    });
    const rejectedIds = rejections.map((r) => r.assigneeId);

    const approvedTransporters = await this.prisma.transporterMember.findMany({
      where: { status: 'APPROVED', id: { notIn: rejectedIds } },
    });

    const matchingTransporters = approvedTransporters.filter((t) => {
      const villages = this.parseJsonArray(t.assignedVillages);
      const pincodes = this.parseJsonArray(t.assignedPincodes);
      return villages.includes(order.buyerVillage) || pincodes.includes(order.buyerPincode);
    });

    if (matchingTransporters.length > 0) {
      await this.prisma.orderAssignment.deleteMany({
        where: { orderId: order.id, role: 'DROP', assigneeType: 'TRANSPORTER', status: 'PENDING' },
      });

      await this.prisma.orderAssignment.createMany({
        data: matchingTransporters.map((t) => ({
          orderId: order.id,
          assigneeId: t.id,
          assigneeType: 'TRANSPORTER',
          role: 'DROP',
          status: 'PENDING',
        })),
      });

      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          mainStatus: 'DROP_ASSIGNED',
          dropTransporterStatus: 'PENDING',
        },
      });
    } else {
      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          mainStatus: 'DROP_SHG_ACCEPTED',
          dropTransporterStatus: null,
        },
      });
    }
  }

  async dropTransporterReschedule(id: string, _transporterId: string) {
    const order = await this.getOrderDetails(id);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'REASSIGNED',
        rescheduleType: 'DROP_TRANSPORTER',
        rescheduledAt: new Date(),
        dropTransporterStatus: 'PENDING',
      },
    });
  }

  async dropTransporterDropsToShg(id: string) {
    const order = await this.getOrderDetails(id);

    await this.prisma.orderAssignment.updateMany({
      where: { orderId: order.id, role: 'DROP', assigneeType: 'TRANSPORTER', status: 'ACCEPTED' },
      data: { status: 'DELIVERED' },
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'PARCEL_AT_DROP_SHG',
        dropTransporterStatus: 'DELIVERED',
      },
    });
  }

  async dropComplete(id: string) {
    const order = await this.getOrderDetails(id);

    await this.prisma.orderAssignment.updateMany({
      where: { orderId: order.id, role: 'DROP', assigneeType: 'SHG', status: 'ACCEPTED' },
      data: { status: 'DELIVERED' },
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropShgStatus: 'DELIVERED',
        mainStatus: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });
  }

  // --- RETURN FLOWS ---

  async createTransporterReturn(id: string) {
    const order = await this.getOrderDetails(id);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        returnType: 'TRANSPORTER_RETURN',
        mainStatus: 'TRANSPORTER_RETURN_PENDING',
        dropTransporterStatus: 'SHG_NOT_AVAILABLE',
      },
    });
  }

  async transporterReturnIntake(id: string) {
    const order = await this.getOrderDetails(id);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'TRANSPORTER_RETURN_COMPLETED',
        dropTransporterStatus: 'DELIVERED_TO_GMU',
        warehouseReceivedAt: new Date(),
      },
    });
  }

  async redispatchOrder(id: string) {
    const order = await this.getOrderDetails(id);

    // Reset Drop statuses and remove return indicator — re-enter drop pipeline
    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropShgId: null,
        dropShgStatus: null,
        dropTransporterStatus: null,
        returnType: null,
        mainStatus: 'DROP_ASSIGNED',
      },
    });
  }

  async scanTransporterReturn(id: string, barcode: string) {
    const order = await this.getOrderDetails(id);

    if (order.barcode && order.barcode !== barcode) {
      throw new BadRequestException(`Scanned barcode ${barcode} does not match order barcode ${order.barcode}`);
    }

    if (order.mainStatus !== 'TRANSPORTER_RETURN_COMPLETED') {
      throw new BadRequestException(`Order must be in TRANSPORTER_RETURN_COMPLETED status to scan transporter return`);
    }

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'INVENTORY_TRANSPORTER_RETURN',
        storedAt: new Date(),
        barcodeGeneratedAt: new Date(),
      },
    });
  }

  async scanBuyerReturn(id: string, barcode: string) {
    const order = await this.getOrderDetails(id);

    if (order.barcode && order.barcode !== barcode) {
      throw new BadRequestException(`Scanned barcode ${barcode} does not match order barcode ${order.barcode}`);
    }

    if (order.mainStatus !== 'BUYER_RETURN_COMPLETED') {
      throw new BadRequestException(`Order must be in BUYER_RETURN_COMPLETED status to scan buyer return`);
    }

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'INVENTORY_BUYER_RETURN',
        storedAt: new Date(),
        barcodeGeneratedAt: new Date(),
        warehouseReceivedAt: new Date(),
      },
    });
  }

  async dispatchTransporterReturn(id: string, barcode: string) {
    const order = await this.getOrderDetails(id);

    if (order.barcode && order.barcode !== barcode) {
      throw new BadRequestException(`Scanned barcode ${barcode} does not match order barcode ${order.barcode}`);
    }

    if (order.mainStatus !== 'INVENTORY_TRANSPORTER_RETURN') {
      throw new BadRequestException(`Order must be in INVENTORY_TRANSPORTER_RETURN status to dispatch transporter return`);
    }

    await this.prisma.orderAssignment.deleteMany({
      where: { orderId: order.id, role: 'DROP' },
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropShgId: null,
        dropShgStatus: null,
        dropTransporterStatus: null,
        returnType: 'TRANSPORTER_RETURN',
        mainStatus: 'DROP_ASSIGNED',
        dispatchedAt: new Date(),
      },
    });
  }

  // --- NEW BUYER RETURN FLOW ---

  async requestBuyerReturn(id: string) {
    const order = await this.getOrderDetails(id);

    if (order.mainStatus !== 'DELIVERED') {
      throw new BadRequestException(`Order must be in DELIVERED status to create a buyer return request`);
    }

    if (!order.dropShgId) {
      throw new BadRequestException(`No original SHG drop assignment found to return to`);
    }

    // Deletes any old return assignments just in case
    await this.prisma.orderAssignment.deleteMany({
      where: { orderId: order.id, role: 'RETURN' },
    });

    await this.prisma.orderAssignment.create({
      data: {
        orderId: order.id,
        assigneeId: order.dropShgId,
        assigneeType: 'SHG',
        role: 'RETURN',
        status: 'PENDING',
      },
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        returnType: 'BUYER_RETURN',
        mainStatus: 'RETURN_SHG_PENDING',
        pickupReturnShgId: order.dropShgId,
        pickupShgStatus: 'PENDING',
      },
    });
  }

  async buyerReturnShgAccept(id: string) {
    const order = await this.getOrderDetails(id);

    const assignment = await this.prisma.orderAssignment.findFirst({
      where: { orderId: order.id, role: 'RETURN', assigneeType: 'SHG', status: 'PENDING' },
    });

    if (!assignment) {
      throw new BadRequestException(`No pending return SHG request found for order ${order.id}`);
    }

    await this.prisma.orderAssignment.update({
      where: { id: assignment.id },
      data: { status: 'ACCEPTED' },
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'RETURN_SHG_ACCEPTED',
        pickupShgStatus: 'ACCEPTED',
      },
    });
  }

  async buyerReturnShgPicked(id: string) {
    const order = await this.getOrderDetails(id);

    const assignment = await this.prisma.orderAssignment.findFirst({
      where: { orderId: order.id, role: 'RETURN', assigneeType: 'SHG', status: 'ACCEPTED' },
    });

    if (assignment) {
      await this.prisma.orderAssignment.update({
        where: { id: assignment.id },
        data: { status: 'PICKED' },
      });
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupShgStatus: 'PICKED',
      },
    });

    // Auto broadcast transporter
    return this.broadcastBuyerReturnTransporter(order.id);
  }

  async broadcastBuyerReturnTransporter(id: string) {
    const order = await this.getOrderDetails(id);

    const approvedTransporters = await this.prisma.transporterMember.findMany({
      where: { status: 'APPROVED' },
    });

    const matchingTransporters = approvedTransporters.filter((t) => {
      const villages = this.parseJsonArray(t.assignedVillages);
      const pincodes = this.parseJsonArray(t.assignedPincodes);
      return villages.includes(order.buyerVillage) || pincodes.includes(order.buyerPincode);
    });

    if (matchingTransporters.length === 0) {
      throw new BadRequestException(`No matching approved transporters found for buyer village ${order.buyerVillage} or pincode ${order.buyerPincode}`);
    }

    await this.prisma.orderAssignment.deleteMany({
      where: { orderId: order.id, role: 'RETURN', assigneeType: 'TRANSPORTER', status: 'PENDING' },
    });

    await this.prisma.orderAssignment.createMany({
      data: matchingTransporters.map((t) => ({
        orderId: order.id,
        assigneeId: t.id,
        assigneeType: 'TRANSPORTER',
        role: 'RETURN',
        status: 'PENDING',
      })),
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'RETURN_TRANSPORTER_PENDING',
        pickupTransporterStatus: 'PENDING',
      },
      include: { assignments: true },
    });
  }

  async buyerReturnTransporterAccept(id: string, transporterId: string) {
    const order = await this.getOrderDetails(id);

    const assignment = await this.prisma.orderAssignment.findFirst({
      where: { orderId: order.id, assigneeId: transporterId, role: 'RETURN', assigneeType: 'TRANSPORTER' },
    });

    if (!assignment) {
      throw new BadRequestException(`No return transporter request found for Transporter ID ${transporterId}`);
    }

    await this.prisma.orderAssignment.update({
      where: { id: assignment.id },
      data: { status: 'ACCEPTED' },
    });

    await this.prisma.orderAssignment.deleteMany({
      where: {
        orderId: order.id,
        role: 'RETURN',
        assigneeType: 'TRANSPORTER',
        status: 'PENDING',
        id: { not: assignment.id },
      },
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        returnTransporterId: transporterId,
        mainStatus: 'RETURN_TRANSPORTER_ACCEPTED',
        pickupTransporterStatus: 'ACCEPTED',
      },
    });
  }

  async buyerReturnTransporterPicked(id: string) {
    const order = await this.getOrderDetails(id);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'RETURN_IN_TRANSIT_TO_HUB',
        pickupTransporterStatus: 'IN_TRANSIT_TO_HUB',
      },
    });
  }

  async buyerReturnTransporterDelivered(id: string) {
    const order = await this.getOrderDetails(id);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'BUYER_RETURN_COMPLETED',
        pickupTransporterStatus: 'DELIVERED_TO_GMU',
      },
    });
  }

  async buyerReturnIntake(id: string) {
    const order = await this.getOrderDetails(id);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'INVENTORY_BUYER_RETURN',
        storedAt: new Date(),
      },
    });
  }



  async simulateRescheduleTimeout(id: string) {
    const order = await this.getOrderDetails(id);

    if (!['REASSIGNED', 'RESCHEDULED'].includes(order.mainStatus) || !order.rescheduleType) {
      throw new BadRequestException(`Order is not currently in a REASSIGNED/RESCHEDULED state`);
    }

    const type = order.rescheduleType;

    // Reset reschedule fields
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        rescheduleType: null,
        rescheduleDuration: null,
        rescheduledAt: null,
      },
    });

    if (type === 'PICKUP_SHG') {
      return this.broadcastShg(order.id);
    } else if (type === 'PICKUP_TRANSPORTER') {
      return this.broadcastTransporter(order.id);
    } else if (type === 'DROP_SHG') {
      return this.broadcastDropShg(order.id);
    } else if (type === 'DROP_TRANSPORTER') {
      return this.broadcastDropTransporter(order.id);
    }

    return this.getOrderDetails(order.id);
  }

  // ── Exception Lifecycle Methods ───────────────────────────────────────────

  async completeOrder(id: string) {
    const order = await this.getOrderDetails(id);
    return this.prisma.order.update({
      where: { id: order.id },
      data: { mainStatus: 'COMPLETED' },
    });
  }

  async holdOrder(id: string) {
    const order = await this.getOrderDetails(id);
    return this.prisma.order.update({
      where: { id: order.id },
      data: { mainStatus: 'ON_HOLD' },
    });
  }

  async cancelOrder(id: string) {
    const order = await this.getOrderDetails(id);
    return this.prisma.order.update({
      where: { id: order.id },
      data: { mainStatus: 'CANCELLED' },
    });
  }

  async slaBreachOrder(id: string) {
    const order = await this.getOrderDetails(id);
    return this.prisma.order.update({
      where: { id: order.id },
      data: { mainStatus: 'SLA_BREACHED' },
    });
  }
}
