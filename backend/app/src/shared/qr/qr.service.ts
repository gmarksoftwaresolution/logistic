import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as QRCode from 'qrcode';
import { QrVerificationEngine, determineTransition, validateVerificationToken, triggerTransporterPickupBroadcast, triggerTransporterDropBroadcast } from './qr-verification-engine';

@Injectable()
export class QrService {
  private engine: QrVerificationEngine;

  constructor(private readonly prisma: PrismaService) {
    this.engine = new QrVerificationEngine(this.prisma);
  }

  private generateVerificationToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  async generateQr(orderId: string, regenerate = false, createdBy = 'SYSTEM'): Promise<any[]> {
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

    const resolvedOrderId = order.orderId;

    const existingParcels = await this.prisma.parcel.findMany({
      where: {
        OR: [
          { orderId: resolvedOrderId },
          { orderId: order.id }
        ]
      }
    });

    if (existingParcels && existingParcels.length > 0 && !regenerate) {
      return existingParcels;
    }

    let items: any[] = [{
      productId: 1,
      productName: 'Order Package',
      productWeight: order.totalWeight ? `${order.totalWeight}` : '0.75',
      quantity: order.totalQty || 1,
      price: 100,
    }];

    const totalParcels = items.length;
    const parcels: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const parcelNumber = i + 1;

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

      const verificationToken = this.generateVerificationToken();
      const weightStr = item.productWeight ? `${item.productWeight} KG` : '0.5 KG';

      if (!parcel) {
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

      const ordAny = order as any;
      const qrContent = {
        parcelId: parcel.parcelId,
        orderId: resolvedOrderId,
        orderNo: order.orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        weight: weightStr,
        token: verificationToken,
        verificationToken,
        sellerName: ordAny.sellerName || ordAny.seller?.fullName || '',
        sellerMobileNumber: ordAny.sellerPhone || ordAny.seller?.phoneNumber || '',
        sellerVillage: ordAny.sellerVillage || ordAny.seller?.village || '',
        sellerPincode: ordAny.sellerPincode || ordAny.seller?.pincode || '',
        buyerName: ordAny.buyerName || ordAny.buyer?.fullName || '',
        buyerMobileNumber: ordAny.buyerPhone || ordAny.buyer?.phoneNumber || '',
        buyerVillage: ordAny.buyerVillage || ordAny.buyer?.village || '',
        buyerPincode: ordAny.buyerPincode || ordAny.buyer?.pincode || '',
        version: 1,
      };

      const qrCodeValue = JSON.stringify(qrContent);
      const qrImage = await QRCode.toDataURL(qrCodeValue, { margin: 1, width: 200, errorCorrectionLevel: 'L' });

      parcel = await this.prisma.parcel.update({
        where: { parcelId: parcel.parcelId },
        data: {
          qrCodeValue,
          qrImage,
        }
      });

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
    verificationToken?: string,
    scannedByUserId?: string,
    scannedByUserRole?: string,
    latitude?: number,
    longitude?: number,
    remarks?: string,
    legType?: string
  ): Promise<{ success: boolean; message: string; parcel: any }> {
    const finalUserId = scannedByUserId || 'SYSTEM';
    const finalUserRole = scannedByUserRole || 'SYSTEM';

    const parcel = await this.prisma.parcel.findUnique({
      where: { parcelId },
    });

    if (!parcel) {
      throw new NotFoundException(`Wrong Parcel: ${parcelId} not found`);
    }

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: parcel.orderId },
          { orderId: parcel.orderId }
        ]
      }
    });

    if (!order) {
      throw new NotFoundException(`Associated order not found: ${parcel.orderId}`);
    }

    const sessionType = parcel.flowType as any;

    if (verificationToken) {
      validateVerificationToken(verificationToken, parcel.verificationToken);
    }

    const transition = determineTransition(sessionType, finalUserRole, finalUserId, parcel, order, legType);

    const updatedParcel = await this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.parcel.update({
        where: { parcelId },
        data: {
          parcelStatus: transition.nextParcelStatus,
          currentHolderId: transition.nextHolderId,
          currentHolderType: transition.nextHolderType,
        }
      });

      await tx.parcelScanHistory.create({
        data: {
          parcelId: parcel.parcelId,
          orderId: parcel.orderId,
          productId: parcel.productId,
          productName: parcel.productName,
          userRole: finalUserRole,
          userId: finalUserId,
          action: transition.action,
          currentHolder: transition.nextHolderId,
          currentStage: transition.nextParcelStatus,
          scanResult: 'SUCCESS',
          remarks: transition.message,
        }
      });

      let mainStatus = transition.nextParcelStatus;
      let pickupShgStatus = order.pickupShgStatus;
      let pickupTransporterStatus = order.pickupTransporterStatus;
      let dropShgStatus = order.dropShgStatus;
      let dropTransporterStatus = order.dropTransporterStatus;

      if (mainStatus === 'PARCEL_PICKED') {
        pickupShgStatus = 'PICKED';
        pickupTransporterStatus = 'PENDING';
        await triggerTransporterPickupBroadcast(tx, order.id);
      } else if (mainStatus === 'TRANSPORTER_ACCEPTED') {
        pickupShgStatus = 'COMPLETED';
        pickupTransporterStatus = 'ACCEPTED';
      } else if (mainStatus === 'IN_TRANSIT' || mainStatus === 'IN_TRANSIT_TO_HUB') {
        pickupShgStatus = 'DROPPED';
        pickupTransporterStatus = 'PICKED';
      } else if (mainStatus === 'AT_GMU') {
        pickupTransporterStatus = 'COMPLETED';
      } else if (mainStatus === 'STORED') {
        pickupShgStatus = 'DROPPED';
        pickupTransporterStatus = 'DROPPED';
        dropShgStatus = 'ACCEPTED';
        dropTransporterStatus = 'PENDING';
        await triggerTransporterDropBroadcast(tx, order.id);
      } else if (mainStatus === 'OUT_FOR_DELIVERY' || mainStatus === 'READY_FOR_DISPATCH' || mainStatus === 'IN_TRANSIT_TO_BUYER' || mainStatus === 'IN_TRANSIT_TO_DROP_SHG' || mainStatus === 'DISPATCHED') {
        mainStatus = 'IN_TRANSIT_TO_DROP_SHG';
        dropTransporterStatus = 'PICKED';
      } else if (mainStatus === 'AT_BUYER_SHG' || mainStatus === 'PARCEL_AT_DROP_SHG' || mainStatus === 'PARCEL_WITH_DROP_SHG') {
        mainStatus = 'PARCEL_AT_DROP_SHG';
        dropTransporterStatus = 'DROPPED';
        dropShgStatus = 'PICKED';
      } else if (mainStatus === 'DELIVERED' || mainStatus === 'COMPLETED') {
        mainStatus = 'COMPLETED';
        dropShgStatus = 'DROPPED';
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

      return updated;
    });

    if (finalUserRole === 'GMU' || finalUserRole === 'ADMIN') {
      try {
        const existingDropOrder = await this.prisma.order.findFirst({
          where: { orderId: order.orderId, phase: 'DROP' }
        });

        let dropOrder = existingDropOrder;

        if (!dropOrder) {
          const dropId = `${order.orderId}-DROP`;
          dropOrder = await this.prisma.order.create({
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
        }

        const buyer = await this.prisma.buyer.findUnique({ where: { id: order.buyerId } });
        if (buyer && buyer.village) {
          const matchingShgs = await this.prisma.user.findMany({
            where: {
              role: 'SHG',
              applicationStatus: 'APPROVED',
              deletedAt: null,
              address: { village: { equals: buyer.village, mode: 'insensitive' } }
            },
            include: { address: true }
          });

          for (const shg of matchingShgs) {
            const assignUuid = '00000000-0000-4000-8000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString();
            await this.prisma.$executeRawUnsafe(`
              INSERT INTO public."OrderAssignment" (id, "orderId", "assigneeId", "assigneeType", role, status, "createdAt", "updatedAt")
              VALUES ($1, $2, $3, 'SHG', 'DROP', 'PENDING', NOW(), NOW())
              ON CONFLICT DO NOTHING;
            `, assignUuid, dropOrder.id, String(shg.id));
          }
        }
      } catch (err: any) {
        console.error(`[verifyQr GMU] Error creating/broadcasting Phase 2 Drop Order:`, err.message);
      }
    }

    return {
      success: true,
      message: transition.message,
      parcel: updatedParcel,
    };
  }

  async startSession(sessionType: 'PICKUP' | 'DROP', userId: string, userRole: string, orderIds: string[]) {
    return this.engine.startSession(sessionType, userId, userRole, orderIds);
  }

  async scanParcel(sessionType: 'PICKUP' | 'DROP', sessionId: string, qrData: string, user: any) {
    return this.engine.scanParcel(sessionType, sessionId, qrData, user);
  }

  async removeParcelFromSession(sessionId: string, parcelId: string) {
    return this.engine.removeParcelFromSession(sessionId, parcelId);
  }

  async confirmSession(sessionType: 'PICKUP' | 'DROP', sessionId: string) {
    return this.engine.confirmSession(sessionType, sessionId);
  }

  async confirmSessionOrder(sessionType: 'PICKUP' | 'DROP', userId: string, userRole: string, sessionId: string, orderId: string) {
    return this.engine.confirmSessionOrder(sessionType, userId, userRole, sessionId, orderId);
  }

  async getSessionDetails(sessionType: 'PICKUP' | 'DROP', userId: string, userRole: string, sessionId?: string) {
    if (!sessionId) {
      const existing = await this.prisma.scanSession.findFirst({
        where: {
          userId,
          userRole: userRole.toUpperCase(),
          sessionType,
          status: 'IN_PROGRESS',
        },
      });
      if (!existing) {
        return null;
      }
      sessionId = existing.sessionId;
    }
    return this.engine.getSessionDetails(sessionType, userId, userRole, sessionId);
  }
}
