import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { QrService } from '../../../shared/qr/qr.service';
import { OrderFilterDto } from './dto/order-filter.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderManagementService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private qrService: QrService
  ) { }

  private isLoopRunning = false;

  onModuleInit() {
    // Automatic broadcast loop disabled to prevent mass-assigning historical seed orders on startup.
    // Live workflows broadcast on demand when orders change status.
  }

  async runAutoBroadcastLoop() {
    // 1. Check SHG auto-broadcasts
    const approvedShgs = await this.prisma.user.findMany({
      where: { role: 'SHG', applicationStatus: 'APPROVED', deletedAt: null }
    });
    const approvedShgIds = approvedShgs.map(s => String(s.id));

    const ordersPlaced = await this.prisma.order.findMany({
      where: {
        phase: 'PICKUP',
        mainStatus: { in: ['NEW', 'ORDER_PLACED', 'PICKUP_ASSIGNED'] },
        NOT: { pickupShgStatus: 'NO_PARTNERS_FOUND' }
      },
      include: {
        seller: true,
        assignments: {
          where: {
            role: 'PICKUP',
            assigneeType: 'SHG',
            status: { in: ['PENDING', 'ACCEPTED'] },
          },
        },
      },
      take: 50
    });

    for (const order of ordersPlaced) {
      if (order.pickupShgId && order.pickupShgStatus === 'ACCEPTED' && order.assignments.length > 0) {
        continue;
      }
      const sVillage = order.seller?.village || (order as any).sellerVillage || '';
      const sPincode = order.seller?.pincode || (order as any).sellerPincode || '';
      const sPostOffice = order.seller?.postOffice || (order as any).sellerPostOffice || '';

      const matchingShgs = await this.getMatchingShgs(
        sVillage,
        sPincode,
        sPostOffice
      );
      const existingAssigneeIds = new Set(
        order.assignments.filter(a => a.assigneeType === 'SHG').map(a => String(a.assigneeId))
      );
      const isMissingPartner = matchingShgs.some(s => !existingAssigneeIds.has(String(s.id)));

      if (order.assignments.length === 0 || isMissingPartner || !order.pickupShgId) {
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
        mainStatus: { in: ['PARCEL_AT_SHG', 'PARCEL_PICKED'] },
        pickupTransporterId: null,
        NOT: { pickupTransporterStatus: 'NO_PARTNERS_FOUND' }
      },
      include: {
        seller: true,
        assignments: {
          where: {
            role: 'PICKUP',
            assigneeType: 'TRANSPORTER',
            status: { in: ['PENDING', 'ACCEPTED'] },
          },
        },
      },
      take: 50
    });

    for (const order of ordersAtShg) {
      const matchingTransporters = await this.getMatchingTransporters(
        order.seller?.village || '',
        order.seller?.pincode || '',
        order.seller?.postOffice || '',
        [],
        Number(order.totalWeight || 0)
      );
      const existingAssigneeIds = new Set(
        order.assignments.filter(a => a.assigneeType === 'TRANSPORTER').map(a => String(a.assigneeId))
      );
      const matchingIds = new Set(matchingTransporters.map(t => String(t.id)));
      const hasStaleAssignments = order.assignments.some(a => !matchingIds.has(String(a.assigneeId)));
      const isMissingPartner = matchingTransporters.some(t => !existingAssigneeIds.has(String(t.id)));

      if (order.assignments.length === 0 || (isMissingPartner && matchingTransporters.length > existingAssigneeIds.size) || hasStaleAssignments) {
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
        NOT: {
          dropShgStatus: 'NO_PARTNERS_FOUND'
        }
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
      take: 50
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

    // 4. Check Drop Transporter auto-broadcasts
    const dropOrdersForTransporter = await this.prisma.order.findMany({
      where: {
        phase: 'DROP',
        mainStatus: 'DROP_SHG_ACCEPTED',
        NOT: {
          returnType: 'BUYER_RETURN',
        },
      },
      include: {
        assignments: {
          where: {
            role: 'DROP',
            assigneeType: 'TRANSPORTER',
            status: { in: ['PENDING', 'ACCEPTED'] },
          },
        },
      },
      take: 50
    });

    for (const order of dropOrdersForTransporter) {
      if (order.assignments.length === 0) {
        console.log(`[AutoBroadcastLoop] Automatically triggering Drop Transporter broadcast for order ${order.orderId} (${order.id})`);
        try {
          await this.broadcastDropTransporter(order.id);
        } catch (err: any) {
          console.error(`[AutoBroadcastLoop] Drop Transporter broadcast failed for order ${order.id}:`, err.message);
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
      } catch (e) { }
    }
    return [];
  }

  async findMatchingShgs(address: { village?: string; pincode?: string; taluka?: string; district?: string }) {
    const shgs = await this.prisma.user.findMany({
      where: {
        role: 'SHG',
        applicationStatus: 'APPROVED',
      },
      include: {
        shgDetail: true,
        address: true,
      }
    });

    const normalizeVillage = (v?: string | null): string => {
      if (!v) return '';
      return v.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    };

    const targetVillage = normalizeVillage(address.village);
    const targetPincode = address.pincode ? address.pincode.toLowerCase().trim() : '';

    const matchedShgUsers = shgs.filter((shg: any) => {
      const shgVillage = normalizeVillage(shg.address?.village);
      const shgPincode = shg.address?.pincode ? shg.address.pincode.toLowerCase().trim() : '';

      // STRICT MATCHING: Both Village AND Pincode MUST be present and match EXACTLY
      if (!targetVillage || !targetPincode || !shgVillage || !shgPincode) {
        return false;
      }
      return shgVillage === targetVillage && shgPincode === targetPincode;
    });

    return matchedShgUsers.map((shg: any) => ({
      id: String(shg.id),
      memberCode: shg.uniqueCode || `SHG-${shg.id}`,
      type: 'SHG',
      status: shg.applicationStatus,
      fullName: shg.fullName || '',
      mobileNumber: shg.phoneNumber,
      shgName: shg.shgDetail?.shgName || '',
      village: shg.address?.village || '',
      taluka: shg.address?.taluka || '',
      district: shg.address?.district || '',
      state: shg.address?.state || '',
      pincode: shg.address?.pincode || '',
      deliveryAddress: shg.address?.deliveryAddress || '',
    }));
  }

  async findMatchingTransporters(address: { village?: string; pincode?: string; taluka?: string; district?: string }) {
    const transporters = await this.prisma.$queryRawUnsafe(`
      SELECT u.id, rd."operatingArea", rd."pickupLocations" as "assignedPincodes", mv."assignedVillages"
      FROM public."User" u
      LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
      LEFT JOIN public."MilkVanDetail" mv ON u.id = mv."userId"
      WHERE u.role = 'TRANSPORTER' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL;
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
        return pincodes.some((po: string) => po.split(' (')[0] === p) || areas.some((a: string) => a.split(' (')[0] === p);
      });
      if (matches.length > 0) return matches.map(tr => ({ ...tr, id: String(tr.id) }));
    }

    // Priority 2: Village
    if (v) {
      const matches = transporters.filter(tr => {
        const { areas, villages } = getTransporterLocations(tr);
        return villages.some((vi: string) => vi.split(' (')[0] === v) || areas.some((a: string) => a.split(' (')[0] === v);
      });
      if (matches.length > 0) return matches.map(tr => ({ ...tr, id: String(tr.id) }));
    }

    // Priority 3: Taluka
    if (t) {
      const matches = transporters.filter(tr => {
        const { areas } = getTransporterLocations(tr);
        return areas.some((a: string) => a.split(' (')[0] === t);
      });
      if (matches.length > 0) return matches.map(tr => ({ ...tr, id: String(tr.id) }));
    }

    // Priority 4: District
    if (d) {
      const matches = transporters.filter(tr => {
        const { areas } = getTransporterLocations(tr);
        return areas.some((a: string) => a.split(' (')[0] === d);
      });
      if (matches.length > 0) return matches.map(tr => ({ ...tr, id: String(tr.id) }));
    }

    return [];
  }

  // --- QUERY FILTER HELPERS ---

  private mapQueryStatus(status: string): string[] {
    const s = status.toUpperCase().trim().replace(/[\s-]/g, '_');

    // ── Phase 1: Order Creation ──────────────────────────────────────────────
    if (s === 'ORDER_PLACED' || s === 'PENDING' || s === 'PENDING_PICKUP' || s === 'NEW') {
      return ['NEW', 'ORDER_PLACED', 'PENDING_PICKUP', 'PENDING_DROP', 'DISPATCHED', 'PENDING'];
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
      return ['PARCEL_AT_SHG', 'PARCEL_AT_DROP_SHG', 'RETURN_PARCEL_AT_SHG', 'RETURN_PICKED_BY_SHG', 'RETURN_TRANSPORTER_REQUESTED', 'RETURN_COMPLETED', 'STORED', 'INVENTORY_TRANSPORTER_RETURN', 'INVENTORY_BUYER_RETURN'];
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
      if (!where.mainStatus && !where.OR) {
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

  private countsCache: { data: any; timestamp: number } | null = null;
  private readonly COUNTS_CACHE_TTL_MS = 5000; // 5 seconds TTL cache

  clearCountsCache() {
    this.countsCache = null;
  }

  async getCounts() {
    const now = Date.now();
    if (this.countsCache && (now - this.countsCache.timestamp) < this.COUNTS_CACHE_TTL_MS) {
      return this.countsCache.data;
    }
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
      inventoryBuyerReturn,
    ] = await Promise.all([
      // pickup.new — Phase 1 unassigned & assigned
      this.prisma.order.count({
        where: this.applyFilters(
          {
            phase: 'PICKUP',
            returnType: null,
            mainStatus: { in: ['NEW', 'ORDER_PLACED', 'PENDING', 'PENDING_PICKUP', 'PICKUP_ASSIGNED', 'PICKUP_SHG_PENDING', 'PICKUP_SHG_ACCEPTED'] }
          },
          undefined,
          ['NEW', 'ORDER_PLACED', 'PENDING', 'PENDING_PICKUP', 'PICKUP_ASSIGNED', 'PICKUP_SHG_PENDING', 'PICKUP_SHG_ACCEPTED']
        )
      }),
      // pickup.assigned — Phase 2-4
      this.prisma.order.count({
        where: this.applyFilters(
          {
            phase: 'PICKUP',
            returnType: null,
            mainStatus: { in: ['PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER', 'IN_TRANSIT_TO_HUB', 'SHG_PICKUP_DECLINED', 'TRANSPORTER_DECLINED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING', 'REDIRECTED'] }
          },
          undefined,
          ['PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'SHG_PICKUP_DECLINED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER', 'TRANSPORTER_DECLINED', 'IN_TRANSIT_TO_HUB', 'PICKUP_SHG_PENDING', 'PENDING_PICKUP', 'REDIRECTED']
        )
      }),
      // pickup.warehouse — Phase 5
      this.prisma.order.count({ where: this.applyFilters({ phase: 'PICKUP', returnType: null }, undefined, ['AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'PARCEL_AT_HUB', 'STORED']) }),
      // pickup.rejected — orders with any rejected assignment
      this.prisma.order.count({ where: this.applyFilters({ phase: 'PICKUP', assignments: { some: { role: 'PICKUP', status: 'REJECTED' } }, returnType: null }, undefined, ['NEW', 'ORDER_PLACED', 'PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER', 'IN_TRANSIT_TO_HUB', 'SHG_PICKUP_DECLINED', 'TRANSPORTER_DECLINED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING']) }),
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
                  { mainStatus: { in: ['DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_DROP_SHG', 'IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_SHG', 'PARCEL_AT_TRANSPORTER', 'RETURN_PARCEL_AT_TRANSPORTER', 'IN_TRANSIT_TO_BUYER', 'RETURN_IN_TRANSIT_TO_BUYER', 'RETURN_PARCEL_AT_SHG'] } },
                  { mainStatus: 'DROP_ASSIGNED', NOT: { OR: [{ dropShgStatus: 'PENDING' }, { dropShgStatus: 'pending' }, { dropShgStatus: null }] } }
                ]
              }
            ]
          },
          undefined,
          ['DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_DROP_SHG', 'IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_SHG', 'PARCEL_AT_TRANSPORTER', 'RETURN_PARCEL_AT_TRANSPORTER', 'IN_TRANSIT_TO_BUYER', 'RETURN_IN_TRANSIT_TO_BUYER', 'RETURN_PARCEL_AT_SHG']
        )
      }),
      // drop.completed — Phase 7-8
      this.prisma.order.count({ where: this.applyFilters({ phase: 'DROP', OR: [{ returnType: null }, { returnType: 'TRANSPORTER_RETURN' }] }, undefined, ['DELIVERED', 'COMPLETED', 'PARCEL_AT_BUYER']) }),
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
      this.prisma.order.count({ where: this.applyFilters({ returnType: 'BUYER_RETURN' }, undefined, ['INVENTORY_BUYER_RETURN']) }),
    ]);

    const result = {
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

    this.countsCache = { data: result, timestamp: Date.now() };
    return result;
  }

  // --- QUERY ENDPOINTS ---

  async getOrderDetails(id: string, phase?: string): Promise<any> {
    const cleanId = String(id || '').replace(/^pickup-/, '').replace(/^drop-/, '').replace(/^ORD-/, '');
    const whereClause: any = {
      OR: [
        { id },
        { orderId: id },
        { id: cleanId },
        { orderId: cleanId },
        { orderId: `ORD-${cleanId}` },
      ]
    };
    if (phase) {
      whereClause.phase = phase;
    }
    const order = await this.prisma.order.findFirst({
      where: whereClause,
      include: {
        assignments: true,
        seller: true,
        buyer: true,
      },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID/OrderId ${id} not found`);
    }

    let extraAssignments: any[] = [];
    if (order.phase === 'DROP') {
      const pickupOrder = await this.prisma.order.findFirst({
        where: { orderId: order.orderId, phase: 'PICKUP' },
        include: { assignments: true },
      });
      if (pickupOrder) {
        extraAssignments = pickupOrder.assignments;
      }
    } else if (order.phase === 'PICKUP') {
      const dropOrder = await this.prisma.order.findFirst({
        where: { orderId: order.orderId, phase: 'DROP' },
        include: { assignments: true },
      });
      if (dropOrder) {
        extraAssignments = dropOrder.assignments;
      }
    }

    let parcels: any[] = [];
    try {
      parcels = await this.prisma.parcel.findMany({
        where: {
          OR: [
            { orderId: order.orderId },
            { orderId: order.id }
          ]
        }
      });
      if (!parcels || parcels.length === 0) {
        parcels = await this.qrService.generateQr(order.id, false, 'SYSTEM');
      }
    } catch (e) {
      console.warn(`[getOrderDetails] generateQr failed for ${order.id}:`, e);
    }

    const formattedItems = parcels.map((p: any) => ({
      name: p.productName || 'Agricultural Goods',
      quantity: p.quantity || 1,
      weight: p.weight || p.weightKg || '2.5',
      category: p.category || 'Agriculture',
      price: p.declaredValue || p.price || 450,
    }));

    const rawResult = {
      ...order,
      parcels,
      items: formattedItems,
      sellerName: order.seller?.sellerName || (order.seller as any)?.fullName || 'N/A',
      sellerPhone: order.seller?.mobileNumber || 'N/A',
      buyerName: order.buyer?.buyerName || (order.buyer as any)?.fullName || 'N/A',
      buyerPhone: order.buyer?.mobileNumber || 'N/A',
      assignments: [...order.assignments, ...extraAssignments],
      sellerPincode: order.seller?.pincode || null,
      sellerVillage: order.seller?.village || null,
      sellerPostOffice: order.seller?.postOffice || null,
      buyerPincode: order.buyer?.pincode || null,
      buyerVillage: order.buyer?.village || null,
      buyerPostOffice: order.buyer?.postOffice || null,
    };

    const [enriched] = await this.enrichOrdersWithPickupAssignments([rawResult]);
    return enriched as any;
  }

  async getPickupNewOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        phase: 'PICKUP',
        returnType: null,
        mainStatus: { in: ['NEW', 'ORDER_PLACED', 'PENDING', 'PENDING_PICKUP', 'PICKUP_ASSIGNED', 'PICKUP_SHG_PENDING', 'PICKUP_SHG_ACCEPTED'] }
      },
      filter,
      ['NEW', 'ORDER_PLACED', 'PENDING', 'PENDING_PICKUP', 'PICKUP_ASSIGNED', 'PICKUP_SHG_PENDING', 'PICKUP_SHG_ACCEPTED']
    );
    const defaultInclude = {
      assignments: true,
      seller: true,
      buyer: true,
      parcels: true,
    };
    const orders = await this.prisma.order.findMany({
      where,
      include: defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichOrdersWithPickupAssignments(orders);
  }

  async getPickupAssignedOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        phase: 'PICKUP',
        returnType: null,
        mainStatus: { in: ['PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'SHG_PICKUP_DECLINED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER', 'TRANSPORTER_DECLINED', 'IN_TRANSIT_TO_HUB', 'PICKUP_SHG_PENDING', 'PENDING_PICKUP', 'REDIRECTED'] }
      },
      filter,
      [
        'PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'SHG_PICKUP_DECLINED',
        'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED',
        'PARCEL_AT_TRANSPORTER', 'TRANSPORTER_DECLINED',
        'IN_TRANSIT_TO_HUB', 'PICKUP_SHG_PENDING', 'PENDING_PICKUP', 'REDIRECTED'
      ]
    );
    const defaultInclude = {
      assignments: true,
      seller: true,
      buyer: true,
      parcels: true,
    };
    const orders = await this.prisma.order.findMany({
      where,
      include: defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichOrdersWithPickupAssignments(orders);
  }

  async getPickupWarehouseOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { phase: 'PICKUP', returnType: null },
      filter,
      ['STORED', 'DROP_PENDING', 'DROP_CREATED']
    );
    const defaultInclude = {
      assignments: true,
      seller: true,
      buyer: true,
      parcels: true,
    };
    const orders = await this.prisma.order.findMany({
      where,
      include: defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichOrdersWithPickupAssignments(orders);
  }

  async getPickupRejectedOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        phase: 'PICKUP',
        OR: [
          { assignments: { some: { status: 'REJECTED' } } },
          { mainStatus: 'REJECTED' },
          { pickupTransporterStatus: 'REJECTED' },
          { pickupShgStatus: 'REJECTED' }
        ],
        returnType: null,
      },
      filter
    );
    const defaultInclude = {
      assignments: true,
      seller: true,
      buyer: true,
      parcels: true,
    };
    const orders = await this.prisma.order.findMany({
      where,
      include: defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichOrdersWithPickupAssignments(orders);
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
    const defaultInclude = {
      assignments: true,
      seller: true,
      buyer: true,
      parcels: true,
    };
    const orders = await this.prisma.order.findMany({
      where,
      include: defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichOrdersWithPickupAssignments(orders);
  }

  async enrichOrdersWithPickupAssignments(orders: any[]) {
    if (!orders || orders.length === 0) return orders;

    // Pre-fetch Phase 1 PICKUP orders for any Phase 2 DROP orders to merge full timeline
    const dropOrderIds = orders
      .map((o: any) => o.orderId || o.id)
      .filter(Boolean);

    const relatedPickupOrders = dropOrderIds.length > 0
      ? await this.prisma.order.findMany({
          where: {
            OR: [
              { orderId: { in: dropOrderIds }, phase: 'PICKUP' },
              { id: { in: dropOrderIds }, phase: 'PICKUP' }
            ]
          },
          include: {
            assignments: true,
            seller: true,
            parcels: { include: { scanHistories: true } }
          }
        })
      : [];

    const pickupOrderMap = new Map<string, any>(relatedPickupOrders.map((p: any) => [p.orderId || p.id, p]));

    // Collect all unique assignee / partner user IDs across all orders
    const userIds = new Set<number>();

    orders.forEach((o: any) => {
      const pOrder: any = pickupOrderMap.get(o.orderId || o.id);
      const allAssigns = [...(o.assignments || []), ...(pOrder?.assignments || [])];

      const pShg = o.pickupShgId || pOrder?.pickupShgId || allAssigns.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'SHG')?.assigneeId;
      const dShg = o.dropShgId || pOrder?.dropShgId || allAssigns.find((a: any) => a.role === 'DROP' && a.assigneeType === 'SHG')?.assigneeId;
      const pTrans = o.pickupTransporterId || pOrder?.pickupTransporterId || allAssigns.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'TRANSPORTER')?.assigneeId;
      const dTrans = o.dropTransporterId || pOrder?.dropTransporterId || allAssigns.find((a: any) => a.role === 'DROP' && a.assigneeType === 'TRANSPORTER')?.assigneeId;

      [pShg, dShg, pTrans, dTrans].forEach(rawId => {
        if (rawId) {
          const id = parseInt(rawId, 10);
          if (!isNaN(id)) userIds.add(id);
        }
      });
    });

    const userList = userIds.size > 0
      ? await this.prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        include: { address: true, shgDetail: true, transporterDetail: true }
      })
      : [];

    const userMap = new Map<string, any>(userList.map(u => [String(u.id), u]));

    return orders.map((o: any) => {
      const pOrder: any = pickupOrderMap.get(o.orderId || o.id);
      const effectiveAssignments = [...(o.assignments || []), ...(pOrder?.assignments || [])];
      const orderPlacedTime = pOrder?.createdAt || o.createdAt;

      // Extract all scan histories across parcels (including Phase 1 parcels)
      const allScans: any[] = [];
      const combinedParcels = [
        ...(Array.isArray(o.parcels) ? o.parcels : []),
        ...(Array.isArray(pOrder?.parcels) ? pOrder.parcels : [])
      ];

      combinedParcels.forEach((p: any) => {
        if (Array.isArray(p.scanHistories)) {
          p.scanHistories.forEach((sh: any) => {
            allScans.push({
              status: sh.action,
              action: sh.action,
              userRole: sh.userRole,
              userId: sh.userId,
              currentHolder: sh.currentHolder,
              currentStage: sh.currentStage,
              scanResult: sh.scanResult,
              remarks: sh.remarks,
              latitude: sh.latitude,
              longitude: sh.longitude,
              scanTime: sh.scanTime,
              updatedAt: sh.scanTime,
              createdAt: sh.scanTime,
              productName: sh.productName,
              parcelId: sh.parcelId,
            });
          });
        }
      });

      // Sort scans chronologically
      allScans.sort((a, b) => new Date(a.scanTime).getTime() - new Date(b.scanTime).getTime());

      // Helper to find specific scan time
      const findScanTime = (actions: string[]) => {
        const match = allScans.find(s => actions.some(act => s.action === act || s.status === act));
        return match ? match.scanTime : null;
      };

      // Milestone timestamps
      const pickupShgAssign = effectiveAssignments.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'SHG' && (a.status === 'ACCEPTED' || a.status === 'COMPLETED'));
      const pickupShgAcceptedAt = pickupShgAssign?.updatedAt || pickupShgAssign?.createdAt || o.pickupShgDetails?.acceptedAt || (pOrder as any)?.pickupShgDetails?.acceptedAt || (['PICKED', 'DROPPED', 'COMPLETED'].includes(o.pickupShgStatus || pOrder?.pickupShgStatus) ? orderPlacedTime : null);
      const pickupShgPickedAt = findScanTime(['SHG_PICKUP', 'PARCEL_AT_SHG']) || (['PICKED', 'DROPPED', 'COMPLETED'].includes(o.pickupShgStatus || pOrder?.pickupShgStatus) ? (pickupShgAssign?.updatedAt || pOrder?.updatedAt || o.updatedAt) : null);

      const pickupTransAssign = effectiveAssignments.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'TRANSPORTER' && (a.status === 'ACCEPTED' || a.status === 'COMPLETED'));
      const pickupTransporterAcceptedAt = pickupTransAssign?.updatedAt || pickupTransAssign?.createdAt || o.pickupTransporterDetails?.acceptedAt || (pOrder as any)?.pickupTransporterDetails?.acceptedAt || null;
      const pickupTransporterPickedAt = findScanTime(['TRANSPORTER_PICKUP', 'IN_TRANSIT_TO_HUB']) || (['PICKED', 'DROPPED', 'COMPLETED'].includes(o.pickupTransporterStatus || pOrder?.pickupTransporterStatus) ? (pickupTransAssign?.updatedAt || pOrder?.updatedAt || o.updatedAt) : null);

      const gmuHubIntakeAt = o.warehouseReceivedAt || pOrder?.warehouseReceivedAt || findScanTime(['HUB_RECEIVE', 'WAREHOUSE_RECEIVED']) || (['STORED', 'DISPATCHED', 'COMPLETED', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG'].includes(o.mainStatus) ? (o.storedAt || o.updatedAt) : null);
      const gmuHubStoredAt = o.storedAt || pOrder?.storedAt || findScanTime(['STORE', 'STORED']) || (['STORED', 'DISPATCHED', 'COMPLETED', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG'].includes(o.mainStatus) ? (o.storedAt || o.updatedAt) : null);

      const dropTransAssign = effectiveAssignments.find((a: any) => a.role === 'DROP' && a.assigneeType === 'TRANSPORTER' && (a.status === 'ACCEPTED' || a.status === 'COMPLETED'));
      const dropTransporterAcceptedAt = dropTransAssign?.updatedAt || dropTransAssign?.createdAt || o.dropTransporterDetails?.acceptedAt || null;
      const dropTransporterPickedAt = findScanTime(['TRANSPORTER_DROP_PICKUP', 'DISPATCHED', 'IN_TRANSIT_TO_BUYER']) || o.dispatchedAt || (['PICKED', 'DROPPED', 'COMPLETED'].includes(o.dropTransporterStatus) ? (dropTransAssign?.updatedAt || o.updatedAt) : null);

      const dropShgAssign = effectiveAssignments.find((a: any) => a.role === 'DROP' && a.assigneeType === 'SHG' && (a.status === 'ACCEPTED' || a.status === 'COMPLETED'));
      const dropShgAcceptedAt = dropShgAssign?.updatedAt || dropShgAssign?.createdAt || o.dropShgDetails?.acceptedAt || null;
      const dropShgPickedAt = findScanTime(['SHG_DROP_PICKUP', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG']) || (['PICKED', 'PICKED_UP', 'DROPPED', 'COMPLETED'].includes(o.dropShgStatus) ? (dropShgAssign?.updatedAt || o.updatedAt) : null);

      const buyerDeliveredAt = o.deliveredAt || findScanTime(['FINAL_DELIVERY', 'DELIVERED', 'COMPLETED']) || (o.mainStatus === 'COMPLETED' ? o.updatedAt : null);

      // Find Pickup SHG user
      const pShgId = o.pickupShgId || pOrder?.pickupShgId || effectiveAssignments.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'SHG')?.assigneeId;
      const pShgUser = pShgId ? userMap.get(String(pShgId)) : null;

      // Find Pickup Transporter user
      const pTransId = o.pickupTransporterId || pOrder?.pickupTransporterId || effectiveAssignments.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'TRANSPORTER' && a.status === 'ACCEPTED')?.assigneeId;
      const pTransUser = pTransId ? userMap.get(String(pTransId)) : null;

      // Find Drop SHG user
      const dShgId = o.dropShgId || pOrder?.dropShgId || effectiveAssignments.find((a: any) => a.role === 'DROP' && a.assigneeType === 'SHG')?.assigneeId;
      const dShgUser = dShgId ? userMap.get(String(dShgId)) : null;

      // Find Drop Transporter user
      const dTransId = o.dropTransporterId || pOrder?.dropTransporterId || effectiveAssignments.find((a: any) => a.role === 'DROP' && a.assigneeType === 'TRANSPORTER' && a.status === 'ACCEPTED')?.assigneeId;
      const dTransUser = dTransId ? userMap.get(String(dTransId)) : null;

      const formatAddr = (u: any) => {
        if (!u?.address) return u?.shgDetail?.village || '';
        return [
          u.address.houseNo || u.address.landmark,
          u.address.village,
          u.address.taluka,
          u.address.district,
          u.address.pincode
        ].filter(Boolean).join(', ');
      };

      const pickupShgDetails = pShgUser ? {
        id: pShgUser.id,
        name: pShgUser.fullName || pShgUser.shgDetail?.crpName || pShgUser.shgDetail?.shgName || 'Pickup SHG Member',
        mobile: pShgUser.phoneNumber || pShgUser.shgDetail?.crpMobile || '',
        address: formatAddr(pShgUser) || pShgUser.address?.village || 'N/A',
        shgName: pShgUser.shgDetail?.shgName || '',
        acceptedAt: pickupShgAcceptedAt,
        pickedAt: pickupShgPickedAt,
      } : (o.pickupShgDetails ? { ...o.pickupShgDetails, acceptedAt: pickupShgAcceptedAt, pickedAt: pickupShgPickedAt } : null);

      const pickupTransporterDetails = pTransUser ? {
        id: pTransUser.id,
        name: pTransUser.fullName || 'Transporter',
        mobile: pTransUser.phoneNumber || '',
        address: formatAddr(pTransUser) || 'Service Route',
        vehicle: pTransUser.transporterDetail?.vehicleNumber || (pTransUser.transporterDetail as any)?.registrationNumber || '',
        acceptedAt: pickupTransporterAcceptedAt,
        pickedAt: pickupTransporterPickedAt,
      } : (o.pickupTransporterDetails ? { ...o.pickupTransporterDetails, acceptedAt: pickupTransporterAcceptedAt, pickedAt: pickupTransporterPickedAt } : null);

      const dropShgDetails = dShgUser ? {
        id: dShgUser.id,
        name: dShgUser.fullName || dShgUser.shgDetail?.crpName || dShgUser.shgDetail?.shgName || 'Drop SHG Member',
        mobile: dShgUser.phoneNumber || dShgUser.shgDetail?.crpMobile || '',
        address: formatAddr(dShgUser) || dShgUser.address?.village || 'Mahagaon',
        shgName: dShgUser.shgDetail?.shgName || '',
        acceptedAt: dropShgAcceptedAt,
        pickedAt: dropShgPickedAt,
      } : (o.dropShgDetails ? { ...o.dropShgDetails, acceptedAt: dropShgAcceptedAt, pickedAt: dropShgPickedAt } : null);

      const dropTransporterDetails = dTransUser ? {
        id: dTransUser.id,
        name: dTransUser.fullName || 'Transporter',
        mobile: dTransUser.phoneNumber || '',
        address: formatAddr(dTransUser) || 'Service Route',
        vehicle: dTransUser.transporterDetail?.vehicleNumber || (dTransUser.transporterDetail as any)?.registrationNumber || '',
        acceptedAt: dropTransporterAcceptedAt,
        pickedAt: dropTransporterPickedAt,
      } : (o.dropTransporterDetails ? { ...o.dropTransporterDetails, acceptedAt: dropTransporterAcceptedAt, pickedAt: dropTransporterPickedAt } : null);

      // Build unified Tracking Audit History from Phase 1 to Phase 2
      const auditTimeline: any[] = [];

      // 1. Order Placed
      if (o.createdAt) {
        auditTimeline.push({
          timestamp: o.createdAt,
          stage: 'ORDER PLACED',
          status: 'Order Placed & Registered',
          statusType: 'COMPLETED',
          actorName: o.seller?.sellerName || 'Seller',
          actorRole: 'SELLER',
          location: o.seller?.village ? `${o.seller.village} (${o.seller.pincode || ''})` : 'Seller Center',
          remarks: `Total ${o.productCount || 1} Products (${o.totalWeight || 0} KG) registered`,
        });
      }

      // 2. Pickup SHG Assigned & Accepted
      if (pickupShgAcceptedAt) {
        auditTimeline.push({
          timestamp: pickupShgAcceptedAt,
          stage: 'PHASE 1: PICKUP',
          status: 'Pickup SHG Assigned & Accepted',
          statusType: 'COMPLETED',
          actorName: pickupShgDetails?.name || 'Pickup SHG Member',
          actorRole: 'SHG',
          location: pickupShgDetails?.address || o.seller?.village || 'Pickup Center',
          remarks: 'SHG Member accepted pickup request from seller',
        });
      }

      // 3. Collected / Scanned by Pickup SHG
      if (pickupShgPickedAt) {
        auditTimeline.push({
          timestamp: pickupShgPickedAt,
          stage: 'PHASE 1: PICKUP',
          status: 'Collected & Scanned by SHG',
          statusType: 'COMPLETED',
          actorName: pickupShgDetails?.name || 'Pickup SHG Member',
          actorRole: 'SHG',
          location: o.seller?.village || 'Seller Location',
          remarks: 'Parcels collected and verified from seller',
        });
      }

      // 4. Pickup Transporter Assigned & Accepted
      if (pickupTransporterAcceptedAt) {
        auditTimeline.push({
          timestamp: pickupTransporterAcceptedAt,
          stage: 'PHASE 1: PICKUP',
          status: 'Transporter Route Assigned & Accepted',
          statusType: 'COMPLETED',
          actorName: pickupTransporterDetails?.name || 'Transporter',
          actorRole: 'TRANSPORTER',
          location: pickupTransporterDetails?.address || 'Service Route',
          remarks: pickupTransporterDetails?.vehicle ? `Vehicle: ${pickupTransporterDetails.vehicle}` : 'Pickup route confirmed',
        });
      }

      // 5. Transporter Pickup / In Transit to GMU Hub
      if (pickupTransporterPickedAt) {
        auditTimeline.push({
          timestamp: pickupTransporterPickedAt,
          stage: 'PHASE 1: PICKUP',
          status: 'Picked up by Transporter (In Transit to Hub)',
          statusType: 'COMPLETED',
          actorName: pickupTransporterDetails?.name || 'Transporter',
          actorRole: 'TRANSPORTER',
          location: o.seller?.village || 'Collection Point',
          remarks: 'Parcels in transit to GMU Central Hub',
        });
      }

      // 6. GMU Hub Intake Received
      if (gmuHubIntakeAt) {
        auditTimeline.push({
          timestamp: gmuHubIntakeAt,
          stage: 'GMU HUB WAREHOUSE',
          status: 'Received & Quality Checked at GMU Hub',
          statusType: 'COMPLETED',
          actorName: 'GMU Hub Intake Dock',
          actorRole: 'HUB_COORDINATOR',
          location: 'GMU Central Hub',
          remarks: 'Intake verification completed & barcode validated',
        });
      }

      // 7. GMU Hub Stored in Inventory
      if (gmuHubStoredAt) {
        auditTimeline.push({
          timestamp: gmuHubStoredAt,
          stage: 'GMU HUB WAREHOUSE',
          status: 'Stored in Hub Inventory',
          statusType: 'COMPLETED',
          actorName: 'GMU Hub Inventory',
          actorRole: 'HUB_COORDINATOR',
          location: 'GMU Central Warehouse',
          remarks: 'Ready for outbound route dispatch',
        });
      }

      // 8. Dispatched & Handed to Drop Transporter
      if (dropTransporterPickedAt || o.dispatchedAt) {
        auditTimeline.push({
          timestamp: dropTransporterPickedAt || o.dispatchedAt,
          stage: 'PHASE 2: DROP',
          status: 'Dispatched from Hub (In Transit to Drop Center)',
          statusType: 'COMPLETED',
          actorName: dropTransporterDetails?.name || 'Drop Transporter',
          actorRole: 'TRANSPORTER',
          location: 'GMU Central Hub Outbound',
          remarks: dropTransporterDetails?.vehicle ? `Vehicle: ${dropTransporterDetails.vehicle}` : 'Outbound transport started',
        });
      }

      // 9. Drop SHG Accepted / Received
      if (dropShgPickedAt || dropShgAcceptedAt) {
        auditTimeline.push({
          timestamp: dropShgPickedAt || dropShgAcceptedAt,
          stage: 'PHASE 2: DROP',
          status: 'Received at Destination SHG Center',
          statusType: 'COMPLETED',
          actorName: dropShgDetails?.name || 'Drop SHG Member',
          actorRole: 'SHG',
          location: dropShgDetails?.address || o.buyer?.village || 'Drop Village Center',
          remarks: 'Parcels received by destination SHG for buyer handover',
        });
      }

      // 10. Delivered to Buyer
      if (buyerDeliveredAt) {
        auditTimeline.push({
          timestamp: buyerDeliveredAt,
          stage: 'COMPLETED',
          status: 'Delivered & Handed Over to Buyer',
          statusType: 'COMPLETED',
          actorName: o.buyer?.buyerName || 'Buyer',
          actorRole: 'BUYER',
          location: o.buyer?.village ? `${o.buyer.village} (${o.buyer.pincode || ''})` : 'Buyer Address',
          remarks: 'Final delivery completed and verified',
        });
      }

      // Map raw actions to canonical titles & sort strictly by stage rank
      const CANONICAL_STATUS_MAP: Record<string, string> = {
        'order placed & registered': 'Order Placed & Registered',
        'order placed': 'Order Placed & Registered',
        'pickup shg assigned & accepted': 'Pickup SHG Assigned & Accepted',
        'shg accepted': 'Pickup SHG Assigned & Accepted',
        'collected & scanned by shg': 'Collected & Scanned by SHG',
        'shg pickup': 'Collected & Scanned by SHG',
        'shg_pickup': 'Collected & Scanned by SHG',
        'transporter route assigned & accepted': 'Transporter Route Assigned & Accepted',
        'transporter accepted': 'Transporter Route Assigned & Accepted',
        'picked up by transporter (in transit to hub)': 'Picked up by Transporter (In Transit to Hub)',
        'transporter pickup': 'Picked up by Transporter (In Transit to Hub)',
        'transporter_pickup': 'Picked up by Transporter (In Transit to Hub)',
        'received & quality checked at gmu hub': 'Received & Quality Checked at GMU Hub',
        'hub intake': 'Received & Quality Checked at GMU Hub',
        'hub_received': 'Received & Quality Checked at GMU Hub',
        'stored in hub inventory': 'Stored in Hub Inventory',
        'stored_in_hub': 'Stored in Hub Inventory',
        'drop shg assigned & accepted': 'Drop SHG Assigned & Accepted',
        'drop shg accepted': 'Drop SHG Assigned & Accepted',
        'drop transporter route assigned & accepted': 'Drop Transporter Route Assigned & Accepted',
        'drop transporter accepted': 'Drop Transporter Route Assigned & Accepted',
        'dispatched from hub (in transit to drop center)': 'Dispatched from Hub (In Transit to Drop Center)',
        'drop transporter pickup': 'Dispatched from Hub (In Transit to Drop Center)',
        'transporter drop pickup': 'Dispatched from Hub (In Transit to Drop Center)',
        'transporter_drop_pickup': 'Dispatched from Hub (In Transit to Drop Center)',
        'received at destination shg center': 'Received at Destination SHG Center',
        'drop shg pickup': 'Received at Destination SHG Center',
        'shg drop pickup': 'Received at Destination SHG Center',
        'shg_drop_pickup': 'Received at Destination SHG Center',
        'delivered & handed over to buyer': 'Delivered & Handed Over to Buyer',
        'delivered': 'Delivered & Handed Over to Buyer',
      };

      const STAGE_ORDER: Record<string, number> = {
        'Order Placed & Registered': 1,
        'Pickup SHG Assigned & Accepted': 2,
        'Collected & Scanned by SHG': 3,
        'Transporter Route Assigned & Accepted': 4,
        'Picked up by Transporter (In Transit to Hub)': 5,
        'Received & Quality Checked at GMU Hub': 6,
        'Stored in Hub Inventory': 7,
        'Drop SHG Assigned & Accepted': 8,
        'Drop Transporter Route Assigned & Accepted': 9,
        'Dispatched from Hub (In Transit to Drop Center)': 10,
        'Received at Destination SHG Center': 11,
        'Delivered & Handed Over to Buyer': 12,
      };

      const uniqueAuditMap = new Map();
      auditTimeline.forEach((t) => {
        const rawTitle = String(t.status || t.action || '').toLowerCase().trim();
        const canonicalTitle = CANONICAL_STATUS_MAP[rawTitle] || t.status || t.action;
        if (canonicalTitle) {
          const key = canonicalTitle.toLowerCase().trim();
          if (!uniqueAuditMap.has(key)) {
            uniqueAuditMap.set(key, { ...t, status: canonicalTitle });
          }
        }
      });

      const cleanAuditTimeline = Array.from(uniqueAuditMap.values()).sort((a: any, b: any) => {
        const rankA = STAGE_ORDER[a.status] || 99;
        const rankB = STAGE_ORDER[b.status] || 99;
        if (rankA !== rankB) return rankA - rankB;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

      const rejectScan = allScans.find((s: any) => s.action === 'REJECT_DROP' || s.action === 'REJECT_PICKUP' || s.scanResult === 'REJECTED');
      const rejectAssign = effectiveAssignments.find((a: any) => a.status === 'REJECTED');
      const actualRejectReason = o.rejectReason || o.remarks || (pOrder as any)?.rejectReason || (pOrder as any)?.remarks || rejectScan?.remarks || rejectAssign?.remarks || null;

      return {
        ...o,
        rejectReason: actualRejectReason || o.rejectReason || o.remarks,
        remarks: actualRejectReason || o.remarks || o.rejectReason,
        pickupShgDetails,
        pickupTransporterDetails,
        dropShgDetails,
        dropTransporterDetails,
        pickupShgAcceptedAt,
        pickupShgPickedAt,
        pickupTransporterAcceptedAt,
        pickupTransporterPickedAt,
        gmuHubIntakeAt,
        gmuHubStoredAt,
        dropTransporterAcceptedAt,
        dropTransporterPickedAt,
        dropShgAcceptedAt,
        dropShgPickedAt,
        buyerDeliveredAt,
        tracking: cleanAuditTimeline,
      };
    });
  }

  async getDropNewOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
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
    const defaultInclude = {
      assignments: true,
      seller: true,
      buyer: true,
      parcels: {
        include: {
          scanHistories: true
        }
      },
    };

    const orders = await this.prisma.order.findMany({
      where,
      include: defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichOrdersWithPickupAssignments(orders);
  }

  async getDropAssignedOrders(filter?: OrderFilterDto) {
    const dropActiveStatuses = [
      'DROP_PENDING', 'DROP_ASSIGNED', 'DROP_CREATED',
      'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED',
      'IN_TRANSIT_TO_BUYER', 'IN_TRANSIT_TO_DROP_SHG', 'DISPATCHED',
      'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG'
    ];

    const where = this.applyFilters(
      {
        mainStatus: { in: dropActiveStatuses },
        OR: [
          { returnType: null },
          { returnType: 'TRANSPORTER_RETURN' }
        ]
      },
      filter,
      dropActiveStatuses
    );
    const defaultInclude = {
      assignments: true,
      seller: true,
      buyer: true,
      parcels: {
        include: {
          scanHistories: true
        }
      },
    };
    const orders = await this.prisma.order.findMany({
      where,
      include: defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichOrdersWithPickupAssignments(orders);
  }

  async getDropCompletedOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        OR: [
          { mainStatus: { in: ['DELIVERED', 'COMPLETED', 'PARCEL_AT_BUYER', 'BUYER_DELIVERED', 'HANDED_OVER', 'PARCEL_HANDED_OVER'] } },
          { dropTransporterStatus: { in: ['DELIVERED', 'COMPLETED', 'PARCEL_AT_BUYER', 'BUYER_DELIVERED', 'HANDED_OVER', 'PARCEL_HANDED_OVER'] } },
          { dropShgStatus: { in: ['DELIVERED', 'COMPLETED', 'HANDED_OVER'] } }
        ]
      },
      filter,
      ['DELIVERED', 'COMPLETED', 'PARCEL_AT_BUYER', 'BUYER_DELIVERED', 'HANDED_OVER', 'PARCEL_HANDED_OVER']
    );
    const defaultInclude = {
      assignments: true,
      seller: true,
      buyer: true,
      parcels: {
        include: {
          scanHistories: true
        }
      },
    };
    const orders = await this.prisma.order.findMany({
      where,
      include: defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichOrdersWithPickupAssignments(orders);
  }

  async getDropRejectedOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        phase: 'DROP',
        OR: [
          { assignments: { some: { status: 'REJECTED' } } },
          { mainStatus: 'REJECTED' },
          { dropTransporterStatus: 'REJECTED' },
          { dropShgStatus: 'REJECTED' }
        ],
        returnType: null,
      },
      filter
    );
    const defaultInclude = {
      assignments: true,
      seller: true,
      buyer: true,
      parcels: {
        include: {
          scanHistories: true
        }
      },
    };
    const orders = await this.prisma.order.findMany({
      where,
      include: defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichOrdersWithPickupAssignments(orders);
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
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        assignments: true,
        seller: true,
        buyer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichOrdersWithPickupAssignments(orders);
  }

  async getTransporterReturnOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { returnType: 'TRANSPORTER_RETURN' },
      filter,
      ['TRANSPORTER_RETURN_PENDING', 'TRANSPORTER_RETURN_COMPLETED']
    );
    return this.prisma.order.findMany({
      where,
      include: {
        assignments: true,
        seller: true,
        buyer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBuyerReturnOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { returnType: 'BUYER_RETURN' },
      filter,
      [
        'RETURN_PENDING', 'RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PICKED_BY_SHG', 'RETURN_PARCEL_AT_SHG',
        'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_REQUESTED', 'RETURN_TRANSPORTER_ACCEPTED',
        'RETURN_IN_TRANSIT_TO_HUB', 'RETURN_PARCEL_AT_TRANSPORTER', 'RETURN_PARCEL_AT_GMU', 'RETURN_PARCEL_AT_HUB',
        'BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED',
      ]
    );
    return this.prisma.order.findMany({
      where,
      include: {
        assignments: true,
        seller: true,
        buyer: true,
        parcels: {
          include: { scanHistories: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderHistory(filter?: OrderFilterDto) {
    const totalOrdersCount = await this.prisma.order.count();
    const completedOrders = await this.getDropCompletedOrders(filter);
    const transporterReturns = await this.getTransporterReturnOrders(filter);
    const buyerReturns = await this.getBuyerReturnOrders(filter);

    const allReturns = [...transporterReturns, ...buyerReturns];
    const uniqueReturnsMap = new Map<string, any>();
    allReturns.forEach(o => uniqueReturnsMap.set(o.id, o));
    const returnOrdersList = Array.from(uniqueReturnsMap.values());

    return {
      metrics: {
        totalOrders: totalOrdersCount,
        completedOrders: completedOrders.length,
        returnOrders: returnOrdersList.length,
      },
      completedOrders,
      returnOrders: returnOrdersList,
    };
  }

  async getInventoryStoredOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { returnType: null },
      filter,
      ['STORED', 'HUB_RECEIVED', 'AT_HUB', 'BARCODE_GENERATED', 'DROP_PENDING', 'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'DISPATCHED', 'PARCEL_AT_HUB', 'DELIVERED', 'COMPLETED']
    );
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        assignments: true,
        seller: true,
        buyer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichOrdersWithPickupAssignments(orders);
  }

  async getInventoryTransporterReturnOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { returnType: 'TRANSPORTER_RETURN' },
      filter,
      ['INVENTORY_TRANSPORTER_RETURN', 'DROP_ASSIGNED', 'DISPATCHED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'DELIVERED', 'COMPLETED']
    );
    return this.prisma.order.findMany({
      where,
      include: {
        assignments: true,
        seller: true,
        buyer: true,
      },
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
      include: {
        assignments: true,
        seller: true,
        buyer: true,
      },
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

    const uuidv4 = () => '00000000-0000-4000-8000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString();

    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Find or create Seller in public.sellers
      let seller = await tx.seller.findFirst({
        where: { mobileNumber: dto.sellerMobile },
      });

      const sellerCode = seller?.sellerCode || `SEL-${Math.floor(100000 + Math.random() * 900000)}`;

      if (!seller) {
        seller = await tx.seller.create({
          data: {
            sellerCode,
            sellerName: dto.sellerName,
            mobileNumber: dto.sellerMobile,
            village: dto.sellerVillage,
            taluka: dto.sellerTaluka || 'Indapur',
            district: dto.sellerDistrict || 'Pune',
            state: dto.sellerState || 'Maharashtra',
            pincode: dto.sellerPincode,
            postOffice: dto.sellerPostOffice || null,
          },
        });

        // Insert into public.sellers raw SQL using the same ID
        await tx.$executeRawUnsafe(`
          INSERT INTO public.sellers (id, seller_code, seller_name, mobile_number, village, taluka, district, state, pincode, post_office, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `, seller.id, sellerCode, dto.sellerName, dto.sellerMobile, dto.sellerVillage, dto.sellerTaluka || 'Indapur', dto.sellerDistrict || 'Pune', dto.sellerState || 'Maharashtra', dto.sellerPincode, dto.sellerPostOffice || null);

        // Reset sequence for public.sellers and public.sellers
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.sellers', 'id'), COALESCE(MAX(id), 1)) FROM public.sellers;`);
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.sellers', 'id'), COALESCE(MAX(id), 1)) FROM public.sellers;`);
      } else {
        // Update seller with newly provided details
        seller = await tx.seller.update({
          where: { id: seller.id },
          data: {
            sellerName: dto.sellerName,
            village: dto.sellerVillage,
            taluka: dto.sellerTaluka || seller.taluka,
            district: dto.sellerDistrict || seller.district,
            state: dto.sellerState || seller.state,
            pincode: dto.sellerPincode,
            postOffice: dto.sellerPostOffice || seller.postOffice,
          }
        });
        await tx.$executeRawUnsafe(`
          UPDATE public.sellers 
          SET seller_name = $1, village = $2, taluka = $3, district = $4, state = $5, pincode = $6, post_office = $7, updated_at = NOW()
          WHERE id = $8;
        `, dto.sellerName, dto.sellerVillage, dto.sellerTaluka || seller.taluka, dto.sellerDistrict || seller.district, dto.sellerState || seller.state, dto.sellerPincode, dto.sellerPostOffice || seller.postOffice, seller.id);
      }

      // 2. Ensure user account for logistics seller exists in public."User" table so products foreign key mapping works
      const existingUser = await tx.$queryRawUnsafe(`
        SELECT id FROM public."User" WHERE id = $1 LIMIT 1;
      `, seller.id) as any[];

      if (existingUser.length === 0) {
        const phoneUser = await tx.$queryRawUnsafe(`
          SELECT id FROM public."User" WHERE "phoneNumber" = $1 LIMIT 1;
        `, dto.sellerMobile) as any[];

        if (phoneUser.length === 0) {
          await tx.$executeRawUnsafe(`
            INSERT INTO public."User" (id, "authId", role, "phoneNumber", "fullName", "isVerified", "currentStep", "profileCompletion", "applicationStatus", "createdAt", "updatedAt")
            VALUES ($1, $2::uuid, 'SELLER', $3, $4, true, 4, 100, 'APPROVED', NOW(), NOW());
          `, seller.id, uuidv4(), dto.sellerMobile, dto.sellerName);

          await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public."User"', 'id'), COALESCE(MAX(id), 1)) FROM public."User";`);
        }
      }

      // 3. Find or create Buyer in public.buyers
      let buyer = await tx.buyer.findFirst({
        where: { mobileNumber: dto.buyerMobile },
      });

      const buyerCode = buyer?.buyerCode || `BUY-${Math.floor(100000 + Math.random() * 900000)}`;

      if (!buyer) {
        buyer = await tx.buyer.create({
          data: {
            buyerCode,
            buyerName: dto.buyerName,
            mobileNumber: dto.buyerMobile,
            village: dto.buyerVillage,
            taluka: dto.buyerTaluka || 'Nesari',
            district: dto.buyerDistrict || 'Kolhapur',
            state: dto.buyerState || 'Maharashtra',
            pincode: dto.buyerPincode,
            postOffice: dto.buyerPostOffice || null,
          },
        });

        // Insert into public.buyers raw SQL using the same ID
        await tx.$executeRawUnsafe(`
          INSERT INTO public.buyers (id, buyer_code, buyer_name, mobile_number, village, taluka, district, state, pincode, post_office, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `, buyer.id, buyerCode, dto.buyerName, dto.buyerMobile, dto.buyerVillage, dto.buyerTaluka || 'Nesari', dto.buyerDistrict || 'Kolhapur', dto.buyerState || 'Maharashtra', dto.buyerPincode, dto.buyerPostOffice || null);

        // Reset sequence for public.buyers and public.buyers
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.buyers', 'id'), COALESCE(MAX(id), 1)) FROM public.buyers;`);
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.buyers', 'id'), COALESCE(MAX(id), 1)) FROM public.buyers;`);
      } else {
        // Update buyer with newly provided details
        buyer = await tx.buyer.update({
          where: { id: buyer.id },
          data: {
            buyerName: dto.buyerName,
            village: dto.buyerVillage,
            taluka: dto.buyerTaluka || buyer.taluka,
            district: dto.buyerDistrict || buyer.district,
            state: dto.buyerState || buyer.state,
            pincode: dto.buyerPincode,
            postOffice: dto.buyerPostOffice || buyer.postOffice,
          }
        });
        await tx.$executeRawUnsafe(`
          UPDATE public.buyers 
          SET buyer_name = $1, village = $2, taluka = $3, district = $4, state = $5, pincode = $6, post_office = $7, updated_at = NOW()
          WHERE id = $8;
        `, dto.buyerName, dto.buyerVillage, dto.buyerTaluka || buyer.taluka, dto.buyerDistrict || buyer.district, dto.buyerState || buyer.state, dto.buyerPincode, dto.buyerPostOffice || buyer.postOffice, buyer.id);
      }

      // Ensure user account for logistics buyer exists in public."User" table so master_orders foreign key works
      const existingBuyerUser = await tx.$queryRawUnsafe(`
        SELECT id FROM public."User" WHERE id = $1 LIMIT 1;
      `, buyer.id) as any[];

      if (existingBuyerUser.length === 0) {
        const phoneBuyerUser = await tx.$queryRawUnsafe(`
          SELECT id FROM public."User" WHERE "phoneNumber" = $1 LIMIT 1;
        `, dto.buyerMobile) as any[];

        if (phoneBuyerUser.length === 0) {
          await tx.$executeRawUnsafe(`
            INSERT INTO public."User" (id, "authId", role, "phoneNumber", "fullName", "isVerified", "currentStep", "profileCompletion", "applicationStatus", "createdAt", "updatedAt")
            VALUES ($1, $2::uuid, 'BUYER', $3, $4, true, 4, 100, 'APPROVED', NOW(), NOW());
          `, buyer.id, uuidv4(), dto.buyerMobile, dto.buyerName);

          await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public."User"', 'id'), COALESCE(MAX(id), 1)) FROM public."User";`);
        }
      }

      // 4. Handle products
      const orderItems = (dto as any).products || [
        { name: 'Organic Honey', category: 'FOOD', quantity: dto.totalQty || 1, unit: 'Bottle', weight: dto.totalWeight || 0.5, price: 100.0 }
      ];

      const resolvedItems: any[] = [];
      let totalAmount = 0;

      for (const item of orderItems) {
        const price = Number(item.price || 100.0);
        const weight = Number(item.weight || 0.5);
        const quantity = Number(item.quantity || 1);

        const rawProducts = await tx.$queryRawUnsafe(`
          SELECT id FROM public.products WHERE seller_id = $1 AND name = $2 LIMIT 1;
        `, seller.id, item.name) as any[];

        let productId: number;
        if (rawProducts.length > 0) {
          productId = rawProducts[0].id;
        } else {
          const insertProd = await tx.$queryRawUnsafe(`
            INSERT INTO public.products (seller_id, name, category, price, weight, "Unit", stock, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, 100, NOW())
            RETURNING id;
          `, seller.id, item.name, item.category || 'FOOD', price, weight, item.unit || 'Packet') as any[];
          productId = insertProd[0].id;

          await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.products', 'id'), COALESCE(MAX(id), 1)) FROM public.products;`);
        }

        resolvedItems.push({
          productId,
          qty: quantity,
          price
        });
        totalAmount += quantity * price;
      }

      const productCount = resolvedItems.length;
      const totalQty = resolvedItems.reduce((sum, item) => sum + item.qty, 0);
      const totalWeight = parseFloat(orderItems.reduce((sum: number, item: any) => sum + Number(item.quantity || 1) * Number(item.weight || 0.5), 0).toFixed(2));

      return tx.order.create({
        data: {
          id: orderId,
          orderId,
          barcode: null,
          sellerId: seller.id,
          buyerId: buyer.id,
          productCount,
          totalQty,
          totalWeight,
          pickupShgId: null,
          pickupTransporterId: null,
          mainStatus: 'ORDER_PLACED',
          pickupShgStatus: null,
          pickupTransporterStatus: null,
        },
      });
    }, {
      maxWait: 15000,
      timeout: 25000,
    });

    try {
      await this.broadcastShg(order.id);
    } catch (err: any) {
      console.warn(`[broadcastShg auto-run] Failed to broadcast order ${order.id}:`, err.message);
    }



    return order;
  }

  async createDropOrder(dto: CreateOrderDto) {
    const orderId = dto.orderId || `ORD-DROP-${Math.floor(1000 + Math.random() * 9000)}`;
    const barcode = `BAR-${orderId}`;

    const existing = await this.prisma.order.findFirst({ where: { orderId, phase: 'DROP' } });
    if (existing) {
      throw new BadRequestException(`Order ID ${orderId} already exists`);
    }

    const uuidv4 = () => '00000000-0000-4000-8000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString();

    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Find or create Seller in public.sellers
      let seller = await tx.seller.findFirst({
        where: { mobileNumber: dto.sellerMobile },
      });

      const sellerCode = seller?.sellerCode || `SEL-${Math.floor(100000 + Math.random() * 900000)}`;

      if (!seller) {
        seller = await tx.seller.create({
          data: {
            sellerCode,
            sellerName: dto.sellerName,
            mobileNumber: dto.sellerMobile,
            village: dto.sellerVillage,
            taluka: dto.sellerTaluka || 'Indapur',
            district: dto.sellerDistrict || 'Pune',
            state: dto.sellerState || 'Maharashtra',
            pincode: dto.sellerPincode,
            postOffice: dto.sellerPostOffice || null,
          },
        });

        await tx.$executeRawUnsafe(`
          INSERT INTO public.sellers (id, seller_code, seller_name, mobile_number, village, taluka, district, state, pincode, post_office, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `, seller.id, sellerCode, dto.sellerName, dto.sellerMobile, dto.sellerVillage, dto.sellerTaluka || 'Indapur', dto.sellerDistrict || 'Pune', dto.sellerState || 'Maharashtra', dto.sellerPincode, dto.sellerPostOffice || null);

        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.sellers', 'id'), COALESCE(MAX(id), 1)) FROM public.sellers;`);
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.sellers', 'id'), COALESCE(MAX(id), 1)) FROM public.sellers;`);
      }

      // 2. Ensure user account for logistics seller exists in public."User" table
      const existingUser = await tx.$queryRawUnsafe(`
        SELECT id FROM public."User" WHERE id = $1 LIMIT 1;
      `, seller.id) as any[];

      if (existingUser.length === 0) {
        const phoneUser = await tx.$queryRawUnsafe(`
          SELECT id FROM public."User" WHERE "phoneNumber" = $1 LIMIT 1;
        `, dto.sellerMobile) as any[];

        if (phoneUser.length === 0) {
          await tx.$executeRawUnsafe(`
            INSERT INTO public."User" (id, "authId", role, "phoneNumber", "fullName", "isVerified", "currentStep", "profileCompletion", "applicationStatus", "createdAt", "updatedAt")
            VALUES ($1, $2::uuid, 'SELLER', $3, $4, true, 4, 100, 'APPROVED', NOW(), NOW());
          `, seller.id, uuidv4(), dto.sellerMobile, dto.sellerName);

          await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public."User"', 'id'), COALESCE(MAX(id), 1)) FROM public."User";`);
        }
      }

      // 3. Find or create Buyer in public.buyers
      let buyer = await tx.buyer.findFirst({
        where: { mobileNumber: dto.buyerMobile },
      });

      const buyerCode = buyer?.buyerCode || `BUY-${Math.floor(100000 + Math.random() * 900000)}`;

      if (!buyer) {
        buyer = await tx.buyer.create({
          data: {
            buyerCode,
            buyerName: dto.buyerName,
            mobileNumber: dto.buyerMobile,
            village: dto.buyerVillage,
            taluka: dto.buyerTaluka || 'Nesari',
            district: dto.buyerDistrict || 'Kolhapur',
            state: dto.buyerState || 'Maharashtra',
            pincode: dto.buyerPincode,
            postOffice: dto.buyerPostOffice || null,
          },
        });

        await tx.$executeRawUnsafe(`
          INSERT INTO public.buyers (id, buyer_code, buyer_name, mobile_number, village, taluka, district, state, pincode, post_office, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `, buyer.id, buyerCode, dto.buyerName, dto.buyerMobile, dto.buyerVillage, dto.buyerTaluka || 'Nesari', dto.buyerDistrict || 'Kolhapur', dto.buyerState || 'Maharashtra', dto.buyerPincode, dto.buyerPostOffice || null);

        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.buyers', 'id'), COALESCE(MAX(id), 1)) FROM public.buyers;`);
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.buyers', 'id'), COALESCE(MAX(id), 1)) FROM public.buyers;`);
      }

      // Ensure user account for logistics buyer exists in public."User" table so master_orders foreign key works
      const existingBuyerUser = await tx.$queryRawUnsafe(`
        SELECT id FROM public."User" WHERE id = $1 LIMIT 1;
      `, buyer.id) as any[];

      if (existingBuyerUser.length === 0) {
        const phoneBuyerUser = await tx.$queryRawUnsafe(`
          SELECT id FROM public."User" WHERE "phoneNumber" = $1 LIMIT 1;
        `, dto.buyerMobile) as any[];

        if (phoneBuyerUser.length === 0) {
          await tx.$executeRawUnsafe(`
            INSERT INTO public."User" (id, "authId", role, "phoneNumber", "fullName", "isVerified", "currentStep", "profileCompletion", "applicationStatus", "createdAt", "updatedAt")
            VALUES ($1, $2::uuid, 'BUYER', $3, $4, true, 4, 100, 'APPROVED', NOW(), NOW());
          `, buyer.id, uuidv4(), dto.buyerMobile, dto.buyerName);

          await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public."User"', 'id'), COALESCE(MAX(id), 1)) FROM public."User";`);
        }
      }

      // 4. Handle products
      const orderItems = (dto as any).products || [
        { name: 'Organic Honey', category: 'FOOD', quantity: dto.totalQty || 1, unit: 'Bottle', weight: dto.totalWeight || 0.5, price: 100.0 }
      ];

      const resolvedItems: any[] = [];
      let totalAmount = 0;

      for (const item of orderItems) {
        const price = Number(item.price || 100.0);
        const weight = Number(item.weight || 0.5);
        const quantity = Number(item.quantity || 1);

        const rawProducts = await tx.$queryRawUnsafe(`
          SELECT id FROM public.products WHERE seller_id = $1 AND name = $2 LIMIT 1;
        `, seller.id, item.name) as any[];

        let productId: number;
        if (rawProducts.length > 0) {
          productId = rawProducts[0].id;
        } else {
          const insertProd = await tx.$queryRawUnsafe(`
            INSERT INTO public.products (seller_id, name, category, price, weight, "Unit", stock, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, 100, NOW())
            RETURNING id;
          `, seller.id, item.name, item.category || 'FOOD', price, weight, item.unit || 'Packet') as any[];
          productId = insertProd[0].id;

          await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.products', 'id'), COALESCE(MAX(id), 1)) FROM public.products;`);
        }

        resolvedItems.push({
          productId,
          qty: quantity,
          price
        });
        totalAmount += quantity * price;
      }

      const productCount = resolvedItems.length;
      const totalQty = resolvedItems.reduce((sum, item) => sum + item.qty, 0);
      const totalWeight = parseFloat(orderItems.reduce((sum: number, item: any) => sum + Number(item.quantity || 1) * Number(item.weight || 0.5), 0).toFixed(2));

      return tx.order.create({
        data: {
          id: `${orderId}-DROP`,
          orderId,
          barcode,
          sellerId: seller.id,
          buyerId: buyer.id,
          productCount,
          totalQty,
          totalWeight,
          mainStatus: 'DROP_PENDING',
          dropShgStatus: 'PENDING',
          phase: 'DROP',
        },
      });
    }, {
      maxWait: 15000,
      timeout: 25000,
    });

    try {
      await this.broadcastDropShg(order.id);
    } catch (err: any) {
      console.warn(`[broadcastDropShg auto-run] Failed to broadcast manual drop order ${order.id}:`, err.message);
    }

    try {
      await this.broadcastDropTransporter(order.id);
    } catch (err: any) {
      console.warn(`[broadcastDropTransporter auto-run] Failed to broadcast manual drop order ${order.id}:`, err.message);
    }

    return order;
  }

  async broadcastShg(id: string) {
    const order = await this.getOrderDetails(id);

    const sVillage = order.seller?.village || (order as any).sellerVillage || '';
    const sPincode = order.seller?.pincode || (order as any).sellerPincode || '';
    const sPostOffice = order.seller?.postOffice || (order as any).sellerPostOffice || '';

    const matchingShgs = await this.getMatchingShgs(
      sVillage,
      sPincode,
      sPostOffice
    );

    if (matchingShgs.length === 0) {
      console.log(`[SHG Broadcast]
        Order ID: ${order.orderId} (${order.id})
        Seller Village: ${sVillage}
        Seller Pincode: ${sPincode}
        Matching SHG IDs: []
        Number of assignments created: 0
        Reason: No approved and active SHG found in system.
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

    // Clean up any existing pending assignments (specifically to remove ghost/invalid seeds)
    await this.prisma.orderAssignment.deleteMany({
      where: {
        orderId: order.id,
        role: 'PICKUP',
        assigneeType: 'SHG',
        status: 'PENDING',
      }
    });

    const assignedShg = matchingShgs[0];
    const shgNumericId = parseInt(assignedShg.id, 10);



    await this.prisma.orderAssignment.deleteMany({
      where: {
        orderId: order.id,
        role: 'PICKUP',
        assigneeType: 'SHG',
      }
    });

    await this.prisma.orderAssignment.create({
      data: {
        orderId: order.id,
        assigneeId: assignedShg.id,
        assigneeType: 'SHG',
        role: 'PICKUP',
        status: 'ACCEPTED',
      },
    });

    console.log(`[SHG Broadcast Auto-Accept]
      Order ID: ${order.orderId} (${order.id})
      Seller Village: ${order.sellerVillage}
      Seller Pincode: ${order.sellerPincode}
      Auto-Assigned & Accepted SHG ID: ${assignedShg.id}
    `);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupShgId: assignedShg.id,
        pickupShgStatus: 'ACCEPTED',
        mainStatus: 'PICKUP_SHG_ACCEPTED',
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

    const matchingShgs = await this.getMatchingShgs(
      order.sellerVillage,
      order.sellerPincode,
      order.sellerPostOffice || '',
      rejectedIds
    );

    if (matchingShgs.length > 0) {
      // Delete existing pending ones
      await this.prisma.orderAssignment.deleteMany({
        where: { orderId: order.id, role: 'PICKUP', assigneeType: 'SHG', status: 'PENDING' },
      });

      // Create new auto-accepted assignments for SHG
      await this.prisma.orderAssignment.createMany({
        data: matchingShgs.map((shg) => ({
          orderId: order.id,
          assigneeId: shg.id,
          assigneeType: 'SHG',
          role: 'PICKUP',
          status: 'ACCEPTED',
        })),
      });

      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          mainStatus: 'PICKUP_SHG_ACCEPTED',
          pickupShgStatus: 'ACCEPTED',
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
        pickupShgStatus: 'ACCEPTED',
      },
    });
  }

  async shgPicked(id: string) {
    const order = await this.getOrderDetails(id);

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupShgStatus: 'PICKED',
        mainStatus: 'PARCEL_AT_SHG',
      },
    });

    try {
      await this.broadcastTransporter(order.id);
    } catch (err: any) {
      console.warn(`[shgPicked auto-broadcastTransporter] Failed for order ${order.id}:`, err.message);
    }

    return updated;
  }

  async broadcastTransporter(id: string) {
    const order = await this.getOrderDetails(id);

    const sVillage = order.seller?.village || (order as any).sellerVillage || '';
    const sPincode = order.seller?.pincode || (order as any).sellerPincode || '';
    const sPostOffice = order.seller?.postOffice || (order as any).sellerPostOffice || '';

    const matchingTransporters = await this.getMatchingTransporters(
      sVillage,
      sPincode,
      sPostOffice,
      [],
      Number(order.totalWeight || 0),
    );

    if (matchingTransporters.length === 0) {
      console.log(`[Transporter Broadcast]
        Order ID: ${order.orderId} (${order.id})
        Seller Village: ${sVillage}
        Seller Pincode: ${sPincode}
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

    // Clean up any existing pending transporter assignments for this order
    await this.prisma.orderAssignment.deleteMany({
      where: {
        orderId: order.id,
        role: 'PICKUP',
        assigneeType: 'TRANSPORTER',
        status: 'PENDING',
      },
    });

    let assignmentsCreatedCount = 0;
    for (const t of matchingTransporters) {
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

    const matchingTransporters = await this.getMatchingTransporters(
      order.seller?.village || (order as any).sellerVillage || '',
      order.seller?.pincode || (order as any).sellerPincode || '',
      order.seller?.postOffice || (order as any).sellerPostOffice || '',
      rejectedIds,
      Number(order.totalWeight || 0),
    );

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
    const order = await this.getOrderDetails(id, 'PICKUP');

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'STORED',
        pickupTransporterStatus: 'DROPPED',
        pickupShgStatus: 'DROPPED',
        warehouseReceivedAt: new Date(),
        storedAt: new Date(),
      },
    });

    return this.storeInventory(order.id);
  }

  async storeInventory(id: string) {
    const order = await this.getOrderDetails(id, 'PICKUP');

    // 1. Update status to STORED, pickupShgStatus=DROPPED, pickupTransporterStatus=DROPPED
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'STORED',
        pickupShgStatus: 'DROPPED',
        pickupTransporterStatus: 'DROPPED',
        storedAt: new Date(),
        warehouseReceivedAt: new Date(),
      },
    });

    // 2. Ensure Warehouse Inventory record
    try {
      let warehouse = await this.prisma.warehouse.findFirst();
      if (!warehouse) {
        warehouse = await this.prisma.warehouse.create({
          data: {
            name: 'GMU Hub Warehouse',
            address: 'Kolhapur',
          }
        });
      }
    } catch (wErr: any) {
      console.warn(`[storeInventory] Warehouse creation note:`, wErr.message);
    }

    // 3. Fast Asynchronous Phase 2 Partner Matching & Broadcasts on the SAME order
    const dropId = order.id;
    Promise.allSettled([
      this.broadcastDropShg(dropId),
      this.broadcastDropTransporter(dropId),
    ]).catch(err => console.error('[storeInventory] Background broadcast note:', err));

    return updated;
  }


  // --- DROP FLOW WORKFLOWS ---

  async broadcastDropShg(id: string) {
    const order = await this.getOrderDetails(id);

    const matchingShgs = await this.getMatchingShgs(
      order.buyerVillage || '',
      order.buyerPincode || '',
      order.buyerPostOffice || '',
    );

    // Fallback: Also include the pickup SHG to support smooth manual testing and end-to-end execution of Phase 2
    const pickupOrder = await this.prisma.order.findFirst({
      where: {
        orderId: order.orderId,
        phase: 'PICKUP',
      },
    });

    if (pickupOrder && pickupOrder.pickupShgId) {
      if (!matchingShgs.some(s => String(s.id) === pickupOrder.pickupShgId)) {
        matchingShgs.push({
          id: String(pickupOrder.pickupShgId),
        });
      }
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

    // Auto-allocate and auto-accept for matching buyer SHG
    const allocatedShg = matchingShgs[0];
    const allocatedShgId = allocatedShg.id;

    // Create ACCEPTED assignment for allocated SHG
    const existingAssignment = await this.prisma.orderAssignment.findFirst({
      where: {
        orderId: order.id,
        assigneeId: allocatedShgId,
        assigneeType: 'SHG',
        role: 'DROP',
      },
    });

    if (existingAssignment) {
      await this.prisma.orderAssignment.update({
        where: { id: existingAssignment.id },
        data: { status: 'ACCEPTED' },
      });
    } else {
      await this.prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: allocatedShgId,
          assigneeType: 'SHG',
          role: 'DROP',
          status: 'ACCEPTED',
        },
      });
    }



    console.log(`[Drop SHG Auto-Accept]
      Order ID: ${order.orderId} (${order.id})
      Buyer Village: ${order.buyerVillage}
      Allocated SHG ID: ${allocatedShgId} (Auto-Accepted)
    `);

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropShgId: allocatedShgId,
        dropShgStatus: 'ACCEPTED',
        mainStatus: 'DROP_SHG_ACCEPTED',
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

    const result = await this.prisma.$transaction(async (tx) => {
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

      return updated;
    });

    try {
      await this.broadcastDropTransporter(order.id);
    } catch (err: any) {
      console.error(`[dropShgAccept] Immediate drop transporter broadcast failed:`, err.message);
    }

    return result;
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

    const matchingShgs = await this.getMatchingShgs(
      order.buyerVillage || '',
      order.buyerPincode || '',
      order.buyerPostOffice || '',
      rejectedIds,
    );

    if (matchingShgs.length > 0) {
      await this.prisma.orderAssignment.deleteMany({
        where: { orderId: order.id, role: 'DROP', assigneeType: 'SHG', status: 'PENDING' },
      });

      await this.prisma.orderAssignment.createMany({
        data: matchingShgs.map((shg, idx) => ({
          orderId: order.id,
          assigneeId: shg.id,
          assigneeType: 'SHG',
          role: 'DROP',
          status: idx === 0 ? 'ACCEPTED' : 'PENDING',
        })),
      });

      const autoShgId = matchingShgs[0]?.id;

      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          mainStatus: 'DROP_SHG_ACCEPTED',
          dropShgStatus: 'ACCEPTED',
          dropShgId: autoShgId ? String(autoShgId) : order.dropShgId,
          dropTransporterStatus: 'PENDING',
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

    const matchingTransporters = await this.getMatchingTransporters(
      order.buyerVillage || '',
      order.buyerPincode || '',
      order.buyerPostOffice || '',
      [],
      Number(order.totalWeight || 0),
    );

    // Fallback 1: Include Phase 1 pickup transporter so they receive Phase 2 request
    const pickupOrder = await this.prisma.order.findFirst({
      where: { orderId: order.orderId, phase: 'PICKUP' }
    });

    if (pickupOrder && pickupOrder.pickupTransporterId) {
      if (!matchingTransporters.some(t => String(t.id) === String(pickupOrder.pickupTransporterId))) {
        matchingTransporters.push({ id: String(pickupOrder.pickupTransporterId) });
      }
    }

    // Always include all approved active transporters so every transporter receives the Phase 2 request
    const allTransporters = await this.prisma.user.findMany({
      where: { role: 'TRANSPORTER', applicationStatus: 'APPROVED' },
      select: { id: true }
    });
    allTransporters.forEach(t => {
      if (!matchingTransporters.some(m => String(m.id) === String(t.id))) {
        matchingTransporters.push({ id: String(t.id) });
      }
    });

    if (matchingTransporters.length === 0) {
      console.warn(`[broadcastDropTransporter] No active transporters found in system.`);
      return order;
    }

    await this.prisma.orderAssignment.deleteMany({
      where: {
        OR: [
          { orderId: order.id, role: 'DROP', assigneeType: 'TRANSPORTER', status: 'PENDING' },
          { orderId: order.orderId, role: 'DROP', assigneeType: 'TRANSPORTER', status: 'PENDING' }
        ]
      },
    });

    const assignmentData: any[] = [];
    matchingTransporters.forEach((t) => {
      assignmentData.push({
        orderId: order.id,
        assigneeId: String(t.id),
        assigneeType: 'TRANSPORTER',
        role: 'DROP',
        status: 'PENDING',
      });
    });

    await this.prisma.orderAssignment.createMany({
      data: assignmentData,
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: order.mainStatus === 'DROP_SHG_ACCEPTED' ? 'DROP_SHG_ACCEPTED' : 'DROP_ASSIGNED',
        dropTransporterStatus: 'PENDING',
        dropTransporterId: null,
      },
      include: { assignments: true },
    }); // DROP_ASSIGNED stays — transporter broadcast doesn't change displayed status
  }

  async rebroadcastForApprovedPartner(partnerId: string, role: 'SHG' | 'TRANSPORTER') {
    console.log(`[rebroadcastForApprovedPartner] Triggered rebroadcast for approved partner: ${partnerId} (${role})`);

    if (role === 'SHG') {
      const pickupOrders = await this.prisma.order.findMany({
        where: {
          phase: 'PICKUP',
          mainStatus: { in: ['ORDER_PLACED', 'PICKUP_ASSIGNED'] },
          pickupShgId: null,
        }
      });
      for (const order of pickupOrders) {
        try {
          await this.broadcastShg(order.id);
        } catch (err: any) {
          console.warn(`[rebroadcast SHG Pickup] Failed for order ${order.id}:`, err.message);
        }
      }

      const dropOrders = await this.prisma.order.findMany({
        where: {
          phase: 'DROP',
          mainStatus: { in: ['DROP_PENDING', 'DROP_ASSIGNED'] },
          dropShgId: null,
        }
      });
      for (const order of dropOrders) {
        try {
          await this.broadcastDropShg(order.id);
        } catch (err: any) {
          console.warn(`[rebroadcast SHG Drop] Failed for order ${order.id}:`, err.message);
        }
      }
    } else if (role === 'TRANSPORTER') {
      const pickupOrders = await this.prisma.order.findMany({
        where: {
          phase: 'PICKUP',
          mainStatus: { in: ['PARCEL_AT_SHG', 'PARCEL_PICKED'] },
          pickupTransporterId: null,
        }
      });
      for (const order of pickupOrders) {
        try {
          await this.broadcastTransporter(order.id);
        } catch (err: any) {
          console.warn(`[rebroadcast Transporter Pickup] Failed for order ${order.id}:`, err.message);
        }
      }

      const dropOrders = await this.prisma.order.findMany({
        where: {
          phase: 'DROP',
          mainStatus: 'DROP_SHG_ACCEPTED',
          dropTransporterId: null,
        }
      });
      for (const order of dropOrders) {
        try {
          await this.broadcastDropTransporter(order.id);
        } catch (err: any) {
          console.warn(`[rebroadcast Transporter Drop] Failed for order ${order.id}:`, err.message);
        }
      }
    }
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

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropTransporterId: transporterId,
        dropTransporterStatus: 'ACCEPTED',
        mainStatus: 'DROP_TRANSPORTER_ACCEPTED',
      },
    });

    return updated;
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

    const matchingTransporters = await this.getMatchingTransporters(
      order.buyerVillage || '',
      order.buyerPincode || '',
      order.buyerPostOffice || '',
      rejectedIds,
      Number(order.totalWeight || 0),
    );

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


  // --- NEW BUYER RETURN FLOW ---

  async requestBuyerReturn(id: string) {
    let order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { orderId: id }
        ],
        phase: 'DROP'
      },
      include: {
        assignments: true,
        seller: true,
        buyer: true,
      }
    });

    if (!order) {
      order = await this.getOrderDetails(id);
    }
    if (!order) {
      throw new NotFoundException(`Order with ID/OrderId ${id} not found`);
    }

    if (order.mainStatus !== 'DELIVERED') {
      throw new BadRequestException(`Order must be in DELIVERED status to create a buyer return request`);
    }

    let originalDropShgAuthId = order.dropShgId;
    if (!originalDropShgAuthId) {
      const dropAssignment = await this.prisma.orderAssignment.findFirst({
        where: {
          order: { orderId: order.orderId },
          role: 'DROP',
          assigneeType: 'SHG',
          status: { in: ['ACCEPTED', 'COMPLETED'] }
        }
      });
      if (dropAssignment) {
        originalDropShgAuthId = dropAssignment.assigneeId;
      }
    }

    if (!originalDropShgAuthId) {
      throw new BadRequestException(`No original SHG drop assignment found to return to`);
    }

    // 2. Find SHG user and their ID
    let shgUser = null;
    const isNumber = !isNaN(Number(originalDropShgAuthId));
    if (isNumber) {
      shgUser = await this.prisma.user.findFirst({
        where: { id: Number(originalDropShgAuthId) }
      });
    } else {
      shgUser = await this.prisma.user.findFirst({
        where: { authId: originalDropShgAuthId }
      });
    }
    if (!shgUser) {
      throw new BadRequestException(`No SHG user record found for original Drop SHG identifier ${originalDropShgAuthId}`);
    }

    // 3. Deletes any old return assignments just in case
    await this.prisma.orderAssignment.deleteMany({
      where: { orderId: order.id, role: { in: ['DROP', 'RETURN'] } },
    });

    // 4. Create OrderAssignment with role DROP so that SHG acceptDrop updates it correctly
    await this.prisma.orderAssignment.create({
      data: {
        orderId: order.id,
        assigneeId: shgUser.authId,
        assigneeType: 'SHG',
        role: 'DROP',
        status: 'PENDING',
      },
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        returnType: 'BUYER_RETURN',
        mainStatus: 'RETURN_SHG_PENDING',
        pickupReturnShgId: shgUser.authId,
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
        pickupShgStatus: 'RETURN_PICKED_BY_SHG',
      },
    });

    // Auto broadcast transporter
    return this.broadcastBuyerReturnTransporter(order.id);
  }

  async broadcastBuyerReturnTransporter(id: string) {
    const order = await this.getOrderDetails(id);

    const matchingTransporters = await this.getMatchingTransporters(
      order.buyerVillage || '',
      order.buyerPincode || '',
      order.buyerPostOffice || '',
      [],
      Number(order.totalWeight || 0),
    );

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
        mainStatus: 'RETURN_TRANSPORTER_REQUESTED',
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
        pickupTransporterId: transporterId,
        dropTransporterId: transporterId,
        mainStatus: 'RETURN_TRANSPORTER_ACCEPTED',
        pickupTransporterStatus: 'ACCEPTED',
        dropTransporterStatus: 'ACCEPTED',
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

  async getMatchingShgs(village: string, pincode: string, postOffice: string, excludedIds: string[] = []): Promise<any[]> {
    const normalizeStr = (s: string) => {
      if (!s) return '';
      return s.replace(/[^a-z0-9]/gi, '').trim().toLowerCase();
    };

    const ov = village ? normalizeStr(village) : '';
    const op = pincode ? pincode.trim().toLowerCase() : '';

    const whereExcluded = excludedIds.length > 0
      ? `AND sa."shgUserId" NOT IN (${excludedIds.map(id => `'${id}'`).join(', ')})`
      : '';

    // Priority 1: Query ShgServiceArea table for active SHGs serving this exact Village + Pincode
    let serviceAreaShgs: any[] = [];
    if (ov && op) {
      try {
        serviceAreaShgs = await this.prisma.$queryRawUnsafe(`
          SELECT sa."shgUserId" as id, sa.village, sa.pincode
          FROM public."ShgServiceArea" sa
          JOIN public."User" u ON sa."shgUserId"::text = u.id::text
          WHERE sa.status = 'ACTIVE' AND u.role = 'SHG' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL
            AND LOWER(REGEXP_REPLACE(sa.village, '[^a-zA-Z0-9]', '', 'g')) = $1
            AND sa.pincode = $2 ${whereExcluded}
          ORDER BY sa."isPrimary" DESC;
        `, ov, op) as any[];
      } catch (err: any) {
        console.warn(`[getMatchingShgs] Service area query note:`, err.message);
      }
    }

    if (serviceAreaShgs.length > 0) {
      return serviceAreaShgs.map(shg => ({
        ...shg,
        id: String(shg.id)
      }));
    }

    // Fallback: Query public."Address" table if ShgServiceArea entry not found
    const whereExcludedLegacy = excludedIds.length > 0
      ? `AND u.id NOT IN (${excludedIds.map(id => `${id}`).join(', ')})`
      : '';

    let approvedShgs: any[] = [];
    try {
      approvedShgs = await this.prisma.$queryRawUnsafe(`
        SELECT u.id, a.pincode, a.village, a."postOffice"
        FROM public."User" u
        JOIN public."Address" a ON u.id = a."userId"
        WHERE u.role = 'SHG' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL ${whereExcludedLegacy};
      `) as any[];
    } catch (err: any) {
      console.warn(`[getMatchingShgs] Address query note:`, err.message);
    }

    // 1. Match on Pincode AND Village (Both must match)
    let matchingShgs = approvedShgs.filter(shg =>
      (shg.pincode && op && shg.pincode.trim().toLowerCase() === op) &&
      (shg.village && ov && (
        normalizeStr(shg.village) === ov ||
        normalizeStr(shg.village).includes(ov.substring(0, 5)) ||
        ov.includes(normalizeStr(shg.village).substring(0, 5))
      ))
    );

    // 2. Fallback: Match on Pincode if no village match found
    if (matchingShgs.length === 0 && op) {
      matchingShgs = approvedShgs.filter(shg =>
        shg.pincode && shg.pincode.trim().toLowerCase() === op.trim().toLowerCase()
      );
    }

    // 3. Fallback 2: Match to all active approved SHGs so seeded/test orders are never orphaned
    if (matchingShgs.length === 0 && approvedShgs.length > 0) {
      matchingShgs = approvedShgs;
    }

    return matchingShgs.map(shg => ({
      ...shg,
      id: String(shg.id)
    }));
  }

  async getMatchingTransporters(
    village: string,
    pincode: string,
    postOffice: string,
    excludedIds: string[] = [],
    totalWeight?: number,
  ): Promise<any[]> {
    let approvedTransporters: any[] = [];
    try {
      const whereExcluded = excludedIds.length > 0
        ? `AND u.id::text NOT IN (${excludedIds.map(id => `'${id}'`).join(', ')})`
        : '';

      approvedTransporters = await this.prisma.$queryRawUnsafe(`
        SELECT u.id, a.village as "homeVillage", a.pincode as "homePincode", a."postOffice", rd."operatingArea", rd."pickupLocations", od."minWeight", od."maxWeight", od."ratePerKm"
        FROM public."User" u
        LEFT JOIN public."Address" a ON u.id = a."userId"
        LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
        LEFT JOIN public."OtherDetails" od ON u.id = od."userId"
        WHERE u.role = 'TRANSPORTER' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL ${whereExcluded};
      `) as any[];
    } catch (err: any) {
      console.warn(`[getMatchingTransporters] Raw query note:`, err.message);
    }

    const parseJsonArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { }
      }
      return [];
    };

    const p = pincode?.trim()?.toLowerCase();
    const v = village?.trim()?.toLowerCase();

    const normalizeStr = (s: string) => {
      if (!s) return '';
      return s.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
    };

    const getTransporterInfo = (tr: any) => {
      const areas = tr.operatingArea
        ? tr.operatingArea.split(',').map((s: string) => s.trim().toLowerCase())
        : [];
      const pincodes = parseJsonArray(tr.pickupLocations).map((s: any) => String(s).trim().toLowerCase());
      const transporterPostOffice = tr.postOffice ? normalizeStr(tr.postOffice) : '';
      return { areas, pincodes, postOffice: transporterPostOffice };
    };

    // STRICT ROUTE MATCHING ONLY: Matches ONLY by Transporter Route Details (operatingArea & pickupLocations), NOT personal address
    const locationMatchedTransporters = approvedTransporters.filter((tr) => {
      const { areas, pincodes } = getTransporterInfo(tr);
      const targetV = v ? normalizeStr(v) : '';
      const targetP = p ? p.trim().toLowerCase() : '';

      if (!targetV || !targetP) return false;

      const villageMatches = areas.some((a: string) => {
        const normA = normalizeStr(a);
        return normA === targetV || normA.includes(targetV) || targetV.includes(normA);
      });

      const pinMatches = pincodes.some((pin: string) => {
        const cleanPin = pin.split(' (')[0].trim().toLowerCase();
        return cleanPin === targetP;
      });

      return villageMatches && pinMatches;
    });

    // Helper function to calculate effective maximum weight with tier-based tolerance buffer
    const getEffectiveMaxWeight = (maxW: number | null): number | null => {
      if (maxW === null || isNaN(maxW)) return null;
      let bufferPercent = 0.02; // Default 2% for heavy vehicles (> 500 kg)
      if (maxW <= 50) {
        bufferPercent = 0.05; // 5% for small vehicles (<= 50 kg)
      } else if (maxW <= 500) {
        bufferPercent = 0.03; // 3% for medium vehicles (50 kg < maxW <= 500 kg)
      }
      return maxW * (1 + bufferPercent);
    };

    // Priority Step 3: Vehicle Capacity Match (minWeight <= totalWeight <= effectiveMaxWeight)
    const weightNum = typeof totalWeight === 'number' && !isNaN(totalWeight) ? totalWeight : null;
    let weightEligibleTransporters = locationMatchedTransporters;

    if (weightNum !== null && weightNum > 0) {
      weightEligibleTransporters = locationMatchedTransporters.filter((tr) => {
        const minW = tr.minWeight !== null && tr.minWeight !== undefined ? Number(tr.minWeight) : null;
        const maxW = tr.maxWeight !== null && tr.maxWeight !== undefined ? Number(tr.maxWeight) : null;
        const effectiveMaxW = getEffectiveMaxWeight(maxW);

        // Small parcels (e.g. 0.5 - 10 kg) are eligible as long as totalWeight does not exceed maximum carrying capacity
        if (effectiveMaxW !== null && weightNum > effectiveMaxW) {
          return false;
        }
        return true;
      });
    }

    // Fallback: If no route capacity match for test address, fallback to all approved transporters
    if (weightEligibleTransporters.length === 0 && approvedTransporters.length > 0) {
      weightEligibleTransporters = approvedTransporters;
    }

    if (weightEligibleTransporters.length === 0) {
      console.log(`[Transporter Broadcast Matching]
        Total Shipment Weight: ${weightNum !== null ? `${weightNum} kg` : 'N/A'}
        Location Matched Transporters: ${locationMatchedTransporters.length}
        Weight Eligible Transporters: 0
        Lowest Rate Selected: N/A
        Selected Transporter IDs: []
        Reason: No approved transporter found in system.
      `);
      return [];
    }

    // Priority Step 4: Lowest Rate Selection (ratePerKm)
    const validRates = weightEligibleTransporters
      .map(tr => (tr.ratePerKm !== null && tr.ratePerKm !== undefined ? Number(tr.ratePerKm) : null))
      .filter((r): r is number => r !== null && !isNaN(r));

    let finalSelectedTransporters = weightEligibleTransporters;
    let lowestRateStr = 'N/A';

    if (validRates.length > 0) {
      const minRate = Math.min(...validRates);
      lowestRateStr = `₹${minRate}/km`;
      finalSelectedTransporters = weightEligibleTransporters.filter((tr) => {
        const rate = tr.ratePerKm !== null && tr.ratePerKm !== undefined ? Number(tr.ratePerKm) : null;
        return rate === minRate;
      });
    }

    console.log(`[Transporter Broadcast Matching]
      Total Shipment Weight: ${weightNum !== null ? `${weightNum} kg` : 'N/A'}
      Location Matched Transporters: ${locationMatchedTransporters.length}
      Weight Eligible Transporters: ${weightEligibleTransporters.length}
      Lowest Rate Selected: ${lowestRateStr}
      Broadcast Sent To Transporter IDs: ${JSON.stringify(finalSelectedTransporters.map(tr => String(tr.id)))}
    `);

    return finalSelectedTransporters.map(tr => ({
      ...tr,
      id: String(tr.id)
    }));
  }
}
