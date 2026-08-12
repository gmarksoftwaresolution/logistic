import { HttpException, HttpStatus } from '@nestjs/common';

export class QrValidationError extends HttpException {
  constructor(message: string, statusCode: number = HttpStatus.BAD_REQUEST) {
    super({ statusCode, message, error: 'Bad Request' }, statusCode);
    this.name = 'QrValidationError';
  }
}

export type SessionType = 'PICKUP' | 'DROP';

export interface QrContent {
  parcelId: string;
  verificationToken: string;
  version: number;
}

export type ParcelStatus =
  | 'CREATED'
  | 'READY_FOR_PICKUP'
  | 'PARCEL_PICKED'
  | 'TRANSPORTER_ACCEPTED'
  | 'IN_TRANSIT'
  | 'AT_GMU'
  | 'STORED'
  | 'READY_FOR_DISPATCH'
  | 'DROP_TRANSPORTER_ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'AT_BUYER_SHG'
  | 'DELIVERED';

/**
 * Normalizes legacy status names to the standard 11-status state machine.
 */
export function normalizeStatus(status: string): ParcelStatus {
  const map: Record<string, ParcelStatus> = {
    'PENDING': 'READY_FOR_PICKUP',
    'PARCEL_AT_SHG': 'PARCEL_PICKED',
    'PARCEL_AT_TRANSPORTER': 'TRANSPORTER_ACCEPTED',
    'IN_TRANSIT_TO_HUB': 'IN_TRANSIT',
    'HUB_RECEIVED': 'AT_GMU',
    'STORED': 'STORED',
    'DISPATCHED': 'READY_FOR_DISPATCH',
    'IN_TRANSIT_TO_BUYER': 'OUT_FOR_DELIVERY',
    'PARCEL_AT_DROP_SHG': 'AT_BUYER_SHG',
    'PARCEL_WITH_DROP_SHG': 'AT_BUYER_SHG',
    'DELIVERED': 'DELIVERED',
  };
  return map[status] || (status as ParcelStatus);
}

/**
 * Parses and decodes scanned QR code contents.
 */
export function decodeQrData(data: string): QrContent {
  const trimmed = (data || '').trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const parcelId = parsed.parcelId || parsed.id || parsed.orderId || '';
      if (!parcelId) {
        throw new QrValidationError('Invalid QR payload: missing parcelId');
      }
      return {
        parcelId,
        verificationToken: parsed.verificationToken || parsed.token || '',
        version: parsed.version || 1,
      };
    } catch (err: any) {
      if (err instanceof QrValidationError) throw err;
      throw new QrValidationError('Malformed JSON in QR code: ' + err.message);
    }
  } else {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 1 && parts[0]) {
      return {
        parcelId: parts[0],
        verificationToken: parts[1] || '',
        version: 1,
      };
    }
    throw new QrValidationError('Invalid QR code format');
  }
}

/**
 * Validates the scanned token against the token stored in database.
 */
export function validateVerificationToken(scannedToken: string, dbToken: string) {
  if (scannedToken && dbToken) {
    const s = String(scannedToken).trim().toLowerCase();
    const d = String(dbToken).trim().toLowerCase();
    if (s && d && s !== d) {
      throw new QrValidationError('Verification token invalid');
    }
  }
}

export interface TransitionResult {
  nextParcelStatus: string;
  nextHolderId: string | null;
  nextHolderType: string | null;
  action: string;
  message: string;
}

/**
 * Determines the next state and ownership details for a scanned parcel.
 */
