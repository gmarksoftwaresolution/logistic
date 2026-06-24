import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderFilterDto } from './dto/order-filter.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderManagementService {
  constructor(private prisma: PrismaService) {}

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
      return ['AT_HUB', 'HUB_RECEIVED'];
    }
    if (s === 'HUB_RECEIVED' || s === 'PICKUPHUB_RECEIVE') {
      return ['HUB_RECEIVED', 'AT_HUB', 'BARCODE_GENERATED'];
    }
    if (s === 'BARCODE_GENERATED') {
      return ['BARCODE_GENERATED', 'HUB_RECEIVED'];
    }
    if (s === 'STORED') {
      return ['STORED', 'AT_HUB'];
    }
    if (s === 'DROP_ASSIGNED' || s === 'DISPATCH' || s === 'DISPATCHED') {
      return ['DROP_ASSIGNED', 'DISPATCHED', 'DISPATCH', 'PENDING_DROP', 'DROP_SHG_PENDING'];
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
            returnType: null,
            OR: [
              { mainStatus: { in: ['PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_HUB', 'SHG_PICKUP_DECLINED', 'TRANSPORTER_DECLINED'] } },
              { mainStatus: 'PICKUP_ASSIGNED', NOT: { OR: [{ pickupShgStatus: 'PENDING' }, { pickupShgStatus: 'pending' }, { pickupShgStatus: null }] } }
            ]
          },
          undefined,
          ['PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_HUB', 'SHG_PICKUP_DECLINED', 'TRANSPORTER_DECLINED']
        )
      }),
      // pickup.warehouse — Phase 5
      this.prisma.order.count({ where: this.applyFilters({ returnType: null }, undefined, ['AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED']) }),
      // pickup.rejected — orders with any rejected assignment
      this.prisma.order.count({ where: this.applyFilters({ assignments: { some: { role: 'PICKUP', status: 'REJECTED' } }, returnType: null }, undefined, ['ORDER_PLACED', 'PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_HUB', 'SHG_PICKUP_DECLINED', 'TRANSPORTER_DECLINED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING']) }),
      // pickup.rescheduled — REASSIGNED or legacy RESCHEDULED
      this.prisma.order.count({ where: this.applyFilters({ mainStatus: { in: ['REASSIGNED', 'RESCHEDULED'] }, rescheduleType: { in: ['PICKUP_SHG', 'PICKUP_TRANSPORTER'] }, returnType: null }) }),

      // drop.new — Phase 5 dispatch
      this.prisma.order.count({
        where: this.applyFilters(
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
                  { mainStatus: { in: ['AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'STORED', 'DISPATCHED', 'DROP_SHG_PENDING', 'PENDING_DROP', 'INVENTORY_TRANSPORTER_RETURN'] } },
                  { mainStatus: 'DROP_ASSIGNED', OR: [{ dropShgStatus: 'PENDING' }, { dropShgStatus: 'pending' }, { dropShgStatus: null }] }
                ]
              }
            ]
          },
          undefined,
          ['DROP_ASSIGNED', 'AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'STORED', 'DISPATCHED', 'DROP_SHG_PENDING', 'PENDING_DROP', 'INVENTORY_TRANSPORTER_RETURN']
        )
      }),
      // drop.assigned — Phase 6-7
      this.prisma.order.count({
        where: this.applyFilters(
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
      this.prisma.order.count({ where: this.applyFilters({ OR: [{ returnType: null }, { returnType: 'TRANSPORTER_RETURN' }] }, undefined, ['DELIVERED', 'COMPLETED']) }),
      // drop.rejected
      this.prisma.order.count({ where: this.applyFilters({ assignments: { some: { role: 'DROP', status: 'REJECTED' } }, OR: [{ returnType: null }, { returnType: 'TRANSPORTER_RETURN' }] }, undefined, ['DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_DROP_SHG', 'IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_SHG', 'DISPATCHED', 'DROP_SHG_PENDING', 'PENDING_DROP']) }),
      // drop.rescheduled
      this.prisma.order.count({ where: this.applyFilters({ mainStatus: { in: ['REASSIGNED', 'RESCHEDULED'] }, rescheduleType: { in: ['DROP_SHG', 'DROP_TRANSPORTER'] }, OR: [{ returnType: null }, { returnType: 'TRANSPORTER_RETURN' }] }) }),

      // return.transporter
      this.prisma.order.count({ where: this.applyFilters({ returnType: 'TRANSPORTER_RETURN' }, undefined, ['TRANSPORTER_RETURN_PENDING', 'TRANSPORTER_RETURN_COMPLETED']) }),
      // return.buyer
      this.prisma.order.count({ where: this.applyFilters({ returnType: 'BUYER_RETURN' }, undefined, ['RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PARCEL_AT_SHG', 'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_ACCEPTED', 'RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED']) }),

      // inventory.stored
      this.prisma.order.count({ where: this.applyFilters({ returnType: null }, undefined, ['STORED', 'AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'DROP_ASSIGNED', 'DISPATCHED']) }),
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

  async getOrderDetails(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id }, { orderId: id }] },
      include: { assignments: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID/OrderId ${id} not found`);
    }
    return order;
  }

  async getPickupNewOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPickupAssignedOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        returnType: null,
        OR: [
          { mainStatus: { in: ['PICKUP_SHG_ACCEPTED', 'SHG_PICKUP_DECLINED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'TRANSPORTER_DECLINED', 'IN_TRANSIT_TO_HUB', 'PICKUP_SHG_PENDING'] } },
          { mainStatus: 'PICKUP_ASSIGNED', NOT: { OR: [{ pickupShgStatus: 'PENDING' }, { pickupShgStatus: 'pending' }, { pickupShgStatus: null }] } }
        ]
      },
      filter,
      [
        'PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'SHG_PICKUP_DECLINED',
        'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'TRANSPORTER_DECLINED',
        'IN_TRANSIT_TO_HUB', 'PICKUP_SHG_PENDING',
      ]
    );
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPickupWarehouseOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { returnType: null },
      filter,
      // Phase 5: hub received (AT_HUB new canonical + legacy HUB_RECEIVED, BARCODE_GENERATED)
      ['AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED']
    );
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPickupRejectedOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        assignments: {
          some: { role: 'PICKUP', status: 'REJECTED' },
        },
        returnType: null,
      },
      filter,
      [
        'ORDER_PLACED', 'PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED',
        'SHG_PICKUP_DECLINED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED',
        'TRANSPORTER_DECLINED', 'IN_TRANSIT_TO_HUB',
        // legacy
        'PENDING_PICKUP', 'PICKUP_SHG_PENDING',
      ]
    );
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPickupRescheduledOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      {
        mainStatus: { in: ['REASSIGNED', 'RESCHEDULED'] },
        rescheduleType: { in: ['PICKUP_SHG', 'PICKUP_TRANSPORTER'] },
        returnType: null,
      },
      filter
    );
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
              { mainStatus: { in: ['AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'STORED', 'DISPATCHED', 'DROP_SHG_PENDING', 'PENDING_DROP', 'INVENTORY_TRANSPORTER_RETURN'] } },
              { mainStatus: 'DROP_ASSIGNED', OR: [{ dropShgStatus: 'PENDING' }, { dropShgStatus: 'pending' }, { dropShgStatus: null }] }
            ]
          }
        ]
      },
      filter,
      ['DROP_ASSIGNED', 'AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'STORED', 'DISPATCHED', 'DROP_SHG_PENDING', 'PENDING_DROP', 'INVENTORY_TRANSPORTER_RETURN']
    );
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDropAssignedOrders(filter?: OrderFilterDto) {
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDropCompletedOrders(filter?: OrderFilterDto) {
    const where = this.applyFilters(
      { OR: [{ returnType: null }, { returnType: 'TRANSPORTER_RETURN' }] },
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
      { returnType: null },
      filter,
      // Phase 5: all warehouse/hub/dispatch states
      ['AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'STORED', 'DROP_ASSIGNED', 'DISPATCHED']
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
    
    // Check uniqueness of orderId
    const existing = await this.prisma.order.findUnique({ where: { orderId } });
    if (existing) {
      throw new BadRequestException(`Order ID ${orderId} already exists`);
    }

    return this.prisma.order.create({
      data: {
        orderId,
        sellerName: dto.sellerName,
        sellerMobile: dto.sellerMobile,
        sellerVillage: dto.sellerVillage,
        sellerTaluka: dto.sellerTaluka,
        sellerDistrict: dto.sellerDistrict,
        sellerState: dto.sellerState,
        sellerPincode: dto.sellerPincode,
        buyerName: dto.buyerName,
        buyerMobile: dto.buyerMobile,
        buyerVillage: dto.buyerVillage,
        buyerTaluka: dto.buyerTaluka,
        buyerDistrict: dto.buyerDistrict,
        buyerState: dto.buyerState,
        buyerPincode: dto.buyerPincode,
        productCount: dto.productCount,
        totalQty: dto.totalQty,
        totalWeight: dto.totalWeight,
        // Phase 1: ORDER_PLACED is the new canonical status for a freshly created order
        mainStatus: 'ORDER_PLACED',
      },
    });
  }

  async broadcastShg(id: string) {
    const order = await this.getOrderDetails(id);

    // Find APPROVED SHGs matching seller village & pincode
    const matchingShgs = await this.prisma.communityMember.findMany({
      where: {
        type: 'SHG',
        status: 'APPROVED',
        village: order.sellerVillage,
        pincode: order.sellerPincode,
      },
    });

    if (matchingShgs.length === 0) {
      throw new BadRequestException(`No matching approved SHGs found for village ${order.sellerVillage} and pincode ${order.sellerPincode}`);
    }

    // Delete existing pending assignments for this role/type
    await this.prisma.orderAssignment.deleteMany({
      where: { orderId: order.id, role: 'PICKUP', assigneeType: 'SHG', status: 'PENDING' },
    });

    // Create PENDING assignments
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
        // Phase 2: Broadcast SHG → PICKUP_ASSIGNED
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

    // Get all approved transporters
    const approvedTransporters = await this.prisma.transporterMember.findMany({
      where: { status: 'APPROVED' },
    });

    // Filter in JS based on JSON pincodes or villages matches
    const matchingTransporters = approvedTransporters.filter((t) => {
      const villages = this.parseJsonArray(t.assignedVillages);
      const pincodes = this.parseJsonArray(t.assignedPincodes);
      return villages.includes(order.sellerVillage) || pincodes.includes(order.sellerPincode);
    });

    if (matchingTransporters.length === 0) {
      throw new BadRequestException(`No matching approved transporters found for village ${order.sellerVillage} or pincode ${order.sellerPincode}`);
    }

    // Delete existing pending transporter requests
    await this.prisma.orderAssignment.deleteMany({
      where: { orderId: order.id, role: 'PICKUP', assigneeType: 'TRANSPORTER', status: 'PENDING' },
    });

    // Create assignments
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

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'STORED',
        storedAt: new Date(),
      },
    });
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

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'DISPATCHED',
        dispatchedAt: new Date(),
      },
    });
  }

  // --- DROP FLOW WORKFLOWS ---

  async broadcastDropShg(id: string) {
    const order = await this.getOrderDetails(id);

    const matchingShgs = await this.prisma.communityMember.findMany({
      where: {
        type: 'SHG',
        status: 'APPROVED',
        village: order.buyerVillage,
        pincode: order.buyerPincode,
      },
    });

    if (matchingShgs.length === 0) {
      throw new BadRequestException(`No matching approved SHGs found for buyer village ${order.buyerVillage} and pincode ${order.buyerPincode}`);
    }

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
        // Phase 5: GMU broadcasts drop SHG → DROP_ASSIGNED (same status as dispatch)
        mainStatus: 'DROP_ASSIGNED',
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

    await this.prisma.orderAssignment.update({
      where: { id: assignment.id },
      data: { status: 'ACCEPTED' },
    });

    await this.prisma.orderAssignment.deleteMany({
      where: {
        orderId: order.id,
        role: 'DROP',
        assigneeType: 'SHG',
        status: 'PENDING',
        id: { not: assignment.id },
      },
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        dropShgId: shgId,
        dropShgStatus: 'ACCEPTED',
        mainStatus: 'DROP_SHG_ACCEPTED',
      },
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
