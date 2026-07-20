export class QrValidationError extends Error {
  constructor(message: string, public readonly statusCode: number = 400) {
    super(message);
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
  const trimmed = data.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed.parcelId) {
        throw new QrValidationError('Invalid QR payload: missing parcelId');
      }
      return {
        parcelId: parsed.parcelId,
        verificationToken: parsed.verificationToken || '',
        version: parsed.version || 1,
      };
    } catch (err: any) {
      throw new QrValidationError('Malformed JSON in QR code: ' + err.message);
    }
  } else {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 1) {
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
  if (dbToken && scannedToken !== dbToken) {
    throw new QrValidationError('Verification token invalid');
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
  const currentStatus = normalizeStatus(parcel.parcelStatus);
  const finalRole = userRole.toUpperCase();

  // Validate state machine transitions based on current status and user role
  if (finalRole === 'SHG') {
    if (currentStatus === 'READY_FOR_PICKUP') {
      return {
        nextParcelStatus: 'PARCEL_AT_SHG',
        nextHolderId: userId,
        nextHolderType: 'SHG',
        action: 'SHG_PICKUP',
        message: 'Parcel picked up from seller by SHG',
      };
    }
    if (currentStatus === 'PARCEL_PICKED') {
      if (!order.pickupTransporterId || order.pickupTransporterStatus !== 'ACCEPTED') {
        throw new QrValidationError('You cannot verify handover until the transporter has accepted the request.');
      }
      // SHG Handover to Transporter
      const nextHolder = order.pickupTransporterId ? String(order.pickupTransporterId) : 'TRANSPORTER';
      return {
        nextParcelStatus: 'PARCEL_AT_TRANSPORTER',
        nextHolderId: nextHolder,
        nextHolderType: 'TRANSPORTER',
        action: 'SHG_TRANSPORTER_DELIVER',
        message: 'Parcel delivered to Transporter by SHG',
      };
    }
    if (currentStatus === 'AT_BUYER_SHG' || currentStatus === 'OUT_FOR_DELIVERY') {
      const isDelivery = legType === 'delivery' || parcel.parcelStatus === 'PARCEL_WITH_DROP_SHG';
      if (isDelivery) {
        // Final delivery to buyer
        return {
          nextParcelStatus: 'DELIVERED',
          nextHolderId: String(order.buyerId),
          nextHolderType: 'BUYER',
          action: 'FINAL_DELIVERY',
          message: 'Parcel delivered to Buyer',
        };
      } else {
        if (currentStatus === 'OUT_FOR_DELIVERY' && userRole === 'SHG') {
          throw new QrValidationError('The Transporter has not submitted the handover delivery yet. Please wait for the Transporter to submit.');
        }
        // SHG receiving from transporter
        return {
          nextParcelStatus: 'PARCEL_WITH_DROP_SHG',
          nextHolderId: userId,
          nextHolderType: 'SHG',
          action: 'SHG_DROP_PICKUP',
          message: 'Parcel picked up by drop SHG from transporter',
        };
      }
    }
  }

  if (finalRole === 'TRANSPORTER') {
    if (currentStatus === 'PARCEL_PICKED') {
      throw new QrValidationError('The SHG has not submitted the handover delivery yet. Please wait for the SHG to submit.');
    }
    if (currentStatus === 'TRANSPORTER_ACCEPTED') {
      // Transporter loading parcel for transit to hub
      return {
        nextParcelStatus: 'IN_TRANSIT_TO_HUB',
        nextHolderId: userId,
        nextHolderType: 'TRANSPORTER',
        action: 'TRANSPORTER_PICKUP',
        message: 'Parcel loaded by Transporter from SHG',
      };
    }
    if (currentStatus === 'IN_TRANSIT') {
      // Transporter dropping at GMU Hub
      return {
        nextParcelStatus: 'HUB_RECEIVED',
        nextHolderId: 'HUB',
        nextHolderType: 'WAREHOUSE',
        action: 'TRANSPORTER_HUB_DELIVER',
        message: 'Parcel delivered to GMU Hub by Transporter',
      };
    }
    if (currentStatus === 'READY_FOR_DISPATCH' || currentStatus === 'STORED' || currentStatus === 'AT_GMU') {
      // Transporter loading from Hub for delivery
      return {
        nextParcelStatus: 'IN_TRANSIT_TO_BUYER',
        nextHolderId: userId,
        nextHolderType: 'TRANSPORTER',
        action: 'TRANSPORTER_DROP_PICKUP',
        message: 'Parcel loaded for delivery by Transporter from Warehouse',
      };
    }
    if (currentStatus === 'OUT_FOR_DELIVERY') {
      // Transporter dropping off at Buyer SHG
      const nextHolder = order.dropShgId ? String(order.dropShgId) : 'SHG';
      return {
        nextParcelStatus: 'PARCEL_AT_DROP_SHG',
        nextHolderId: nextHolder,
        nextHolderType: 'SHG',
        action: 'TRANSPORTER_SHG_DELIVER',
        message: 'Parcel delivered to Drop SHG by Transporter',
      };
    }
  }

  if (finalRole === 'GMU' || finalRole === 'ADMIN' || finalRole === 'SUPER_ADMIN') {
    if (currentStatus === 'IN_TRANSIT') {
      return {
        nextParcelStatus: 'HUB_RECEIVED',
        nextHolderId: 'HUB',
        nextHolderType: 'WAREHOUSE',
        action: 'WAREHOUSE_INTAKE',
        message: 'Parcel intake complete at GMU Hub',
      };
    }
    if (currentStatus === 'AT_GMU') {
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

  throw new QrValidationError('Parcel status invalid.');
}

/**
 * Reusable QR Verification Engine implementation
 */
export class QrVerificationEngine {
  constructor(private readonly prisma: any) {}

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

    // Query all expected parcels for these orders matching the flowType phase
    const expectedParcels = await this.prisma.parcel.findMany({
      where: {
        orderId: { in: orderIdsList },
        flowType: { in: ['PICKUP', 'DROP'] },
      },
    });

    const scannedIds = new Set(session.items.map((i: any) => i.parcelId));

    const scanned = session.items.map((item: any) => ({
      parcelId: item.parcel.parcelId,
      orderId: item.parcel.orderId,
      productName: item.parcel.productName,
      parcelNumber: item.parcel.parcelNumber,
      totalParcels: item.parcel.totalParcels,
      quantity: item.parcel.quantity,
      weight: item.parcel.weight,
      parcelStatus: item.parcel.parcelStatus,
    }));

    const remaining = expectedParcels
      .filter((p: any) => !scannedIds.has(p.parcelId))
      .map((p: any) => ({
        parcelId: p.parcelId,
        orderId: p.orderId,
        productName: p.productName,
        parcelNumber: p.parcelNumber,
        totalParcels: p.totalParcels,
        quantity: p.quantity,
        weight: p.weight,
        parcelStatus: p.parcelStatus,
      }));

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
    const session = await this.prisma.scanSession.findUnique({
      where: { sessionId },
    });

    if (!session || session.status !== 'IN_PROGRESS') {
      throw new QrValidationError('Session expired.');
    }

    const userId = user?.id ? String(user.id) : session.userId;
    const userRole = user?.role ? String(user.role).toUpperCase() : session.userRole.toUpperCase();

    let decoded: QrContent;
    try {
      decoded = decodeQrData(qrData);
    } catch (err: any) {
      throw new QrValidationError(err.message);
    }

    const parcel = await this.prisma.parcel.findUnique({
      where: { parcelId: decoded.parcelId },
    });

    if (!parcel) {
      throw new QrValidationError('Parcel status invalid.'); // Return generic scanner invalid status message
    }

    // Validate verificationToken
    validateVerificationToken(decoded.verificationToken, parcel.verificationToken);

    // Find the order for the parcel (try DROP phase first, then PICKUP phase)
    let order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: parcel.orderId },
          { orderId: parcel.orderId }
        ],
        phase: 'DROP',
      }
    });
    if (!order) {
      order = await this.prisma.order.findFirst({
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
      throw new QrValidationError('Parcel order not found.');
    }

    // Validate user assignment if userRole is SHG or TRANSPORTER
    if (userRole === 'SHG' || userRole === 'TRANSPORTER') {
      const allOrdersForMaster = await this.prisma.order.findMany({
        where: { orderId: order.orderId }
      });
      const orderIds = allOrdersForMaster.map((o: any) => o.id);

      const assignment = await this.prisma.orderAssignment.findFirst({
        where: {
          orderId: { in: orderIds },
          assigneeId: userId,
          assigneeType: userRole,
        }
      });

      if (!assignment) {
        throw new QrValidationError('Parcel not assigned to current user.');
      }

      if (assignment.status === 'PENDING') {
        throw new QrValidationError('Please accept the assignment first before scanning');
      }

      if (assignment.status === 'REJECTED') {
        throw new QrValidationError('Assignment was rejected');
      }
    }

    // Dynamic session order scoping: Add the scanned order to session.orderIds if not already there
    const orderIdsList = session.orderIds.split(',').map((id: string) => id.trim()).filter(Boolean);
    if (!orderIdsList.includes(order.orderId) && !orderIdsList.includes(order.id)) {
      const updatedOrderIds = [...orderIdsList, order.orderId].join(',');
      await this.prisma.scanSession.update({
        where: { sessionId },
        data: { orderIds: updatedOrderIds }
      });
      session.orderIds = updatedOrderIds;
    }

    // Validate State Machine Transition
    determineTransition(order.phase as SessionType, userRole, userId, parcel, order);

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

    return this.getSessionDetails(sessionType, userId, userRole, sessionId);
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
    const orderIdsList = session.orderIds.split(',').map((id: string) => id.trim()).filter(Boolean);
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
        } else if (normalizedMainStatus === 'TRANSPORTER_ACCEPTED') {
          pickupShgStatus = 'COMPLETED';
          pickupTransporterStatus = 'ACCEPTED';
        } else if (normalizedMainStatus === 'IN_TRANSIT') {
          pickupTransporterStatus = 'PICKED';
        } else if (normalizedMainStatus === 'AT_GMU') {
          pickupTransporterStatus = 'COMPLETED';
        } else if (normalizedMainStatus === 'OUT_FOR_DELIVERY') {
          dropTransporterStatus = 'PICKED';
        } else if (normalizedMainStatus === 'AT_BUYER_SHG') {
          dropTransporterStatus = 'COMPLETED';
          dropShgStatus = 'ACCEPTED';
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

        // Sync with legacy master_orders, pickup_orders, and drop_orders tables
        const masterOrder = await tx.masterOrder.findUnique({
          where: { orderNumber: order.orderId }
        });

        if (masterOrder) {
          let masterOrderStatus = transition.nextParcelStatus;
          const normalizedMasterOrderStatus = normalizeStatus(masterOrderStatus);
          if (normalizedMasterOrderStatus === 'PARCEL_PICKED') {
            masterOrderStatus = 'PARCEL_AT_SHG';
          } else if (normalizedMasterOrderStatus === 'TRANSPORTER_ACCEPTED') {
            masterOrderStatus = 'PARCEL_AT_TRANSPORTER';
          } else if (normalizedMasterOrderStatus === 'IN_TRANSIT') {
            masterOrderStatus = 'IN_TRANSIT_TO_HUB';
          } else if (normalizedMasterOrderStatus === 'AT_GMU') {
            masterOrderStatus = 'HUB_RECEIVED';
          } else if (normalizedMasterOrderStatus === 'OUT_FOR_DELIVERY') {
            masterOrderStatus = 'IN_TRANSIT_TO_BUYER';
          } else if (normalizedMasterOrderStatus === 'AT_BUYER_SHG') {
            masterOrderStatus = 'PARCEL_WITH_DROP_SHG';
          }

          await tx.masterOrder.update({
            where: { id: masterOrder.id },
            data: { status: masterOrderStatus }
          });

          if (normalizedMainStatus === 'PARCEL_PICKED' || normalizedMainStatus === 'TRANSPORTER_ACCEPTED') {
            await tx.pickupOrder.updateMany({
              where: { masterOrderId: masterOrder.id },
              data: { status: 'COMPLETED', pickupTime: new Date() }
            });
          }

          if (normalizedMainStatus === 'AT_BUYER_SHG') {
            await tx.dropOrder.updateMany({
              where: { masterOrderId: masterOrder.id },
              data: { status: session.userRole === 'SHG' ? 'PICKED_UP' : 'ACCEPTED' }
            });
          }

          if (normalizedMainStatus === 'DELIVERED') {
            await tx.dropOrder.updateMany({
              where: { masterOrderId: masterOrder.id },
              data: { status: 'COMPLETED' }
            });
          }
        }

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

    if (session.status === 'CONFIRMED') {
      return { success: true, message: `Order already completed.` };
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new QrValidationError('Session cannot be confirmed');
    }

    let order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderId: orderId }
        ],
        phase: 'DROP',
      }
    });
    if (!order) {
      order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { id: orderId },
            { orderId: orderId }
          ],
          phase: 'PICKUP',
        }
      });
    }

    if (!order) {
      throw new QrValidationError(`Order ${orderId} not found`);
    }

    const expectedParcels = await this.prisma.parcel.findMany({
      where: {
        orderId: order.orderId,
        flowType: { in: ['PICKUP', 'DROP'] },
      },
    });

    const sessionItemsForOrder = session.items.filter(
      (item: any) => item.parcel.orderId === order.orderId
    );
    const scannedIds = new Set(sessionItemsForOrder.map((i: any) => i.parcelId));
    const missing = expectedParcels.filter((p: any) => !scannedIds.has(p.parcelId));

    if (missing.length > 0) {
      throw new QrValidationError(`Missing parcel(s) detected for Order ${orderId}`);
    }

    await this.prisma.$transaction(async (tx: any) => {
      for (const item of sessionItemsForOrder) {
        const parcel = item.parcel;

        const transition = determineTransition(
          order.phase as SessionType,
          session.userRole,
          session.userId,
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
            userRole: session.userRole,
            userId: session.userId,
            action: transition.action,
            currentHolder: transition.nextHolderId,
            currentStage: transition.nextParcelStatus,
            scanResult: 'SUCCESS',
            remarks: transition.message,
          },
        });

        let mainStatus = transition.nextParcelStatus;
        const normalizedMainStatus = normalizeStatus(mainStatus);
        let pickupShgStatus = order.pickupShgStatus;
        let pickupTransporterStatus = order.pickupTransporterStatus;
        let dropShgStatus = order.dropShgStatus;
        let dropTransporterStatus = order.dropTransporterStatus;

        if (normalizedMainStatus === 'PARCEL_PICKED') {
          pickupShgStatus = 'PICKED';
        } else if (normalizedMainStatus === 'TRANSPORTER_ACCEPTED') {
          pickupShgStatus = 'COMPLETED';
          pickupTransporterStatus = 'ACCEPTED';
        } else if (normalizedMainStatus === 'IN_TRANSIT') {
          pickupTransporterStatus = 'PICKED';
        } else if (normalizedMainStatus === 'AT_GMU') {
          pickupTransporterStatus = 'COMPLETED';
        } else if (normalizedMainStatus === 'OUT_FOR_DELIVERY') {
          dropTransporterStatus = 'PICKED';
        } else if (normalizedMainStatus === 'AT_BUYER_SHG') {
          dropTransporterStatus = 'COMPLETED';
          dropShgStatus = session.userRole === 'SHG' ? 'PICKED_UP' : 'ACCEPTED';
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

        const masterOrder = await tx.masterOrder.findUnique({
          where: { orderNumber: order.orderId }
        });

        if (masterOrder) {
          let masterOrderStatus = transition.nextParcelStatus;
          const normalizedMasterOrderStatus = normalizeStatus(masterOrderStatus);
          if (normalizedMasterOrderStatus === 'PARCEL_PICKED') {
            masterOrderStatus = 'PARCEL_AT_SHG';
          } else if (normalizedMasterOrderStatus === 'TRANSPORTER_ACCEPTED') {
            masterOrderStatus = 'PARCEL_AT_TRANSPORTER';
          } else if (normalizedMasterOrderStatus === 'IN_TRANSIT') {
            masterOrderStatus = 'IN_TRANSIT_TO_HUB';
          } else if (normalizedMasterOrderStatus === 'AT_GMU') {
            masterOrderStatus = 'HUB_RECEIVED';
          } else if (normalizedMasterOrderStatus === 'OUT_FOR_DELIVERY') {
            masterOrderStatus = 'IN_TRANSIT_TO_BUYER';
          } else if (normalizedMasterOrderStatus === 'AT_BUYER_SHG') {
            masterOrderStatus = 'PARCEL_WITH_DROP_SHG';
          }

          await tx.masterOrder.update({
            where: { id: masterOrder.id },
            data: { status: masterOrderStatus }
          });

          if (normalizedMainStatus === 'PARCEL_PICKED' || normalizedMainStatus === 'TRANSPORTER_ACCEPTED') {
            await tx.pickupOrder.updateMany({
              where: { masterOrderId: masterOrder.id },
              data: { status: 'COMPLETED', pickupTime: new Date() }
            });
          }

          if (normalizedMainStatus === 'AT_BUYER_SHG') {
            await tx.dropOrder.updateMany({
              where: { masterOrderId: masterOrder.id },
              data: { status: session.userRole === 'SHG' ? 'PICKED_UP' : 'ACCEPTED' }
            });
          }

          if (normalizedMainStatus === 'DELIVERED') {
            await tx.dropOrder.updateMany({
              where: { masterOrderId: masterOrder.id },
              data: { status: 'COMPLETED' }
            });
          }
        }

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

      await tx.scanSessionItem.deleteMany({
        where: {
          sessionId,
          parcelId: { in: Array.from(scannedIds) },
        },
      });

      const currentOrderIds = session.orderIds.split(',').map((id: string) => id.trim()).filter(Boolean);
      const remainingOrderIds = currentOrderIds.filter((id) => id !== order.orderId && id !== order.id);

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
    });

    return { success: true, message: `Order ${orderId} confirmed successfully.` };
  }
}