export function determineTransition(
  sessionType: SessionType,
  userRole: string,
  userId: string,
  parcel: any,
  order: any,
  legType?: string
): TransitionResult {
  const currentStatus: string = String(normalizeStatus(parcel.parcelStatus) || '').toUpperCase();
  const finalRole = userRole.toUpperCase();

  // Validate state machine transitions based on current status and user role
  if (finalRole === 'SHG') {
    // PHASE 2 (DROP): SHG receiving from Transporter or delivering to Buyer
    if (order?.phase === 'DROP' || sessionType === 'DROP' || ['DISPATCHED', 'IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_SHG', 'IN_TRANSIT_TO_BUYER', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG', 'DROP_TRANSPORTER_ACCEPTED', 'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'STORED'].includes(order?.mainStatus)) {
      const isAlreadyInShgPossession = parcel.currentHolderType === 'SHG' && (parcel.parcelStatus === 'PARCEL_WITH_DROP_SHG' || parcel.parcelStatus === 'PARCEL_AT_DROP_SHG' || order?.mainStatus === 'PARCEL_WITH_DROP_SHG' || order?.mainStatus === 'PARCEL_AT_DROP_SHG');
      const isFinalDelivery = legType === 'delivery' || (isAlreadyInShgPossession && legType !== 'pickup');
      if (isFinalDelivery) {
        return {
          nextParcelStatus: 'DELIVERED',
          nextHolderId: String(order.buyerId),
          nextHolderType: 'BUYER',
          action: 'FINAL_DELIVERY',
          message: 'Parcel delivered to Buyer by SHG',
        };
      } else {
        return {
          nextParcelStatus: 'PARCEL_AT_DROP_SHG',
          nextHolderId: userId,
          nextHolderType: 'SHG',
          action: 'SHG_DROP_RECEIVE',
          message: 'Parcel received by drop SHG from transporter (Ready for buyer delivery)',
        };
      }
    }

    // PHASE 1 (PICKUP): SHG picking up from Seller
    if (currentStatus === 'PENDING' || currentStatus === 'NEW' || currentStatus === 'ACCEPTED' || currentStatus === 'PARCEL_ASSIGNED' || currentStatus === 'READY_FOR_PICKUP' || currentStatus === 'PARCEL_AT_SHG' || (currentStatus === 'PARCEL_PICKED' && legType !== 'handover')) {
      return {
        nextParcelStatus: 'PARCEL_AT_SHG',
        nextHolderId: userId,
        nextHolderType: 'SHG',
        action: 'SHG_PICKUP',
        message: 'Parcel picked up from seller by SHG',
      };
    }
    if (currentStatus === 'PARCEL_PICKED' && legType === 'handover') {
      const nextHolder = order.pickupTransporterId ? String(order.pickupTransporterId) : 'TRANSPORTER';
      return {
        nextParcelStatus: 'PARCEL_AT_TRANSPORTER',
        nextHolderId: nextHolder,
        nextHolderType: 'TRANSPORTER',
        action: 'SHG_TRANSPORTER_DELIVER',
        message: 'Parcel delivered to Transporter by SHG',
      };
    }
  }

  if (finalRole === 'TRANSPORTER') {
    const isDropPhase = order?.phase === 'DROP' || sessionType === 'DROP' || ['DROP_PENDING', 'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'STORED', 'HUB_RECEIVED', 'PARCEL_AT_GMU', 'DISPATCHED', 'IN_TRANSIT_TO_BUYER', 'IN_TRANSIT_TO_DROP_SHG'].includes(order?.mainStatus);

    if (isDropPhase) {
      // Transporter loading parcel from GMU Hub Warehouse for delivery -> IN_TRANSIT_TO_DROP_SHG
      return {
        nextParcelStatus: 'IN_TRANSIT_TO_DROP_SHG',
        nextHolderId: userId,
        nextHolderType: 'TRANSPORTER',
        action: 'TRANSPORTER_DROP_PICKUP',
        message: 'Parcel picked up by Transporter from GMU Hub Warehouse (In Transit to Drop SHG)',
      };
    }

    // PHASE 1 (PICKUP): Transporter loading from Pickup SHG (or Seller directly if redirected) to deliver to GMU Hub
    if (currentStatus === 'PENDING' || currentStatus === 'PARCEL_AT_SHG' || currentStatus === 'PARCEL_PICKED' || currentStatus === 'TRANSPORTER_ACCEPTED' || currentStatus === 'READY_FOR_PICKUP' || currentStatus === 'REDIRECTED') {
      return {
        nextParcelStatus: 'IN_TRANSIT_TO_HUB',
        nextHolderId: userId,
        nextHolderType: 'TRANSPORTER',
        action: 'TRANSPORTER_PICKUP',
        message: order?.isPickupRedirected ? 'Parcel loaded by Transporter directly from Seller (Redirected)' : 'Parcel loaded by Transporter from SHG',
      };
    }
  }

  if (finalRole === 'GMU' || finalRole === 'ADMIN' || finalRole === 'SUPER_ADMIN') {
    if (currentStatus === 'IN_TRANSIT' || currentStatus === 'IN_TRANSIT_TO_HUB' || currentStatus === 'REDIRECTED') {
      return {
        nextParcelStatus: 'HUB_RECEIVED',
        nextHolderId: 'HUB',
        nextHolderType: 'WAREHOUSE',
        action: 'WAREHOUSE_INTAKE',
        message: 'Parcel intake complete at GMU Hub',
      };
    }
    if (currentStatus === 'AT_GMU' || currentStatus === 'HUB_RECEIVED') {
      return {
        nextParcelStatus: 'STORED',
        nextHolderId: 'HUB_SHELF',
        nextHolderType: 'WAREHOUSE',
        action: 'WAREHOUSE_STORE',
        message: 'Parcel stored in inventory',
      };
    }
    if (currentStatus === 'STORED') {
      return {
        nextParcelStatus: 'DISPATCHED',
        nextHolderId: 'HUB',
        nextHolderType: 'WAREHOUSE',
        action: 'WAREHOUSE_DISPATCH',
        message: 'Parcel dispatched from GMU Hub',
      };
    }
  }

  // Safe fallback transition for SHG/TRANSPORTER to prevent state machine crashes
  if (finalRole === 'SHG') {
    return {
      nextParcelStatus: 'PARCEL_AT_SHG',
      nextHolderId: userId,
      nextHolderType: 'SHG',
      action: 'SHG_PICKUP',
      message: 'Parcel picked up by SHG',
    };
  } else if (finalRole === 'TRANSPORTER') {
    return {
      nextParcelStatus: 'IN_TRANSIT_TO_HUB',
      nextHolderId: userId,
      nextHolderType: 'TRANSPORTER',
      action: 'TRANSPORTER_PICKUP',
      message: 'Parcel loaded by Transporter',
    };
  }

  throw new QrValidationError('Parcel status invalid.');
}

/**
 * Triggers pickup assignment broadcast to matching transporters after SHG pickup scan
 */
export async function triggerTransporterPickupBroadcast(tx: any, orderId: string) {
  try {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { seller: true }
    });

    if (!order) return;

    const seller = order.seller;
    let matchedTransporters: any[] = [];
    let assigneeIds = new Set<string>();

    if (seller) {
      const transporters = await tx.$queryRawUnsafe(`
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

      const p = seller.pincode ? seller.pincode.toLowerCase().trim() : '';
      const v = seller.village ? seller.village.toLowerCase().trim() : '';

      if (p) {
        matchedTransporters = transporters.filter((tr: any) => {
          const { areas, pincodes } = getTransporterLocations(tr);
          return pincodes.some((po: string) => po.split(' (')[0] === p) || areas.some((a: string) => a.split(' (')[0] === p);
        });
      }

      if (matchedTransporters.length === 0 && v) {
        matchedTransporters = transporters.filter((tr: any) => {
          const { areas, villages } = getTransporterLocations(tr);
          return villages.some((vi: string) => vi.split(' (')[0] === v) || areas.some((a: string) => a.split(' (')[0] === v);
        });
      }

      if (matchedTransporters.length > 0) {
        matchedTransporters.forEach((tr: any) => assigneeIds.add(String(tr.id)));
      }
    }

    if (assigneeIds.size === 0) {
      const allTransporters = await tx.user.findMany({
        where: { role: 'TRANSPORTER', applicationStatus: 'APPROVED', deletedAt: null },
        select: { id: true }
      });
      allTransporters.forEach((tr: any) => assigneeIds.add(String(tr.id)));
    }

    for (const assigneeId of assigneeIds) {
      await tx.orderAssignment.deleteMany({
        where: {
          orderId: order.id,
          assigneeId,
          role: 'PICKUP',
          assigneeType: 'TRANSPORTER',
        }
      }).catch(() => { });

      await tx.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId,
          assigneeType: 'TRANSPORTER',
          role: 'PICKUP',
          status: 'PENDING'
        }
      }).catch(() => { });
    }
  } catch (err: any) {
    console.error(`[triggerTransporterPickupBroadcast] Error broadcasting to transporter for order ${orderId}:`, err.message);
  }
}

/**
 * Triggers drop assignment broadcast to matching transporters after order is STORED in Hub
 */
export async function triggerTransporterDropBroadcast(tx: any, orderId: string) {
  try {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { buyer: true }
    });

    if (!order) return;

    const buyer = order.buyer;
    let matchedTransporters: any[] = [];
    let assigneeIds = new Set<string>();

    if (buyer) {
      const transporters = await tx.$queryRawUnsafe(`
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

      const p = buyer.pincode ? buyer.pincode.toLowerCase().trim() : '';
      const v = buyer.village ? buyer.village.toLowerCase().trim() : '';

      if (p) {
        matchedTransporters = transporters.filter((tr: any) => {
          const { areas, pincodes } = getTransporterLocations(tr);
          return pincodes.some((po: string) => po.split(' (')[0] === p) || areas.some((a: string) => a.split(' (')[0] === p);
        });
      }

      if (matchedTransporters.length === 0 && v) {
        matchedTransporters = transporters.filter((tr: any) => {
          const { areas, villages } = getTransporterLocations(tr);
          return villages.some((vi: string) => vi.split(' (')[0] === v) || areas.some((a: string) => a.split(' (')[0] === v);
        });
      }

      if (matchedTransporters.length > 0) {
        matchedTransporters.forEach((tr: any) => assigneeIds.add(String(tr.id)));
      }
    }

    if (assigneeIds.size === 0) {
      const allTransporters = await tx.user.findMany({
        where: { role: 'TRANSPORTER', applicationStatus: 'APPROVED', deletedAt: null },
        select: { id: true }
      });
      allTransporters.forEach((tr: any) => assigneeIds.add(String(tr.id)));
    }

    for (const assigneeId of assigneeIds) {
      await tx.orderAssignment.deleteMany({
        where: {
          orderId: order.id,
          assigneeId,
          role: 'DROP',
          assigneeType: 'TRANSPORTER',
        }
      }).catch(() => { });

      await tx.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId,
          assigneeType: 'TRANSPORTER',
          role: 'DROP',
          status: 'PENDING'
        }
      }).catch(() => { });
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        dropTransporterStatus: 'PENDING'
      }
    }).catch(() => { });
  } catch (err: any) {
    console.error(`[triggerTransporterDropBroadcast] Error broadcasting to transporter for order ${orderId}:`, err.message);
  }
}

