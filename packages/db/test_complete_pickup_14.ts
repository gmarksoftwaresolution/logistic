import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const pickupOrderId = 14;
  const shgId = 8;
  const code = '1234';
  const legType = 'pickup';

  console.log(`Starting completePickup test for ID ${pickupOrderId}, shgId ${shgId}, legType ${legType}`);

  const pickupOrder = await prisma.pickupOrder.findFirst({
    where: { id: pickupOrderId, shgId },
  });

  if (!pickupOrder) {
    console.error(`Pickup order ${pickupOrderId} not assigned to SHG ${shgId}`);
    return;
  }

  console.log('Found pickupOrder:', JSON.stringify(pickupOrder, null, 2));

  try {
    const res = await prisma.$transaction(async (tx: any) => {
      // Find master order
      const masterOrder = await tx.masterOrder.findUnique({
        where: { id: pickupOrder.masterOrderId }
      });

      if (!masterOrder) {
        throw new Error('MasterOrder not found');
      }

      console.log('Found masterOrder:', JSON.stringify(masterOrder, null, 2));

      if (legType === 'pickup') {
        const nextStatus = pickupOrder.status === 'RETURN_ACCEPTED' ? 'RETURNED' : 'COMPLETED';
        console.log('Next status:', nextStatus);

        const updated = await tx.pickupOrder.update({
          where: { id: pickupOrderId },
          data: {
            status: nextStatus,
            pickupTime: new Date(),
          },
        });
        console.log('Updated pickup order status');

        await tx.pickupTracking.create({
          data: {
            pickupOrderId,
            status: nextStatus,
            remarks: 'Pickup leg completed successfully by SHG.',
          },
        });
        console.log('Created pickupTracking');

        // Update gmu.Order mainStatus and pickupShgStatus
        const nextGmuStatus = nextStatus === 'RETURNED' ? 'RETURN_PARCEL_AT_SHG' : 'PARCEL_AT_SHG';
        const nextShgStatus = nextStatus === 'RETURNED' ? 'RETURNED' : 'PICKED';
        console.log(`Updating gmu.Order with status: ${nextShgStatus}, mainStatus: ${nextGmuStatus}, orderNumber: ${masterOrder.orderNumber}`);

        const updateCount = await tx.$executeRawUnsafe(`
          UPDATE gmu."Order"
          SET "pickupShgStatus" = $1, "mainStatus" = $2, "updatedAt" = NOW()
          WHERE "orderId" = $3;
        `, nextShgStatus, nextGmuStatus, masterOrder.orderNumber);
        console.log('executeRawUnsafe update gmu.Order count:', updateCount);

        // Find the gmu.Order UUID
        console.log('Querying gmu.Order...');
        const rawGmuOrder = await tx.$queryRawUnsafe(`
          SELECT o.id, s.village as "sellerVillage", s.pincode as "sellerPincode"
          FROM gmu."Order" o
          JOIN public.sellers s ON o."sellerId" = s.id
          WHERE o."orderId" = $1 LIMIT 1;
        `, masterOrder.orderNumber) as any[];
        
        console.log('rawGmuOrder:', rawGmuOrder);

        if (rawGmuOrder.length > 0) {
          const orderUuid = rawGmuOrder[0].id;
          const sellerVillage = rawGmuOrder[0].sellerVillage;
          const sellerPincode = rawGmuOrder[0].sellerPincode;

          // Fetch seller details to get taluka and district
          const rawSeller = await tx.$queryRawUnsafe(`
            SELECT taluka, district FROM public.sellers WHERE id = $1 LIMIT 1;
          `, pickupOrder.sellerId) as any[];
          const sellerTaluka = rawSeller?.[0]?.taluka || '';
          const sellerDistrict = rawSeller?.[0]?.district || '';

          console.log(`Seller details: taluka=${sellerTaluka}, district=${sellerDistrict}, village=${sellerVillage}, pincode=${sellerPincode}`);

          // Find approved and active transporters matching the routes (priority: Pincode -> Village -> Taluka -> District)
          const approvedTransporters = await tx.$queryRawUnsafe(`
            SELECT tm.id, tm."assignedVillages", tm."assignedPincodes", u.id AS "userId", rd."operatingArea"
            FROM gmu."TransporterMember" tm
            JOIN public."User" u ON tm."mobileNumber" = u."phoneNumber"
            LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
            WHERE tm.status = 'APPROVED' AND u."applicationStatus" = 'APPROVED';
          `) as any[];

          console.log('approvedTransporters count:', approvedTransporters.length);

          const parseJsonArray = (val: any) => {
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
              try { return JSON.parse(val); } catch(e) {}
            }
            return [];
          };

          const matchingTransporters = approvedTransporters.filter(t => {
            const areas = t.operatingArea
              ? t.operatingArea.split(',').map((s: string) => s.trim().toLowerCase())
              : [];
            const assignedVillages = parseJsonArray(t.assignedVillages).map((s: string) => s.toLowerCase());
            const assignedPincodes = parseJsonArray(t.assignedPincodes).map((s: string) => s.toLowerCase());

            if (sellerPincode) {
              const p = sellerPincode.toLowerCase();
              if (assignedPincodes.includes(p) || areas.includes(p)) return true;
            }
            if (sellerVillage) {
              const v = sellerVillage.toLowerCase();
              if (assignedVillages.includes(v) || areas.includes(v)) return true;
            }
            if (sellerTaluka) {
              const tk = sellerTaluka.toLowerCase();
              if (areas.includes(tk)) return true;
            }
            if (sellerDistrict) {
              const d = sellerDistrict.toLowerCase();
              if (areas.includes(d)) return true;
            }
            return false;
          });

          console.log('matchingTransporters count:', matchingTransporters.length);

          if (matchingTransporters.length > 0) {
            for (const t of matchingTransporters) {
              const existing = await tx.$queryRawUnsafe(`
                SELECT id FROM gmu."OrderAssignment" 
                WHERE "orderId" = $1 AND "assigneeId" = $2 AND role = 'PICKUP' AND "assigneeType" = 'TRANSPORTER' AND status = 'PENDING' LIMIT 1;
              `, orderUuid, t.id) as any[];

              if (existing.length === 0) {
                const uuidv4 = '00000000-0000-4000-8000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString();
                await tx.$executeRawUnsafe(`
                  INSERT INTO gmu."OrderAssignment" (id, "orderId", "assigneeId", "assigneeType", role, status, "createdAt", "updatedAt")
                  VALUES ($1, $2, $3, 'TRANSPORTER', 'PICKUP', 'PENDING', NOW(), NOW());
                `, uuidv4, orderUuid, t.id);
                console.log(`Created assignment for transporter ${t.id}`);
              }
            }

            // Update gmu.Order pickupTransporterStatus to PENDING
            await tx.$executeRawUnsafe(`
              UPDATE gmu."Order" SET "pickupTransporterStatus" = 'PENDING' WHERE id = $1;
            `, orderUuid);
            console.log('Updated gmu.Order pickupTransporterStatus to PENDING');
          }
        }

        // Update public.master_orders status
        await tx.masterOrder.update({
          where: { id: pickupOrder.masterOrderId },
          data: { status: nextGmuStatus },
        });
        console.log('Updated masterOrder status');

        // Auto-accept/pickup associated PENDING/RETURN_PENDING drop orders
        const pendingDrops = await tx.dropOrder.findMany({
          where: {
            masterOrderId: updated.masterOrderId,
            status: { in: ['PENDING', 'RETURN_PENDING'] },
            OR: [
              { shgId: null },
              { shgId }
            ]
          }
        });
        console.log('Associated pendingDrops:', pendingDrops.length);

        if (pendingDrops.length > 0) {
          for (const drop of pendingDrops) {
            const nextDropStatus = drop.status === 'RETURN_PENDING' ? 'RETURN_PICKED_UP' : 'PICKED_UP';
            await tx.dropOrder.update({
              where: { id: drop.id },
              data: {
                status: nextDropStatus,
                shgId
              }
            });

            await tx.dropTracking.create({
              data: {
                dropOrderId: drop.id,
                status: nextDropStatus,
                remarks: 'Delivery leg auto-picked up upon pickup completion.'
              }
            });
            console.log(`Auto-picked up drop order ${drop.id}`);
          }
        }

        return updated;
      }
    });

    console.log('Transaction SUCCESS:', res);
  } catch (error) {
    console.error('Transaction FAILED:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
