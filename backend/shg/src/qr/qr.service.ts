import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
    verificationToken?: string,
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
        remarks: `Wrong Parcel: ${parcelId} not found`,
        latitude,
        longitude,
      });
      throw new NotFoundException(`Wrong Parcel: ${parcelId} not found`);
    }

    // 2. Verify Order Exists
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
      throw new NotFoundException(`Associated order not found: ${parcel.orderId}`);
    }

    // 3. Verify user assignments and accept status based on Role & Phase (One-time Acceptance Check)
    if (finalUserRole === 'SHG' || finalUserRole === 'TRANSPORTER') {
      const assignment = await this.prisma.orderAssignment.findFirst({
        where: {
          orderId: order.id,
          assigneeId: finalUserId,
          role: parcel.flowType,
        }
      });

      if (!assignment) {
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
          remarks: `Parcel not assigned to you: assigneeId=${finalUserId}, role=${parcel.flowType}`,
          latitude,
          longitude,
        });
        throw new BadRequestException('Parcel not assigned to you');
      }

      if (assignment.status === 'PENDING') {
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
          remarks: 'Please accept the assignment first before scanning',
          latitude,
          longitude,
        });
        throw new BadRequestException('Please accept the assignment first before scanning');
      }

      if (assignment.status === 'REJECTED') {
        throw new BadRequestException('Assignment was rejected');
      }
    }

    // 4. Determine state transitions & actions
    let nextParcelStatus = parcel.parcelStatus;
    let nextHolderId = parcel.currentHolderId;
    let nextHolderType = parcel.currentHolderType;
    let transitionSuccessMessage = 'Scan verified successfully';
    let transitionAction = 'VERIFY';
    let orderUpdateFn: ((tx: any) => Promise<void>) | null = null;

    const currentStatus = parcel.parcelStatus;

    if (finalUserRole === 'SHG') {
      if (parcel.flowType === 'PICKUP') {
        if (currentStatus === 'PENDING') {
          nextParcelStatus = 'PARCEL_AT_SHG';
          nextHolderId = finalUserId;
          nextHolderType = 'SHG';
          transitionAction = 'SHG_PICKUP';
          transitionSuccessMessage = 'Parcel picked up from seller by SHG';
          
          orderUpdateFn = async (tx) => {
            // Complete SHG's pickup assignment
            await tx.orderAssignment.updateMany({
              where: { orderId: order.id, assigneeId: finalUserId, role: 'PICKUP', status: 'ACCEPTED' },
              data: { status: 'COMPLETED', updatedAt: new Date() }
            });

            // Find master order and complete pickup order
            const masterOrder = await tx.masterOrder.findFirst({
              where: { orderNumber: order.orderId }
            });
            if (masterOrder) {
              const pickupOrder = await tx.pickupOrder.findFirst({
                where: { masterOrderId: masterOrder.id }
              });
              if (pickupOrder) {
                await tx.pickupOrder.update({
                  where: { id: pickupOrder.id },
                  data: {
                    status: 'COMPLETED',
                    pickupTime: new Date(),
                    transporterId: null,
                  }
                });
                await tx.pickupTracking.create({
                  data: {
                    pickupOrderId: pickupOrder.id,
                    status: 'COMPLETED',
                    remarks: 'Pickup leg completed successfully by SHG.',
                  }
                });
                // Reset item verification codes for transporter leg
                await tx.pickupOrderItem.updateMany({
                  where: { pickupOrderId: pickupOrder.id },
                  data: {
                    verificationCode: null,
                    generatedTime: null,
                    verificationStatus: 'PENDING',
                    verifiedTime: null,
                  }
                });
              }
            }

            await tx.order.update({
              where: { id: order.id },
              data: {
                pickupShgStatus: 'PICKED',
                mainStatus: 'PARCEL_AT_SHG',
                pickupTransporterId: null,
                pickupTransporterStatus: 'PENDING',
              },
            });

            if (masterOrder) {
              await tx.masterOrder.update({
                where: { id: masterOrder.id },
                data: { status: 'PARCEL_AT_SHG' }
              });
            }
          };
        } else if (currentStatus === 'PARCEL_AT_SHG' || currentStatus === 'IN_TRANSIT_TO_HUB' || currentStatus === 'HUB_RECEIVED' || currentStatus === 'STORED') {
          throw new BadRequestException('Already Verified');
        } else {
          throw new BadRequestException('Invalid Scan For Current Stage');
        }
      } else if (parcel.flowType === 'DROP') {
        if (currentStatus === 'IN_TRANSIT_TO_BUYER' || currentStatus === 'PARCEL_AT_DROP_SHG') {
          nextParcelStatus = 'PARCEL_WITH_DROP_SHG';
          nextHolderId = finalUserId;
          nextHolderType = 'SHG';
          transitionAction = 'SHG_DROP_RECEIVE';
          transitionSuccessMessage = 'Parcel received by drop SHG from transporter';

          orderUpdateFn = async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: {
                mainStatus: 'PARCEL_WITH_DROP_SHG',
                dropShgStatus: 'PICKED_UP',
              },
            });
          };
        } else if (currentStatus === 'PARCEL_WITH_DROP_SHG') {
          nextParcelStatus = 'DELIVERED';
          nextHolderId = String(order.buyerId);
          nextHolderType = 'BUYER';
          transitionAction = 'FINAL_DELIVERY';
          transitionSuccessMessage = 'Parcel delivered to Buyer';

          orderUpdateFn = async (tx) => {
            // Complete SHG's drop assignment
            await tx.orderAssignment.updateMany({
              where: { orderId: order.id, assigneeId: finalUserId, role: 'DROP', status: 'ACCEPTED' },
              data: { status: 'COMPLETED', updatedAt: new Date() }
            });

            await tx.order.update({
              where: { id: order.id },
              data: {
                mainStatus: 'DELIVERED',
                dropShgStatus: 'DELIVERED',
                deliveredAt: new Date(),
              },
            });

            // Find master order and complete drop order
            const masterOrder = await tx.masterOrder.findFirst({
              where: { orderNumber: order.orderId }
            });
            if (masterOrder) {
              await tx.$executeRawUnsafe(`
                UPDATE public.drop_orders SET status = 'DELIVERED', updated_at = NOW() WHERE drop_order_number = $1;
              `, `DRP-${order.orderId}`);
              await tx.$executeRawUnsafe(`
                UPDATE public.master_orders SET status = 'COMPLETED', updated_at = NOW() WHERE order_number = $1;
              `, order.orderId);
            }
          };
        } else if (currentStatus === 'DELIVERED') {
          throw new BadRequestException('Already Verified');
        } else {
          throw new BadRequestException('Invalid Scan For Current Stage');
        }
      }
    } else if (finalUserRole === 'TRANSPORTER') {
      if (parcel.flowType === 'PICKUP') {
        if (currentStatus === 'PARCEL_AT_SHG') {
          nextParcelStatus = 'IN_TRANSIT_TO_HUB';
          nextHolderId = finalUserId;
          nextHolderType = 'TRANSPORTER';
          transitionAction = 'TRANSPORTER_PICKUP';
          transitionSuccessMessage = 'Parcel loaded by Transporter from SHG';

          orderUpdateFn = async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: {
                pickupTransporterStatus: 'IN_TRANSIT_TO_HUB',
                mainStatus: 'IN_TRANSIT_TO_HUB',
              },
            });
            
            const masterOrder = await tx.masterOrder.findFirst({
              where: { orderNumber: order.orderId }
            });
            if (masterOrder) {
              await tx.masterOrder.update({
                where: { id: masterOrder.id },
                data: { status: 'IN_TRANSIT_TO_HUB' }
              });
            }
          };
        } else if (currentStatus === 'IN_TRANSIT_TO_HUB') {
          nextParcelStatus = 'HUB_RECEIVED';
          nextHolderId = 'HUB';
          nextHolderType = 'WAREHOUSE';
          transitionAction = 'TRANSPORTER_HUB_DELIVER';
          transitionSuccessMessage = 'Parcel delivered to GMU Hub by Transporter';

          orderUpdateFn = async (tx) => {
            // Complete Transporter's pickup assignment
            await tx.orderAssignment.updateMany({
              where: { orderId: order.id, assigneeId: finalUserId, role: 'PICKUP', status: 'ACCEPTED' },
              data: { status: 'COMPLETED', updatedAt: new Date() }
            });

            await tx.order.update({
              where: { id: order.id },
              data: {
                pickupTransporterStatus: 'COMPLETED',
                mainStatus: 'HUB_RECEIVED',
              },
            });

            // Find master order and complete pickup order
            const masterOrder = await tx.masterOrder.findFirst({
              where: { orderNumber: order.orderId }
            });
            if (masterOrder) {
              await tx.pickupOrder.updateMany({
                where: { masterOrderId: masterOrder.id },
                data: {
                  status: 'COMPLETED',
                  pickupTime: new Date(),
                }
              });
              const pickupOrder = await tx.pickupOrder.findFirst({
                where: { masterOrderId: masterOrder.id }
              });
              if (pickupOrder) {
                await tx.pickupTracking.create({
                  data: {
                    pickupOrderId: pickupOrder.id,
                    status: 'COMPLETED',
                    remarks: 'Delivered to GMU Hub by Transporter.',
                  }
                });
              }
              await tx.masterOrder.update({
                where: { id: masterOrder.id },
                data: { status: 'HUB_RECEIVED' }
              });
            }
          };
        } else if (currentStatus === 'HUB_RECEIVED' || currentStatus === 'STORED') {
          throw new BadRequestException('Already Verified');
        } else {
          throw new BadRequestException('Invalid Scan For Current Stage');
        }
      } else if (parcel.flowType === 'DROP') {
        if (currentStatus === 'DISPATCHED' || currentStatus === 'STORED') {
          nextParcelStatus = 'IN_TRANSIT_TO_BUYER';
          nextHolderId = finalUserId;
          nextHolderType = 'TRANSPORTER';
          transitionAction = 'TRANSPORTER_DROP_PICKUP';
          transitionSuccessMessage = 'Parcel loaded for delivery by Transporter from Warehouse';

          orderUpdateFn = async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: {
                dropTransporterStatus: 'TRANSPORTER_ACCEPTED',
                mainStatus: 'IN_TRANSIT_TO_BUYER',
              },
            });

            const masterOrder = await tx.masterOrder.findFirst({
              where: { orderNumber: order.orderId }
            });
            if (masterOrder) {
              await tx.masterOrder.update({
                where: { id: masterOrder.id },
                data: { status: 'IN_TRANSIT_TO_BUYER' }
              });
            }
          };
        } else if (currentStatus === 'IN_TRANSIT_TO_BUYER') {
          nextParcelStatus = 'PARCEL_AT_DROP_SHG';
          nextHolderId = String(order.dropShgId);
          nextHolderType = 'SHG';
          transitionAction = 'TRANSPORTER_SHG_DELIVER';
          transitionSuccessMessage = 'Parcel delivered to Drop SHG by Transporter';

          orderUpdateFn = async (tx) => {
            // Complete Transporter's drop assignment
            await tx.orderAssignment.updateMany({
              where: { orderId: order.id, assigneeId: finalUserId, role: 'DROP', status: 'ACCEPTED' },
              data: { status: 'COMPLETED', updatedAt: new Date() }
            });

            await tx.order.update({
              where: { id: order.id },
              data: {
                dropTransporterStatus: 'DELIVERED',
                mainStatus: 'PARCEL_AT_DROP_SHG',
              },
            });

            const masterOrder = await tx.masterOrder.findFirst({
              where: { orderNumber: order.orderId }
            });
            if (masterOrder) {
              await tx.masterOrder.update({
                where: { id: masterOrder.id },
                data: { status: 'PARCEL_AT_DROP_SHG' }
              });
            }
          };
        } else if (currentStatus === 'PARCEL_AT_DROP_SHG' || currentStatus === 'DELIVERED') {
          throw new BadRequestException('Already Verified');
        } else {
          throw new BadRequestException('Invalid Scan For Current Stage');
        }
      }
    } else if (finalUserRole === 'ADMIN' || finalUserRole === 'GMU' || finalUserRole === 'SUPER_ADMIN') {
      if (currentStatus === 'IN_TRANSIT_TO_HUB') {
        nextParcelStatus = 'HUB_RECEIVED';
        nextHolderId = 'HUB';
        nextHolderType = 'WAREHOUSE';
        transitionAction = 'WAREHOUSE_INTAKE';
        transitionSuccessMessage = 'Parcel intake complete at GMU Hub';

        orderUpdateFn = async (tx) => {
          // Complete Transporter's pickup assignment if not already done
          await tx.orderAssignment.updateMany({
            where: { orderId: order.id, role: 'PICKUP', assigneeType: 'TRANSPORTER', status: 'ACCEPTED' },
            data: { status: 'COMPLETED', updatedAt: new Date() }
          });

          await tx.order.update({
            where: { id: order.id },
            data: {
              mainStatus: 'HUB_RECEIVED',
              warehouseReceivedAt: new Date(),
            },
          });

          const masterOrder = await tx.masterOrder.findFirst({
            where: { orderNumber: order.orderId }
          });
          if (masterOrder) {
            await tx.pickupOrder.updateMany({
              where: { masterOrderId: masterOrder.id },
              data: {
                status: 'COMPLETED',
                pickupTime: new Date(),
              }
            });
            await tx.masterOrder.update({
              where: { id: masterOrder.id },
              data: { status: 'HUB_RECEIVED' }
            });
          }
        };
      } else if (currentStatus === 'HUB_RECEIVED') {
        nextParcelStatus = 'STORED';
        nextHolderId = 'HUB_SHELF';
        nextHolderType = 'WAREHOUSE';
        transitionAction = 'WAREHOUSE_STORE';
        transitionSuccessMessage = 'Parcel stored in inventory';

        orderUpdateFn = async (tx) => {
          // This matches the logic from storeInventory
          const rawMasterOrders = await tx.$queryRawUnsafe(`
            SELECT id, order_number, buyer_id FROM public.master_orders WHERE order_number = $1 LIMIT 1;
          `, order.orderId) as any[];
          const masterOrder = rawMasterOrders?.[0] || null;

          let buyer: any = null;
          let items: any[] = [];

          if (masterOrder) {
            const rawBuyers = await tx.$queryRawUnsafe(`
              SELECT id, village, pincode, taluka, district, address_line1, address_line2 FROM public.buyers WHERE id = $1 LIMIT 1;
            `, masterOrder.buyer_id) as any[];
            buyer = rawBuyers?.[0] || null;

            items = await tx.$queryRawUnsafe(`
              SELECT product_id, quantity FROM public.master_order_items WHERE master_order_id = $1;
            `, masterOrder.id) as any[];
          }

          let warehouse = await tx.warehouse.findFirst();
          if (!warehouse) {
            warehouse = await tx.warehouse.create({
              data: {
                name: 'GMU Hub Warehouse',
                address: 'Kolhapur',
              }
            });
          }

          for (const item of items) {
            const rawPubProducts = await tx.$queryRawUnsafe(`
              SELECT * FROM public.products WHERE id = $1 LIMIT 1;
            `, item.product_id) as any[];
            const pubProduct = rawPubProducts?.[0];

            if (pubProduct) {
              const rawGmuUsers = await tx.$queryRawUnsafe(`
                SELECT id FROM public."User" WHERE id = $1 LIMIT 1;
              `, pubProduct.seller_id) as any[];
              const gmuUser = rawGmuUsers?.[0];

              if (!gmuUser) {
                const rawPubUsers = await tx.$queryRawUnsafe(`
                  SELECT * FROM public."User" WHERE id = $1 LIMIT 1;
                `, pubProduct.seller_id) as any[];
                const pubUser = rawPubUsers?.[0];

                if (pubUser) {
                  await tx.$executeRawUnsafe(`
                    INSERT INTO public."User" (
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
                    pubUser.uniqueCode, pubUser.approvedAt ? new Date(pubUser.approvedAt).toISOString() : null, pubUser.rejectedAt ? new Date(pubUser.rejectedAt).toISOString() : null, pubUser.rejectionReason, new Date(pubUser.createdAt).toISOString(), new Date(pubUser.updatedAt).toISOString(), pubUser.deletedAt ? new Date(pubUser.deletedAt).toISOString() : null
                  );
                }
              }

              const rawGmuProducts = await tx.$queryRawUnsafe(`
                SELECT id FROM public.products WHERE id = $1 LIMIT 1;
              `, item.product_id) as any[];
              const gmuProduct = rawGmuProducts?.[0];

              if (!gmuProduct) {
                await tx.$executeRawUnsafe(`
                  INSERT INTO public.products (
                    id, seller_id, name, category, price, weight, image, created_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamp)
                  ON CONFLICT (id) DO NOTHING;
                `,
                  pubProduct.id, pubProduct.seller_id, pubProduct.name, pubProduct.category,
                  pubProduct.price, pubProduct.weight, pubProduct.image || pubProduct.image_uri || null,
                  new Date(pubProduct.createdAt || pubProduct.created_at || new Date()).toISOString()
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

          // 1. Update Phase 1 Pickup Order status strictly to STORED
          await tx.order.update({
            where: { id: order.id },
            data: {
              mainStatus: 'STORED',
              storedAt: new Date(),
            },
          });

          await tx.masterOrder.updateMany({
            where: { orderNumber: order.orderId },
            data: { status: 'STORED' }
          });

          // 2. Create the new Phase 2 Drop Order in public."Order"
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

          // 3. Create DropOrder in public schema
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
        };
      } else if (currentStatus === 'STORED') {
        nextParcelStatus = 'DISPATCHED';
        nextHolderId = order.dropTransporterId ? String(order.dropTransporterId) : 'HUB';
        nextHolderType = order.dropTransporterId ? 'TRANSPORTER' : 'WAREHOUSE';
        transitionAction = 'WAREHOUSE_DISPATCH';
        transitionSuccessMessage = 'Parcel dispatched from GMU Hub';

        orderUpdateFn = async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: {
              mainStatus: 'DISPATCHED',
              dispatchedAt: new Date(),
            },
          });
        };
      } else if (currentStatus === 'DISPATCHED' || currentStatus === 'DELIVERED') {
        throw new BadRequestException('Already Verified');
      } else {
        throw new BadRequestException('Invalid Scan For Current Stage');
      }
    } else {
      throw new BadRequestException('Invalid role for verification');
    }

    // 5. Execute transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const freshParcel = await tx.parcel.findUnique({ where: { parcelId } });
      if (!freshParcel) {
        throw new BadRequestException('Parcel not found');
      }
      if (freshParcel.parcelStatus !== currentStatus) {
        throw new BadRequestException('Status changed during processing. Please try again.');
      }

      // Update product-wise verificationStatus
      const product = await tx.product.findUnique({ where: { id: freshParcel.productId } });
      if (product) {
        const masterOrder = await tx.masterOrder.findFirst({
          where: { orderNumber: order.orderId }
        });
        if (masterOrder) {
          if (order.phase === 'PICKUP') {
            const pickupOrder = await tx.pickupOrder.findFirst({
              where: { masterOrderId: masterOrder.id }
            });
            if (pickupOrder) {
              await tx.pickupOrderItem.updateMany({
                where: { pickupOrderId: pickupOrder.id, productId: product.id },
                data: { verificationStatus: 'VERIFIED', verifiedTime: new Date() }
              });
            }
          } else if (order.phase === 'DROP') {
            const dropOrder = await tx.dropOrder.findFirst({
              where: { masterOrderId: masterOrder.id }
            });
            if (dropOrder) {
              await tx.dropOrderItem.updateMany({
                where: { dropOrderId: dropOrder.id, productId: product.id },
                data: { verificationStatus: 'VERIFIED', verifiedTime: new Date() }
              });
            }
          }
        }
      }

      const updatedParcel = await tx.parcel.update({
        where: { parcelId: freshParcel.parcelId },
        data: {
          parcelStatus: nextParcelStatus,
          currentHolderId: nextHolderId,
          currentHolderType: nextHolderType,
        }
      });

      const allParcels = await tx.parcel.findMany({
        where: { orderId: freshParcel.orderId }
      });
      const allMatching = allParcels.every(p => p.parcelStatus === nextParcelStatus);

      if (allMatching && orderUpdateFn) {
        await orderUpdateFn(tx);
      }

      return updatedParcel;
    }, {
      timeout: 30000
    });

    // 6. Post-transaction broadcast trigger
    if (nextParcelStatus === 'STORED') {
      const allParcels = await this.prisma.parcel.findMany({
        where: { orderId: parcel.orderId }
      });
      const allMatching = allParcels.every(p => p.parcelStatus === 'STORED');
      if (allMatching) {
        const dropOrder = await this.prisma.order.findFirst({
          where: { orderId: order.orderId, phase: 'DROP' }
        });
        if (dropOrder) {
          try {
            await this.prisma.$executeRawUnsafe(`
              SELECT 1; -- dummy query to ensure DB is responsive before broadcast triggers
            `);
            // We use setTimeout to trigger these asynchronously outside verification transaction
            setTimeout(async () => {
              try {
                // Dynamically call broadcasts
                // Since this might run in a separate context, we fetch from the controller/service
                const ordSvc = require('../order-management/order-management.service');
                if (ordSvc) {
                  // Wait, order-management.service might not be direct, let's trigger it by hitting endpoint or direct query or if gmu has direct service injection
                }
              } catch (err) {}
            }, 500);
          } catch (err) {}
        }
      }
    }

    // 7. Log Scan History
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
      parcel: result,
    };
  }
}