/**
 * Reusable QR Verification Engine implementation
 */
export class QrVerificationEngine {
  constructor(private readonly prisma: any) { }

  /**
   * Retrieves active session details containing expected, scanned, and remaining parcels.
   */
  async getSessionDetails(sessionType: SessionType, userId: string, userRole: string, sessionId: string) {
    const session = await this.prisma.scanSession.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            parcel: true,
          },
        },
      },
    });

    if (!session) {
      throw new QrValidationError('Session expired.');
    }

    // Validate that the scan session belongs to the requesting user and role
    if (session.userId !== userId || session.userRole.toUpperCase() !== userRole.toUpperCase()) {
      return null;
    }

    const orderIdsList = session.orderIds.split(',').map((id: string) => id.trim()).filter(Boolean);
    const cleanIds = orderIdsList.map(id => id.replace(/^pickup-/, '').replace(/^drop-/, '').replace(/^ORD-/, ''));

    const matchingOrders = await this.prisma.order.findMany({
      where: {
        OR: [
          { id: { in: orderIdsList } },
          { orderId: { in: orderIdsList } },
          { id: { in: cleanIds } },
          { orderId: { in: cleanIds } },
          { orderId: { in: cleanIds.map(c => `ORD-${c}`) } },
        ]
      },
      include: { parcels: true }
    });

    const allOrderKeys = Array.from(new Set([
      ...orderIdsList,
      ...cleanIds,
      ...matchingOrders.map((o: any) => o.id),
      ...matchingOrders.map((o: any) => o.orderId),
      ...matchingOrders.map((o: any) => (o.orderId || '').replace(/^ORD-/, ''))
    ])).filter(Boolean);

    // Auto-create default Parcel if an order has no parcel records
    for (const ord of matchingOrders) {
      if (!ord.parcels || ord.parcels.length === 0) {
        const defaultParcelId = `P-${(ord.orderId || ord.id).replace(/^ORD-/, '')}-1`;
        await this.prisma.parcel.create({
          data: {
            parcelId: defaultParcelId,
            orderId: ord.id,
            productName: 'General Parcel Package',
            weight: ord.totalWeight || 5,
            parcelStatus: ord.mainStatus || 'PARCEL_AT_SHG',
            flowType: ord.phase || 'PICKUP',
            currentHolderId: ord.sellerId || session.userId,
            currentHolderType: 'SELLER'
          }
        }).catch(() => { });
      }
    }

    // Query all expected parcels for these orders matching the flowType phase
    const expectedParcels = await this.prisma.parcel.findMany({
      where: {
        orderId: { in: allOrderKeys }
      },
    });

    const scannedIds = new Set(session.items.map((i: any) => i.parcelId));

    const orderIdToCleanMap = new Map<string, string>();
    matchingOrders.forEach((o: any) => {
      if (o.orderId) {
        orderIdToCleanMap.set(o.id, o.orderId);
        orderIdToCleanMap.set(o.orderId, o.orderId);
        orderIdToCleanMap.set(o.id.replace(/^pickup-/, '').replace(/^drop-/, ''), o.orderId);
      }
    });

    const scanned = session.items.map((item: any) => {
      const displayId = orderIdToCleanMap.get(item.parcel.orderId) || (item.parcel.orderId.startsWith('ORD-') ? item.parcel.orderId : `ORD-${item.parcel.orderId.slice(0, 8)}`);
      return {
        parcelId: item.parcel.parcelId,
        orderId: displayId,
        displayOrderId: displayId,
        productName: item.parcel.productName,
        parcelNumber: item.parcel.parcelNumber,
        totalParcels: item.parcel.totalParcels,
        quantity: item.parcel.quantity,
        weight: item.parcel.weight,
        parcelStatus: item.parcel.parcelStatus,
        qrCodeValue: item.parcel.qrCodeValue || '',
        verificationToken: item.parcel.verificationToken || '',
      };
    });

    const remaining = expectedParcels
      .filter((p: any) => !scannedIds.has(p.parcelId))
      .map((p: any) => {
        const displayId = orderIdToCleanMap.get(p.orderId) || (p.orderId.startsWith('ORD-') ? p.orderId : `ORD-${p.orderId.slice(0, 8)}`);
        return {
          parcelId: p.parcelId,
          orderId: displayId,
          displayOrderId: displayId,
          productName: p.productName,
          parcelNumber: p.parcelNumber,
          totalParcels: p.totalParcels,
          quantity: p.quantity,
          weight: p.weight,
          parcelStatus: p.parcelStatus,
          qrCodeValue: p.qrCodeValue || '',
          verificationToken: p.verificationToken || '',
        };
      });

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      userRole: session.userRole,
      sessionType: session.sessionType,
      status: session.status,
      orderIds: orderIdsList,
      totalExpected: expectedParcels.length,
      totalScanned: scanned.length,
      scanned,
      remaining,
    };
  }

  /**
   * Starts or resumes a scan session.
   */
  async startSession(sessionType: SessionType, userId: string, userRole: string, orderIds: string[]) {
    const existing = await this.prisma.scanSession.findFirst({
      where: {
        userId,
        userRole: userRole.toUpperCase(),
        sessionType,
        status: 'IN_PROGRESS',
      },
    });

    if (existing) {
      const orderIdsStr = orderIds.join(',');
      if (existing.orderIds !== orderIdsStr) {
        await this.prisma.scanSession.update({
          where: { sessionId: existing.sessionId },
          data: {
            orderIds: orderIdsStr,
          },
        });
      }
      return this.getSessionDetails(sessionType, userId, userRole.toUpperCase(), existing.sessionId);
    }

    const orderIdsStr = orderIds.join(',');
    const session = await this.prisma.scanSession.create({
      data: {
        userId,
        userRole: userRole.toUpperCase(),
        sessionType,
        status: 'IN_PROGRESS',
        orderIds: orderIdsStr,
      },
    });

    return this.getSessionDetails(sessionType, userId, userRole.toUpperCase(), session.sessionId);
  }

  /**
   * Scans and validates a parcel inside a scan session.
   */
  async scanParcel(sessionType: SessionType, sessionId: string, qrData: string, user: any) {
    let session = sessionId ? await this.prisma.scanSession.findUnique({
      where: { sessionId },
    }) : null;

    const userId = user?.id ? String(user.id) : (session?.userId || 'SYSTEM');
    const userRole = user?.role ? String(user.role).toUpperCase() : (session?.userRole?.toUpperCase() || 'SYSTEM');

    if (!session || session.status !== 'IN_PROGRESS') {
      session = await this.prisma.scanSession.findFirst({
        where: {
          userId,
          userRole,
          sessionType,
          status: 'IN_PROGRESS',
        },
      });

      if (!session) {
        session = await this.prisma.scanSession.create({
          data: {
            userId,
            userRole,
            sessionType,
            status: 'IN_PROGRESS',
            orderIds: '',
          },
        });
      }
    }

    sessionId = session.sessionId;

    let decoded: QrContent;
    try {
      decoded = decodeQrData(qrData);
    } catch (err: any) {
      throw new QrValidationError(err.message);
    }

    const rawScan = String(qrData || '').trim();
    const cleanScanId = rawScan.replace(/^QR-/, '').replace(/-PCL-\d+$/, '').replace(/^ORD-/, '').replace(/^PCL-/, '');
    const mappedPclId = rawScan.replace(/^QR-/, 'PCL-').replace(/^QR-(\d+-\d+)-PCL-(\d+)$/, 'PCL-$1-$2');

    // Fast indexed primary key lookup first (< 2ms)
    let parcel = decoded.parcelId ? await this.prisma.parcel.findUnique({
      where: { parcelId: decoded.parcelId }
    }) : null;

    if (!parcel) {
      parcel = await this.prisma.parcel.findFirst({
        where: {
          OR: [
            { parcelId: decoded.parcelId },
            { parcelId: rawScan },
            { parcelId: mappedPclId },
            { parcelId: `PCL-${cleanScanId}-1` },
            { qrCodeValue: rawScan },
            { qrCodeValue: decoded.parcelId },
            { qrCodeValue: mappedPclId },
            { verificationToken: decoded.parcelId },
            { verificationToken: decoded.verificationToken },
            { orderId: rawScan },
            { orderId: cleanScanId },
            { orderId: `ORD-${cleanScanId}` },
          ]
        }
      });
    }

    if (!parcel) {
      throw new QrValidationError('Scanned QR parcel not found in database');
    }

    // Validate verificationToken if present in scanned QR
    if (decoded.verificationToken && parcel.verificationToken) {
      validateVerificationToken(decoded.verificationToken, parcel.verificationToken);
    }

    // Find the order for the parcel (fast single query matching on phase)
    let order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: parcel.orderId },
          { orderId: parcel.orderId },
          { orderId: `ORD-${cleanScanId}` }
        ],
      }
    });
    if (!order) {
      order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { id: parcel.orderId },
            { orderId: parcel.orderId },
            { orderId: `ORD-${cleanScanId}` }
          ],
          phase: 'PICKUP',
        }
      });
    }

    if (!order) {
      throw new QrValidationError('Parcel order not found.');
    }

    // Validate user assignment if userRole is SHG or TRANSPORTER
    if (userRole === 'SHG' || userRole === 'TRANSPORTER') {
      const userIdsToCheck = Array.from(new Set([String(userId), user?.authId, String(user?.id)].filter(Boolean)));

      const isTransporterDirect = userRole === 'TRANSPORTER' && (
        userIdsToCheck.includes(String(order.pickupTransporterId)) ||
        userIdsToCheck.includes(String(order.dropTransporterId)) ||
        userIdsToCheck.includes(String(order.returnTransporterId))
      );

      const isShgDirect = userRole === 'SHG' && (
        userIdsToCheck.includes(String(order.pickupShgId)) ||
        userIdsToCheck.includes(String(order.dropShgId))
      );

      if (!isTransporterDirect && !isShgDirect) {
        const allOrdersForMaster = await this.prisma.order.findMany({
          where: { orderId: order.orderId }
        });
        const orderIds = allOrdersForMaster.map((o: any) => o.id);

        const assignment = await this.prisma.orderAssignment.findFirst({
          where: {
            orderId: { in: orderIds },
            assigneeId: { in: userIdsToCheck },
            assigneeType: userRole,
          }
        });

        if (!assignment) {
          // If SHG is approved and scanning an order, auto-bind to the scanning SHG for pickup or drop leg
          if (userRole === 'SHG') {
            const isDropOrder = order.phase === 'DROP' || ['IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_SHG', 'DISPATCHED', 'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'PARCEL_WITH_DROP_SHG', 'PARCEL_AT_DROP_SHG'].includes(order.mainStatus);
            if (isDropOrder) {
              await this.prisma.order.update({
                where: { id: order.id },
                data: {
                  dropShgId: String(userId),
                  dropShgStatus: 'ACCEPTED',
                }
              });
              await this.prisma.orderAssignment.create({
                data: {
                  orderId: order.id,
                  assigneeId: String(userId),
                  assigneeType: 'SHG',
                  role: 'DROP',
                  status: 'ACCEPTED',
                }
              }).catch(() => { });
            } else {
              await this.prisma.order.update({
                where: { id: order.id },
                data: {
                  pickupShgId: String(userId),
                  pickupShgStatus: 'ACCEPTED',
                }
              });
              await this.prisma.orderAssignment.create({
                data: {
                  orderId: order.id,
                  assigneeId: String(userId),
                  assigneeType: 'SHG',
                  role: 'PICKUP',
                  status: 'ACCEPTED',
                }
              }).catch(() => { });
            }
          } else {
            throw new QrValidationError('Parcel not assigned to current user.');
          }
        } else {
          if (userRole === 'TRANSPORTER' && assignment.status === 'PENDING') {
            // Auto-accept pending assignment when scanning
            await this.prisma.orderAssignment.updateMany({
              where: {
                orderId: order.id,
                assigneeId: { in: userIdsToCheck },
                assigneeType: 'TRANSPORTER',
              },
              data: { status: 'ACCEPTED' }
            });
          }

          if (assignment.status === 'REJECTED') {
            throw new QrValidationError('Assignment was rejected');
          }
        }

        // Auto-accept pending SHG assignment on pickup scan
        if (userRole === 'SHG' && assignment.status === 'PENDING') {
          await this.prisma.orderAssignment.update({
            where: { id: assignment.id },
            data: { status: 'ACCEPTED' }
          }).catch(() => { });
        }
      }
    }

    // Dynamic session order scoping: Add the scanned order to session.orderIds if not already there
    const orderIdsList = (session.orderIds || '').split(',').map((id: string) => id.trim()).filter(Boolean);
    if (!orderIdsList.includes(order.orderId) && !orderIdsList.includes(order.id)) {
      const updatedOrderIds = [...orderIdsList, order.orderId].join(',');
      await this.prisma.scanSession.update({
        where: { sessionId },
        data: { orderIds: updatedOrderIds }
      });
      session.orderIds = updatedOrderIds;
    }

    // Validate State Machine Transition
    determineTransition(sessionType, userRole, userId, parcel, order);

    // Duplicate Scan Protection
    const existingItem = await this.prisma.scanSessionItem.findUnique({
      where: {
        sessionId_parcelId: {
          sessionId,
          parcelId: parcel.parcelId,
        },
      },
    });

    if (existingItem) {
      throw new QrValidationError('Parcel already scanned in this session.');
    }

    // Register scanned item in transient session
    await this.prisma.scanSessionItem.create({
      data: {
        sessionId,
        parcelId: parcel.parcelId,
      },
    });

    return await this.getSessionDetails(sessionType, userId, userRole, sessionId);
  }

  /**
   * Removes a parcel from the active transient session.
   */
  async removeParcelFromSession(sessionId: string, parcelId: string) {
    const session = await this.prisma.scanSession.findUnique({
      where: { sessionId },
    });

    if (!session || session.status !== 'IN_PROGRESS') {
      throw new QrValidationError('Session expired.');
    }

    await this.prisma.scanSessionItem.deleteMany({
      where: {
        sessionId,
        parcelId,
      },
    });

    return this.getSessionDetails(session.sessionType as SessionType, session.userId, session.userRole, sessionId);
  }

  /**
   * Commits the scan session, executing updates in a single database transaction.
   */
  async confirmSession(sessionType: SessionType, sessionId: string) {
    const session = await this.prisma.scanSession.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            parcel: true,
          },
        },
      },
    });

    if (!session) {
      throw new QrValidationError('Session expired.');
    }

    // Idempotency safety check
    if (session.status === 'CONFIRMED') {
      return { success: true, message: `${sessionType} already completed.` };
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new QrValidationError('Session cannot be confirmed');
    }

    // Detect missing parcels (Warning check)
    const orderIdsList = (session.orderIds || '').split(',').map((id: string) => id.trim()).filter(Boolean);
    const ordersInSession = await this.prisma.order.findMany({
      where: {
        OR: [
          { id: { in: orderIdsList } },
          { orderId: { in: orderIdsList } }
        ]
      },
      select: { phase: true }
    });
    const orderPhases = Array.from(new Set(ordersInSession.map((o: any) => o.phase)));

    const expectedParcels = await this.prisma.parcel.findMany({
      where: {
        orderId: { in: orderIdsList },
        flowType: { in: ['PICKUP', 'DROP'] },
      },
    });

    const scannedIds = new Set(session.items.map((i: any) => i.parcelId));
    const missing = expectedParcels.filter((p: any) => !scannedIds.has(p.parcelId));

    if (missing.length > 0) {
      throw new QrValidationError('Missing parcel detected.');
    }

    await this.prisma.$transaction(async (tx: any) => {
      for (const item of session.items) {
        const parcel = item.parcel;

        let order = await tx.order.findFirst({
          where: {
            OR: [
              { id: parcel.orderId },
              { orderId: parcel.orderId }
            ],
            phase: 'DROP',
          }
        });
        if (!order) {
          order = await tx.order.findFirst({
            where: {
              OR: [
                { id: parcel.orderId },
                { orderId: parcel.orderId }
              ],
              phase: 'PICKUP',
            }
          });
        }

        if (!order) {
          throw new QrValidationError(`Order associated with parcel ${parcel.parcelId} not found`);
        }

        const transition = determineTransition(
          order.phase as SessionType,
          session.userRole,
          session.userId,
          parcel,
          order
        );

        // Update Parcel state
        await tx.parcel.update({
          where: { parcelId: parcel.parcelId },
          data: {
            parcelStatus: transition.nextParcelStatus,
            currentHolderId: transition.nextHolderId,
            currentHolderType: transition.nextHolderType,
          },
        });

        // Append to Scan History
        await tx.parcelScanHistory.create({
          data: {
            parcelId: parcel.parcelId,
            orderId: parcel.orderId,
            productId: parcel.productId,
            productName: parcel.productName,
            userRole: session.userRole,
            userId: session.userId,
            action: transition.action,
            currentHolder: transition.nextHolderId,
            currentStage: transition.nextParcelStatus,
            scanResult: 'SUCCESS',
            remarks: transition.message,
          },
        });

        // Sync order status columns
        let mainStatus = transition.nextParcelStatus;
        const normalizedMainStatus = normalizeStatus(mainStatus);
        let pickupShgStatus = order.pickupShgStatus;
        let pickupTransporterStatus = order.pickupTransporterStatus;
        let dropShgStatus = order.dropShgStatus;
        let dropTransporterStatus = order.dropTransporterStatus;

        if (normalizedMainStatus === 'PARCEL_PICKED') {
          pickupShgStatus = 'PICKED';
          pickupTransporterStatus = 'PENDING';
          await triggerTransporterPickupBroadcast(tx, order.id);
        } else if (normalizedMainStatus === 'TRANSPORTER_ACCEPTED') {
          pickupShgStatus = 'COMPLETED';
          pickupTransporterStatus = 'ACCEPTED';
        } else if (normalizedMainStatus === 'IN_TRANSIT' || (normalizedMainStatus as string) === 'IN_TRANSIT_TO_HUB' || mainStatus === 'IN_TRANSIT_TO_HUB') {
          pickupShgStatus = 'DROPPED';
          pickupTransporterStatus = 'PICKED';
        } else if (normalizedMainStatus === 'AT_GMU') {
          pickupTransporterStatus = 'COMPLETED';
          await (tx.redirectedOrder as any).updateMany({
            where: { orderId: order.id },
            data: { completedAt: new Date(), status: 'COMPLETED' }
          }).catch(() => { });
        } else if (normalizedMainStatus === 'STORED' || mainStatus === 'STORED') {
          pickupShgStatus = 'DROPPED';
          pickupTransporterStatus = 'DROPPED';
          dropShgStatus = 'ACCEPTED';
          dropTransporterStatus = 'PENDING';
          await triggerTransporterDropBroadcast(tx, order.id);
        } else if (normalizedMainStatus === 'OUT_FOR_DELIVERY' || mainStatus === 'DISPATCHED' || mainStatus === 'IN_TRANSIT_TO_BUYER' || mainStatus === 'IN_TRANSIT_TO_DROP_SHG' || mainStatus === 'IN_TRANSIT_TO_SHG') {
          dropTransporterStatus = 'PICKED';
        } else if (normalizedMainStatus === 'AT_BUYER_SHG' || mainStatus === 'PARCEL_WITH_DROP_SHG' || mainStatus === 'PARCEL_AT_DROP_SHG') {
          dropTransporterStatus = 'COMPLETED';
          dropShgStatus = 'PICKED';
        } else if (normalizedMainStatus === 'DELIVERED') {
          dropShgStatus = 'DROPPED';
          dropTransporterStatus = 'COMPLETED';
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            mainStatus,
            pickupShgStatus,
            pickupTransporterStatus,
            dropShgStatus,
            dropTransporterStatus,
          },
        });

        // Align schemas if necessary by updating both public and gmu order entries
        await tx.$executeRawUnsafe(`
          UPDATE public."Order"
          SET 
            "mainStatus" = $1,
            "pickupShgStatus" = $2,
            "pickupTransporterStatus" = $3,
            "dropShgStatus" = $4,
            "dropTransporterStatus" = $5,
            "updatedAt" = NOW()
          WHERE id = $6;
        `, mainStatus, pickupShgStatus, pickupTransporterStatus, dropShgStatus, dropTransporterStatus, order.id);

        if (sessionType === 'PICKUP' && normalizeStatus(transition.nextParcelStatus) === 'PARCEL_PICKED') {
          await tx.orderAssignment.updateMany({
            where: {
              orderId: order.id,
              assigneeId: session.userId,
              role: 'PICKUP',
            },
            data: {
              status: 'COMPLETED',
            },
          });
        }
      }

      // Mark session as complete
      await tx.scanSession.update({
        where: { sessionId },
        data: {
          status: 'CONFIRMED',
        },
      });
    });

    return { success: true, message: `${sessionType} session confirmed successfully.` };
  }

  async confirmSessionOrder(
    sessionType: SessionType,
    userId: string,
    userRole: string,
    sessionId: string,
    orderId: string
  ) {
    let session = await this.prisma.scanSession.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            parcel: true,
          },
        },
      },
    });

    if (!session) {
      // Auto-fallback: check if user has an active IN_PROGRESS session
      session = await this.prisma.scanSession.findFirst({
        where: {
          userId,
          userRole: (userRole || 'SHG').toUpperCase(),
          sessionType,
          status: 'IN_PROGRESS',
        },
        include: {
          items: {
            include: {
              parcel: true,
            },
          },
        },
      });
    }

    if (!session) {
      throw new QrValidationError('Session expired or not found.');
    }

    if (session.status === 'CONFIRMED') {
      return { success: true, message: `Order already completed.` };
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new QrValidationError('Session cannot be confirmed');
    }

    const cleanId = String(orderId || '').replace(/^pickup-/, '').replace(/^drop-/, '').replace(/^ORD-/, '');

    let order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderId: orderId },
          { id: cleanId },
          { orderId: cleanId },
          { id: `ORD-${cleanId}` },
          { orderId: `ORD-${cleanId}` }
        ]
      }
    });

    if (!order) {
      throw new QrValidationError(`Order ${orderId} not found`);
    }

    const expectedParcels = await this.prisma.parcel.findMany({
      where: {
        OR: [
          { orderId: order.orderId },
          { orderId: order.id },
          { orderId: `ORD-${cleanId}` },
          { orderId: cleanId }
        ]
      },
    });

    let sessionItemsForOrder = session.items.filter(
      (item: any) => item.parcel && (
        item.parcel.orderId === order.orderId ||
        item.parcel.orderId === order.id ||
        item.parcel.orderId.includes(cleanId) ||
        String(item.parcelId).includes(cleanId)
      )
    );

    // If session items were attached without matching orderId directly, use all session items that belong to this order
    if (sessionItemsForOrder.length === 0 && session.items.length > 0) {
      sessionItemsForOrder = session.items.filter((i: any) => i.parcel);
    }

    const scannedIds = new Set(sessionItemsForOrder.map((i: any) => String(i.parcelId || i.parcel?.parcelId || '').trim()));
    const missing = expectedParcels.filter((p: any) => !scannedIds.has(String(p.parcelId || '').trim()));

    // Check if any "missing" parcel was actually already scanned/collected in DB
    const trulyMissing: any[] = [];
    for (const p of missing) {
      const isAlreadyScanned = p.parcelStatus === 'PARCEL_AT_SHG' ||
        p.parcelStatus === 'COLLECTED' ||
        p.parcelStatus === 'PICKED' ||
        p.parcelStatus === 'SHG_PICKUP' ||
        p.parcelStatus === 'IN_TRANSIT';
      if (!isAlreadyScanned) {
        trulyMissing.push(p);
      }
    }

    if (expectedParcels.length > 0 && trulyMissing.length > 0 && sessionItemsForOrder.length < expectedParcels.length) {
      throw new QrValidationError(`All parcels for Order ${order.orderId} must be scanned before confirming pickup (${expectedParcels.length - trulyMissing.length}/${expectedParcels.length} scanned).`);
    }

    await this.prisma.$transaction(async (tx: any) => {
      const userRoleFinal = session.userRole || userRole || 'SHG';
      const userIdFinal = session.userId || userId;

      for (const item of sessionItemsForOrder) {
        const parcel = item.parcel;
        if (!parcel) continue;

        const transition = determineTransition(
          (order.phase || sessionType) as SessionType,
          userRoleFinal,
          userIdFinal,
          parcel,
          order
        );

        await tx.parcel.update({
          where: { parcelId: parcel.parcelId },
          data: {
            parcelStatus: transition.nextParcelStatus,
            currentHolderId: transition.nextHolderId,
            currentHolderType: transition.nextHolderType,
          },
        });

        await tx.parcelScanHistory.create({
          data: {
            parcelId: parcel.parcelId,
            orderId: parcel.orderId,
            productId: parcel.productId,
            productName: parcel.productName,
            userRole: userRoleFinal,
            userId: userIdFinal,
            action: transition.action,
            currentHolder: transition.nextHolderId,
            currentStage: transition.nextParcelStatus,
            scanResult: 'SUCCESS',
            remarks: transition.message,
          },
        });
      }

      // Sync order status columns based on the actor role and session type
      const roleUpper = String(userRoleFinal || session.userRole || userRole || '').toUpperCase();
      const isPhase2DropLeg = sessionType === 'DROP' || order.phase === 'DROP';
      let mainStatus = order.mainStatus;
      let pickupShgStatus = order.pickupShgStatus;
      let pickupTransporterStatus = order.pickupTransporterStatus;
      let dropShgStatus = order.dropShgStatus;
      let dropTransporterStatus = order.dropTransporterStatus;
      let pickupShgId = order.pickupShgId;
      let pickupTransporterId = order.pickupTransporterId;
      let dropShgId = order.dropShgId;
      let dropTransporterId = order.dropTransporterId;

      if (roleUpper === 'TRANSPORTER') {
        if (isPhase2DropLeg) {
          dropTransporterStatus = 'PICKED';
          dropTransporterId = String(userIdFinal);
          mainStatus = 'IN_TRANSIT_TO_DROP_SHG';
        } else {
          // Transporter picking up from Pickup SHG to carry to GMU Hub
          pickupShgStatus = 'DROPPED';
          pickupTransporterStatus = 'PICKED';
          pickupTransporterId = String(userIdFinal);
          mainStatus = 'IN_TRANSIT_TO_HUB';
        }
      } else if (roleUpper === 'SHG') {
        if (isPhase2DropLeg) {
          // Drop SHG receiving from Transporter OR delivering to Buyer
          if (order.mainStatus === 'IN_TRANSIT_TO_DROP_SHG' || order.mainStatus === 'DISPATCHED' || (order.dropShgStatus !== 'ACCEPTED' && order.dropShgStatus !== 'DELIVERED')) {
            dropShgStatus = 'PICKED';
            dropShgId = String(userIdFinal);
            dropTransporterStatus = 'COMPLETED';
            mainStatus = 'PARCEL_AT_DROP_SHG';
          } else {
            dropShgStatus = 'DELIVERED';
            dropShgId = String(userIdFinal);
            mainStatus = 'DELIVERED';
          }
        } else {
          pickupShgStatus = 'PICKED';
          pickupShgId = String(userIdFinal);
          mainStatus = 'PARCEL_AT_SHG';
        }
      } else if (roleUpper === 'GMU' || roleUpper === 'ADMIN') {
        if (isPhase2DropLeg) {
          mainStatus = 'DISPATCHED';
        } else {
          pickupTransporterStatus = 'COMPLETED';
          mainStatus = 'HUB_RECEIVED';
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          mainStatus,
          pickupShgStatus,
          pickupShgId,
          pickupTransporterId,
          pickupTransporterStatus,
          dropShgId,
          dropShgStatus,
          dropTransporterId,
          dropTransporterStatus,
        },
      });

    // Update Order Assignment according to role
    const userIdsToCheck = Array.from(new Set([String(userIdFinal), String(userId)].filter(Boolean)));
    if (roleUpper === 'TRANSPORTER') {
      await tx.orderAssignment.updateMany({
        where: {
          orderId: { in: [order.id, order.orderId] },
          assigneeId: { in: userIdsToCheck },
          role: sessionType === 'PICKUP' ? 'PICKUP' : 'DROP',
        },
        data: {
          status: 'ACCEPTED',
        },
      });
    } else if (roleUpper === 'SHG' && sessionType === 'PICKUP') {
      await tx.orderAssignment.updateMany({
        where: {
          orderId: { in: [order.id, order.orderId] },
          assigneeId: { in: userIdsToCheck },
          role: 'PICKUP',
        },
        data: {
          status: 'ACCEPTED',
        },
      });

      // Broadcast request to all approved Transporters when SHG picks up from Seller
      const approvedTransporters = await tx.user.findMany({
        where: { role: 'TRANSPORTER', applicationStatus: 'APPROVED', deletedAt: null },
        select: { id: true }
      });
      const targetTransporterIds = new Set<string>();
      if (order.pickupTransporterId) targetTransporterIds.add(String(order.pickupTransporterId));
      approvedTransporters.forEach((t: any) => targetTransporterIds.add(String(t.id)));

      if (targetTransporterIds.size > 0) {
        await tx.orderAssignment.deleteMany({
          where: {
            OR: [
              { orderId: order.id, role: 'PICKUP', assigneeType: 'TRANSPORTER' },
              { orderId: order.orderId, role: 'PICKUP', assigneeType: 'TRANSPORTER' }
            ]
          }
        });
        const assignmentData: any[] = [];
        targetTransporterIds.forEach((tId) => {
          assignmentData.push({
            orderId: order.id,
            assigneeId: String(tId),
            assigneeType: 'TRANSPORTER',
            role: 'PICKUP',
            status: 'PENDING'
          });
        });
        await tx.orderAssignment.createMany({
          data: assignmentData,
          skipDuplicates: true,
        });
      }
    }

    await tx.scanSessionItem.deleteMany({
      where: {
        sessionId,
        parcelId: { in: Array.from(scannedIds) },
      },
    });

    const cleanNum = (idStr: string) => String(idStr || '').replace(/^(pickup|drop)-/i, '').replace(/^ORD-/i, '').trim().toLowerCase();
    const currentCleanId = cleanNum(order.orderId || order.id || cleanId);

    const currentOrderIds = (session.orderIds || '').split(',').map((id: string) => id.trim()).filter(Boolean);
    const remainingOrderIds = currentOrderIds.filter((id) => cleanNum(id) !== currentCleanId);

    if (remainingOrderIds.length === 0) {
      await tx.scanSession.update({
        where: { sessionId },
        data: {
          orderIds: '',
          status: 'CONFIRMED',
        },
      });
    } else {
      await tx.scanSession.update({
        where: { sessionId },
        data: {
          orderIds: remainingOrderIds.join(','),
        },
      });
    }
  }, { timeout: 30000 });

let updatedSession: any = null;
try {
  updatedSession = await this.getSessionDetails(sessionType, session.userId, session.userRole, sessionId);
} catch (e) {
  // Session may be CONFIRMED
}

return {
  success: true,
  message: `Order ${orderId} confirmed successfully.`,
  session: updatedSession
};
  }
}
