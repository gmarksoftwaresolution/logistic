import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as QRCode from 'qrcode';

@Injectable()
export class QrService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper to generate a random 8-character token
  private generateVerificationToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  async generateQr(orderId: string, regenerate = false, createdBy = 'SYSTEM'): Promise<any[]> {
    // 1. Find the order (support either internal UUID or external custom orderId)
    let order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderId: orderId }
        ]
      }
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const resolvedOrderId = order.orderId; // Custom order number e.g. ORD-PICK-1234

    // 2. Fetch products/items for this order
    const items: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT 
        p.id as "productId",
        p.name as "productName",
        p.weight as "productWeight",
        moi.quantity,
        moi.price
      FROM public.master_orders mo
      JOIN public.master_order_items moi ON mo.id = moi.master_order_id
      JOIN public.products p ON moi.product_id = p.id
      WHERE mo.order_number = $1
    `, resolvedOrderId);

    if (!items || items.length === 0) {
      throw new BadRequestException(`No products found for order ${resolvedOrderId}`);
    }

    const totalParcels = items.length;
    const parcels: any[] = [];

    // 3. For each item, create or retrieve the Parcel
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const parcelNumber = i + 1;

      // Check if parcel already exists (by orderId and productId)
      let parcel = await this.prisma.parcel.findFirst({
        where: {
          orderId: resolvedOrderId,
          productId: item.productId,
          flowType: order.phase,
        }
      });

      if (parcel && !regenerate) {
        parcels.push(parcel);
        continue;
      }

      // Generate verification token
      const verificationToken = this.generateVerificationToken();
      const weightStr = item.productWeight ? `${item.productWeight} KG` : '0.5 KG';

      if (!parcel) {
        // Create parcel first to get its parcelId (UUID)
        parcel = await this.prisma.parcel.create({
          data: {
            orderId: resolvedOrderId,
            productId: item.productId,
            productName: item.productName,
            parcelNumber,
            totalParcels,
            quantity: item.quantity,
            weight: weightStr,
            flowType: order.phase,
            parcelStatus: 'PENDING',
            currentHolderId: String(order.sellerId),
            currentHolderType: 'SELLER',
            verificationToken,
            qrCodeValue: '',
            qrImage: '',
            createdBy,
          }
        });
      } else {
        // Regenerating token
        parcel = await this.prisma.parcel.update({
          where: { parcelId: parcel.parcelId },
          data: {
            verificationToken,
            parcelStatus: 'PENDING',
            currentHolderId: String(order.sellerId),
            currentHolderType: 'SELLER',
          }
        });
      }

      // Construct QR JSON value with actual parcelId
      const qrContent = {
        schemaVersion: 1,
        orderId: resolvedOrderId,
        parcelId: parcel.parcelId,
        productId: String(item.productId),
        productName: item.productName,
        parcelNumber,
        totalParcels,
        quantity: item.quantity,
        weight: weightStr,
        flowType: order.phase,
        verificationToken,
      };

      const qrCodeValue = JSON.stringify(qrContent);
      const qrImage = await QRCode.toDataURL(qrCodeValue);

      // Update parcel with the final QR image and string
      parcel = await this.prisma.parcel.update({
        where: { parcelId: parcel.parcelId },
        data: {
          qrCodeValue,
          qrImage,
        }
      });

      // If regenerating, log to history
      if (regenerate) {
        await this.logScanHistory({
          parcelId: parcel.parcelId,
          orderId: resolvedOrderId,
          productId: item.productId,
          productName: item.productName,
          userRole: 'ADMIN',
          userId: createdBy,
          action: 'REGENERATED',
          currentHolder: String(order.sellerId),
          currentStage: 'PENDING',
          scanResult: 'SUCCESS',
          remarks: 'QR Code regenerated due to damage or loss',
        });
      }

      parcels.push(parcel);
    }

    return parcels;
  }

  async getParcel(parcelId: string): Promise<any> {
    const parcel = await this.prisma.parcel.findUnique({
      where: { parcelId },
    });
    if (!parcel) {
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }
    return parcel;
  }

  async getOrderParcels(orderId: string): Promise<any[]> {
    return this.prisma.parcel.findMany({
      where: { orderId }
    });
  }

  async getHistory(parcelId: string): Promise<any[]> {
    // Verify parcel exists
    await this.getParcel(parcelId);

    return this.prisma.parcelScanHistory.findMany({
      where: { parcelId },
      orderBy: { scanTime: 'desc' },
    });
  }

  async logScanHistory(data: {
    parcelId: string;
    orderId: string;
    productId: number;
    productName: string;
    userRole?: string | null;
    userId?: string | null;
    action: string;
    currentHolder?: string | null;
    currentStage?: string | null;
    scanResult: string;
    remarks?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    await this.prisma.parcelScanHistory.create({
      data: {
        parcelId: data.parcelId,
        orderId: data.orderId,
        productId: data.productId,
        productName: data.productName,
        userRole: data.userRole || null,
        userId: data.userId || null,
        action: data.action,
        currentHolder: data.currentHolder || null,
        currentStage: data.currentStage || null,
        scanResult: data.scanResult,
        remarks: data.remarks || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      }
    });
  }

  async verifyQr(
    parcelId: string,
    verificationToken: string,
    scannedByUserId?: string,
    scannedByUserRole?: string,
    latitude?: number,
    longitude?: number,
    remarks?: string,
    legType?: string
  ): Promise<{ success: boolean; message: string; parcel: any }> {
    // 1. Verify Parcel Exists
    const parcel = await this.prisma.parcel.findUnique({
      where: { parcelId },
    });

    const finalUserId = scannedByUserId || 'SYSTEM';
    const finalUserRole = scannedByUserRole || 'SYSTEM';

    if (!parcel) {
      await this.logScanHistory({
        parcelId,
        orderId: 'UNKNOWN',
        productId: 0,
        productName: 'UNKNOWN',
        userRole: finalUserRole,
        userId: finalUserId,
        action: 'VERIFY',
        currentHolder: 'UNKNOWN',
        currentStage: 'UNKNOWN',
        scanResult: 'FAILED',
        remarks: `Parcel not found: ${parcelId}`,
        latitude,
        longitude,
      });
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }

    // 2. Verify Verification Token
    if (parcel.verificationToken !== verificationToken) {
      await this.logScanHistory({
        parcelId: parcel.parcelId,
        orderId: parcel.orderId,
        productId: parcel.productId,
        productName: parcel.productName,
        userRole: finalUserRole,
        userId: finalUserId,
        action: 'VERIFY',
        currentHolder: parcel.currentHolderId,
        currentStage: parcel.parcelStatus,
        scanResult: 'REJECTED',
        remarks: 'Verification token mismatch',
        latitude,
        longitude,
      });
      throw new BadRequestException('Invalid verification token');
    }

    // 3. Verify Order Exists
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: parcel.orderId },
          { orderId: parcel.orderId }
        ],
        phase: parcel.flowType,
      }
    });

    if (!order) {
      await this.logScanHistory({
        parcelId: parcel.parcelId,
        orderId: parcel.orderId,
        productId: parcel.productId,
        productName: parcel.productName,
        userRole: finalUserRole,
        userId: finalUserId,
        action: 'VERIFY',
        currentHolder: parcel.currentHolderId,
        currentStage: parcel.parcelStatus,
        scanResult: 'FAILED',
        remarks: `Associated order not found: ${parcel.orderId}`,
        latitude,
        longitude,
      });
      throw new NotFoundException(`Order ${parcel.orderId} not found`);
    }

    // 4. Verify Product
    const product = await this.prisma.product.findUnique({
      where: { id: parcel.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${parcel.productId} not found`);
    }

    // 4.1 Update verificationStatus of corresponding order items
    const masterOrder = await this.prisma.masterOrder.findFirst({
      where: { orderNumber: order.orderId }
    });
    if (masterOrder) {
      if (order.phase === 'PICKUP') {
        const pickupOrder = await this.prisma.pickupOrder.findFirst({
          where: { masterOrderId: masterOrder.id }
        });
        if (pickupOrder) {
          await this.prisma.pickupOrderItem.updateMany({
            where: { pickupOrderId: pickupOrder.id, productId: product.id },
            data: { verificationStatus: 'VERIFIED', verifiedTime: new Date() }
          });
        }
      } else if (order.phase === 'DROP') {
        const dropOrder = await this.prisma.dropOrder.findFirst({
          where: { masterOrderId: masterOrder.id }
        });
        if (dropOrder) {
          await this.prisma.dropOrderItem.updateMany({
            where: { dropOrderId: dropOrder.id, productId: product.id },
            data: { verificationStatus: 'VERIFIED', verifiedTime: new Date() }
          });
        }
      }
    }

    // Determine target state based on the current state machine and scanner role
    let nextParcelStatus = parcel.parcelStatus;
    let nextHolderId = parcel.currentHolderId;
    let nextHolderType = parcel.currentHolderType;
    let transitionSuccessMessage = 'Scan verified successfully';
    let transitionAction = 'VERIFY';

    const currentOrderMainStatus = order.mainStatus;
    let orderUpdateFn: (() => Promise<void>) | null = null;

    if (finalUserRole === 'SHG') {
      // Case A: SHG picking up from Seller
      if (order.phase === 'PICKUP' && (legType === 'pickup' || !legType) && (currentOrderMainStatus === 'ORDER_PLACED' || currentOrderMainStatus === 'PICKUP_SHG_ACCEPTED' || currentOrderMainStatus === 'PENDING_PICKUP')) {
        // Verify SHG assignment
        if (order.pickupShgId && String(order.pickupShgId) !== finalUserId) {
          throw new BadRequestException('Order is not assigned to this SHG');
        }

        orderUpdateFn = null;


        nextParcelStatus = 'PARCEL_AT_SHG';
        nextHolderId = finalUserId;
        nextHolderType = 'SHG';
        transitionAction = 'SHG_PICKUP';
        transitionSuccessMessage = 'Parcel picked up from seller by SHG';
      }
      else if (order.phase === 'PICKUP' && (legType !== 'pickup' || !legType) && (currentOrderMainStatus === 'PARCEL_AT_SHG' || currentOrderMainStatus === 'PICKUP_TRANSPORTER_ACCEPTED' || currentOrderMainStatus === 'TRANSPORTER_ACCEPTED')) {
        nextParcelStatus = 'SHG_HANDOVER_VERIFIED';
        nextHolderId = finalUserId;
        nextHolderType = 'SHG';
        transitionAction = 'SHG_HANDOVER_VERIFY';
        transitionSuccessMessage = 'SHG verified parcel handover to transporter';
      }
      // Case B: Drop SHG receiving drop parcel from Transporter
      else if (order.phase === 'DROP' && (legType === 'pickup' || !legType) && (currentOrderMainStatus === 'DISPATCHED' || currentOrderMainStatus === 'DROP_TRANSPORTER_ACCEPTED' || currentOrderMainStatus === 'IN_TRANSIT_TO_BUYER')) {
        if (order.dropShgId && String(order.dropShgId) !== finalUserId) {
          throw new BadRequestException('Order is not assigned to this SHG');
        }

        orderUpdateFn = async () => {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              mainStatus: 'PARCEL_AT_DROP_SHG',
              dropShgStatus: 'ACCEPTED',
            }
          });
        };

        nextParcelStatus = 'PARCEL_AT_DROP_SHG';
        nextHolderId = finalUserId;
        nextHolderType = 'SHG';
        transitionAction = 'SHG_DROP_RECEIVE';
        transitionSuccessMessage = 'Parcel received by drop SHG from transporter';
      }
      // Case C: Final delivery to buyer by SHG
      else if (order.phase === 'DROP' && (legType !== 'pickup' || !legType) && currentOrderMainStatus === 'PARCEL_AT_DROP_SHG') {
        if (order.dropShgId && String(order.dropShgId) !== finalUserId) {
          throw new BadRequestException('Order is not assigned to this SHG');
        }

        orderUpdateFn = async () => {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              mainStatus: 'DELIVERED',
              deliveredAt: new Date(),
            }
          });
        };

        nextParcelStatus = 'DELIVERED';
        nextHolderId = String(order.buyerId);
        nextHolderType = 'BUYER';
        transitionAction = 'FINAL_DELIVERY';
        transitionSuccessMessage = 'Parcel delivered to Buyer';
      }
    } 
    else if (finalUserRole === 'TRANSPORTER') {
      // Case D: Transporter picking up from SHG (Pickup phase)
      if (order.phase === 'PICKUP' && (legType === 'pickup' || !legType) && (currentOrderMainStatus === 'PARCEL_AT_SHG' || currentOrderMainStatus === 'PICKUP_TRANSPORTER_ACCEPTED' || currentOrderMainStatus === 'TRANSPORTER_ACCEPTED')) {
        if (order.pickupTransporterId && String(order.pickupTransporterId) !== finalUserId) {
          throw new BadRequestException('Order is not assigned to this Transporter');
        }

        orderUpdateFn = async () => {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              pickupTransporterStatus: 'IN_TRANSIT_TO_HUB',
              mainStatus: 'IN_TRANSIT_TO_HUB',
            }
          });
        };

        nextParcelStatus = 'IN_TRANSIT_TO_HUB';
        nextHolderId = finalUserId;
        nextHolderType = 'TRANSPORTER';
        transitionAction = 'TRANSPORTER_PICKUP';
        transitionSuccessMessage = 'Parcel loaded by Transporter from SHG';
      }
      // Case D-2: Transporter delivering to GMU Hub (Phase 1, drop/delivery leg)
      else if (order.phase === 'PICKUP' && legType === 'delivery' && (currentOrderMainStatus === 'IN_TRANSIT_TO_HUB' || currentOrderMainStatus === 'HUB_RECEIVED' || currentOrderMainStatus === 'PARCEL_AT_GMU')) {
        if (order.pickupTransporterId && String(order.pickupTransporterId) !== finalUserId) {
          throw new BadRequestException('Order is not assigned to this Transporter');
        }

        orderUpdateFn = async () => {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              pickupTransporterStatus: 'COMPLETED',
              mainStatus: 'HUB_RECEIVED',
            }
          });
        };

        nextParcelStatus = 'HUB_RECEIVED';
        nextHolderId = 'HUB';
        nextHolderType = 'WAREHOUSE';
        transitionAction = 'TRANSPORTER_HUB_DELIVER';
        transitionSuccessMessage = 'Parcel delivered to GMU Hub by Transporter';
      }
      // Case E: Transporter picking up drop parcel from Warehouse (Drop phase)
      else if (order.phase === 'DROP' && (legType === 'pickup' || !legType) && (currentOrderMainStatus === 'STORED' || currentOrderMainStatus === 'DISPATCHED' || currentOrderMainStatus === 'DROP_ASSIGNED' || currentOrderMainStatus === 'DROP_TRANSPORTER_ACCEPTED')) {
        if (order.dropTransporterId && String(order.dropTransporterId) !== finalUserId) {
          throw new BadRequestException('Order is not assigned to this Transporter');
        }

        orderUpdateFn = async () => {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              dropTransporterStatus: 'TRANSPORTER_ACCEPTED',
              mainStatus: 'IN_TRANSIT_TO_BUYER'
            }
          });
        };

        nextParcelStatus = 'IN_TRANSIT_TO_BUYER';
        nextHolderId = finalUserId;
        nextHolderType = 'TRANSPORTER';
        transitionAction = 'TRANSPORTER_DROP_PICKUP';
        transitionSuccessMessage = 'Parcel loaded for delivery by Transporter from Warehouse';
      }
      // Case E-2: Transporter delivering to Drop SHG (Phase 2, drop/delivery leg)
      else if (order.phase === 'DROP' && legType === 'delivery' && (currentOrderMainStatus === 'IN_TRANSIT_TO_BUYER' || currentOrderMainStatus === 'DROP_TRANSPORTER_ACCEPTED' || currentOrderMainStatus === 'PARCEL_AT_DROP_SHG')) {
        if (order.dropTransporterId && String(order.dropTransporterId) !== finalUserId) {
          throw new BadRequestException('Order is not assigned to this Transporter');
        }

        orderUpdateFn = async () => {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              dropTransporterStatus: 'DELIVERED',
              mainStatus: 'PARCEL_AT_DROP_SHG',
            }
          });
        };

        nextParcelStatus = 'PARCEL_AT_DROP_SHG';
        nextHolderId = String(order.dropShgId);
        nextHolderType = 'SHG';
        transitionAction = 'TRANSPORTER_SHG_DELIVER';
        transitionSuccessMessage = 'Parcel delivered to Drop SHG by Transporter';
      }
    } 
    else if (finalUserRole === 'ADMIN' || finalUserRole === 'GMU' || finalUserRole === 'SUPER_ADMIN') {
      // Case F: Warehouse Intake (GMU receiving from transporter)
      if (currentOrderMainStatus === 'IN_TRANSIT_TO_HUB' || currentOrderMainStatus === 'PARCEL_AT_GMU' || currentOrderMainStatus === 'HUB_RECEIVED') {
        orderUpdateFn = async () => {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              mainStatus: 'HUB_RECEIVED',
              warehouseReceivedAt: new Date(),
            }
          });
        };

        // Insert/Update Warehouse Inventory immediately
        let warehouse = await this.prisma.warehouse.findFirst();
        if (!warehouse) {
          warehouse = await this.prisma.warehouse.create({
            data: { name: 'Main GMU Hub', address: 'GMU Logistics Center' }
          });
        }

        await this.prisma.warehouseInventory.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: warehouse.id,
              productId: product.id,
            }
          },
          update: {
            quantity: { increment: parcel.quantity }
          },
          create: {
            warehouseId: warehouse.id,
            productId: product.id,
            quantity: parcel.quantity,
            qcStatus: 'PASSED'
          }
        });

        nextParcelStatus = 'HUB_RECEIVED';
        nextHolderId = 'HUB';
        nextHolderType = 'WAREHOUSE';
        transitionAction = 'WAREHOUSE_INTAKE';
        transitionSuccessMessage = 'Parcel intake complete at GMU Hub';
      }
      // Case F.1: Warehouse Storing (Incoming Inventory bay -> Stored)
      else if (currentOrderMainStatus === 'HUB_RECEIVED') {
        orderUpdateFn = async () => {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              mainStatus: 'STORED',
              storedAt: new Date(),
            }
          });
        };

        nextParcelStatus = 'STORED';
        nextHolderId = 'HUB_SHELF';
        nextHolderType = 'WAREHOUSE';
        transitionAction = 'WAREHOUSE_STORE';
        transitionSuccessMessage = 'Parcel stored in inventory';
      }
      // Case G: Warehouse Dispatch (GMU dispatching drop parcel)
      else if (currentOrderMainStatus === 'STORED') {
        orderUpdateFn = async () => {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              mainStatus: 'DISPATCHED',
              dispatchedAt: new Date(),
            }
          });
        };

        const warehouse = await this.prisma.warehouse.findFirst();
        if (warehouse) {
          // Verify warehouse inventory exists before decrementing
          const inv = await this.prisma.warehouseInventory.findUnique({
            where: { warehouseId_productId: { warehouseId: warehouse.id, productId: product.id } }
          });
          if (inv) {
            await this.prisma.warehouseInventory.update({
              where: {
                warehouseId_productId: {
                  warehouseId: warehouse.id,
                  productId: product.id,
                }
              },
              data: {
                quantity: { decrement: parcel.quantity }
              }
            });
          }
        }

        nextParcelStatus = 'DISPATCHED';
        nextHolderId = order.dropTransporterId ? String(order.dropTransporterId) : 'HUB';
        nextHolderType = order.dropTransporterId ? 'TRANSPORTER' : 'WAREHOUSE';
        transitionAction = 'WAREHOUSE_DISPATCH';
        transitionSuccessMessage = 'Parcel dispatched from GMU Hub';
      }
    }

    // 5. Update scanned Parcel record
    const updatedParcel = await this.prisma.parcel.update({
      where: { parcelId: parcel.parcelId },
      data: {
        parcelStatus: nextParcelStatus,
        currentHolderId: nextHolderId,
        currentHolderType: nextHolderType,
      }
    });

    // 6. Check if all parcels for this order have reached the target parcelStatus
    const allParcels = await this.prisma.parcel.findMany({
      where: { orderId: parcel.orderId }
    });
    const allMatching = allParcels.every(p => p.parcelStatus === nextParcelStatus);

    if (allMatching && orderUpdateFn) {
      await orderUpdateFn();
    }

    // 6. Log Scan History
    await this.logScanHistory({
      parcelId: parcel.parcelId,
      orderId: parcel.orderId,
      productId: parcel.productId,
      productName: parcel.productName,
      userRole: finalUserRole,
      userId: finalUserId,
      action: transitionAction,
      currentHolder: nextHolderId,
      currentStage: nextParcelStatus,
      scanResult: 'SUCCESS',
      remarks: remarks || transitionSuccessMessage,
      latitude,
      longitude,
    });

    return {
      success: true,
      message: transitionSuccessMessage,
      parcel: updatedParcel,
    };
  }
}
