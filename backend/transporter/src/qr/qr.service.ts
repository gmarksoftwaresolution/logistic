import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as QRCode from 'qrcode';
import { QrVerificationEngine, determineTransition, validateVerificationToken } from '@logistic/db';

@Injectable()
export class QrService {
  private engine: QrVerificationEngine;

  constructor(private readonly prisma: PrismaService) {
    this.engine = new QrVerificationEngine(this.prisma);
  }

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

      // Simplified QR JSON payload containing ONLY parcelId, verificationToken, and version
      const qrContent = {
        parcelId: parcel.parcelId,
        verificationToken,
        version: 1,
      };

      const qrCodeValue = JSON.stringify(qrContent);
      const qrImage = await QRCode.toDataURL(qrCodeValue);

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

    const transition = determineTransition(sessionType, finalUserRole, finalUserId, parcel, order);

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
      } else if (mainStatus === 'TRANSPORTER_ACCEPTED') {
        pickupShgStatus = 'COMPLETED';
        pickupTransporterStatus = 'ACCEPTED';
      } else if (mainStatus === 'IN_TRANSIT') {
        pickupTransporterStatus = 'PICKED';
      } else if (mainStatus === 'AT_GMU') {
        pickupTransporterStatus = 'COMPLETED';
      } else if (mainStatus === 'OUT_FOR_DELIVERY') {
        dropTransporterStatus = 'PICKED';
      } else if (mainStatus === 'AT_BUYER_SHG') {
        dropTransporterStatus = 'COMPLETED';
        dropShgStatus = 'ACCEPTED';
      } else if (mainStatus === 'DELIVERED') {
        dropShgStatus = 'DELIVERED';
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

      return updated;
    });

    return {
      success: true,
      message: transition.message,
      parcel: updatedParcel,
    };
  }

  // Transient Session API Delegations to shared engine
  async startSession(sessionType: 'PICKUP' | 'DROP', userId: string, userRole: string, orderIds: string[]) {
    try {
      return await this.engine.startSession(sessionType, userId, userRole, orderIds);
    } catch (err: any) {
      if (err.name === 'QrValidationError' || err.statusCode === 400) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async scanParcel(sessionType: 'PICKUP' | 'DROP', sessionId: string, qrData: string, user: any) {
    try {
      return await this.engine.scanParcel(sessionType, sessionId, qrData, user);
    } catch (err: any) {
      if (err.name === 'QrValidationError' || err.statusCode === 400) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async removeParcelFromSession(sessionId: string, parcelId: string) {
    try {
      return await this.engine.removeParcelFromSession(sessionId, parcelId);
    } catch (err: any) {
      if (err.name === 'QrValidationError' || err.statusCode === 400) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async confirmSession(sessionType: 'PICKUP' | 'DROP', sessionId: string) {
    try {
      return await this.engine.confirmSession(sessionType, sessionId);
    } catch (err: any) {
      if (err.name === 'QrValidationError' || err.statusCode === 400) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async confirmSessionOrder(
    sessionType: 'PICKUP' | 'DROP',
    sessionId: string,
    orderId: string,
    user: any
  ) {
    const userId = user?.id ? String(user.id) : 'SYSTEM';
    const userRole = user?.role ? String(user.role) : 'SYSTEM';
    try {
      return await this.engine.confirmSessionOrder(sessionType, userId, userRole, sessionId, orderId);
    } catch (err: any) {
      if (err.name === 'QrValidationError' || err.statusCode === 400) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
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
    try {
      return await this.engine.getSessionDetails(sessionType, userId, userRole, sessionId);
    } catch (err: any) {
      if (err.name === 'QrValidationError' || err.statusCode === 400) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}
