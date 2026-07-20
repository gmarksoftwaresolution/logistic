import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Try loading env files to get DATABASE_URL from .env
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../backend/gmu/.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

// Database URL is read from .env
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Resetting all orders in database back to Phase 1 Pickup New Orders...');

  // 1. Delete all drop orders and tracking to start Phase 2 fresh
  console.log('- Clearing Drop Orders & Tracking...');
  try { await prisma.$executeRawUnsafe(`DELETE FROM public.drop_tracking;`); } catch (e) { console.log('  (Skipped public.drop_tracking deletion)'); }
  try { await prisma.$executeRawUnsafe(`DELETE FROM public.drop_order_items;`); } catch (e) { console.log('  (Skipped public.drop_order_items deletion)'); }
  try { await prisma.$executeRawUnsafe(`DELETE FROM public.drop_orders;`); } catch (e) { console.log('  (Skipped public.drop_orders deletion)'); }
  
  console.log('- Clearing Scan Sessions...');
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."ScanSessionItem";`); } catch (e) { console.log('  (Skipped public.ScanSessionItem deletion)'); }
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."ScanSession";`); } catch (e) { console.log('  (Skipped public.ScanSession deletion)'); }

  // 2. Delete verification records except for setup/initial ones
  console.log('- Clearing verification records...');
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."VerificationRecord";`); } catch (e) { console.log('  (Skipped public.VerificationRecord deletion)'); }
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."ScanHistory";`); } catch (e) { console.log('  (Skipped public.ScanHistory deletion)'); }
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."ParcelScanHistory";`); } catch (e) { console.log('  (Skipped public.ParcelScanHistory deletion)'); }
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."Parcel";`); } catch (e) { console.log('  (Skipped public.Parcel deletion)'); }
  try { await prisma.$executeRawUnsafe(`DELETE FROM public.pickup_tracking;`); } catch (e) { console.log('  (Skipped public.pickup_tracking deletion)'); }

  // 3. Reset pickup_orders to PENDING
  console.log('- Resetting public.pickup_orders...');
  await prisma.$executeRawUnsafe(`
    UPDATE public.pickup_orders
    SET status = 'PENDING', "shg_id" = NULL, "transporter_id" = NULL, "pickup_time" = NULL;
  `);

  // 4. Reset master_orders status to ORDER_PLACED
  console.log('- Resetting public.master_orders...');
  await prisma.$executeRawUnsafe(`
    UPDATE public.master_orders
    SET status = 'ORDER_PLACED';
  `);

  // 5. Delete all order assignments in both schemas
  console.log('- Clearing OrderAssignments in both schemas...');
  await prisma.$executeRawUnsafe(`DELETE FROM gmu."OrderAssignment";`);
  await prisma.$executeRawUnsafe(`DELETE FROM public."OrderAssignment";`);

  // 6. Reset Order to initial pickup state in both schemas
  console.log('- Resetting Order to ORDER_PLACED and PICKUP phase in both schemas...');
  const resetQuery = `
    UPDATE %SCHEMA%."Order"
    SET 
      phase = 'PICKUP',
      "mainStatus" = 'ORDER_PLACED',
      "pickupShgId" = NULL,
      "pickupShgStatus" = NULL,
      "pickupTransporterId" = NULL,
      "pickupTransporterStatus" = 'PENDING',
      "dropShgId" = NULL,
      "dropShgStatus" = 'PENDING',
      "dropTransporterId" = NULL,
      "dropTransporterStatus" = 'PENDING',
      "barcode" = NULL,
      "updatedAt" = NOW();
  `;
  await prisma.$executeRawUnsafe(resetQuery.replace('%SCHEMA%', 'gmu'));
  await prisma.$executeRawUnsafe(resetQuery.replace('%SCHEMA%', 'public'));

  // Update sellers/buyers villages and pincodes in public schema to match exact database spellings
  console.log('- Aligning seller/buyer villages and pincodes with database PincodeDirectory...');
  await prisma.$executeRawUnsafe(`UPDATE public.sellers SET village = 'Batkangale', pincode = '416503' WHERE village = 'Batkanangale';`);
  await prisma.$executeRawUnsafe(`UPDATE public.sellers SET village = 'Mahagaon (Kolhapur)', pincode = '416503' WHERE village = 'Mahagaon';`);
  await prisma.$executeRawUnsafe(`UPDATE public.sellers SET village = 'Gadhinglaj', pincode = '416502' WHERE village = 'Gadhinglaj';`);

  await prisma.$executeRawUnsafe(`UPDATE public.buyers SET village = 'Batkangale', pincode = '416503' WHERE village = 'Batkanangale';`);
  await prisma.$executeRawUnsafe(`UPDATE public.buyers SET village = 'Mahagaon (Kolhapur)', pincode = '416503' WHERE village = 'Mahagaon';`);
  await prisma.$executeRawUnsafe(`UPDATE public.buyers SET village = 'Gadhinglaj', pincode = '416502' WHERE village = 'Gadhinglaj';`);

  // Update registered user addresses in public."Address" schema to use correct spellings
  console.log('- Aligning registered user addresses with database PincodeDirectory...');
  await prisma.$executeRawUnsafe(`UPDATE public."Address" SET village = 'Batkangale' WHERE village = 'Batkanangale';`);

  // Update RouteDetail villages to match exact database spellings
  console.log('- Aligning transporter RouteDetail villages with database PincodeDirectory...');
  await prisma.$executeRawUnsafe(`
    UPDATE public."RouteDetail" 
    SET "operatingArea" = REPLACE("operatingArea"::text, 'Batkanangale', 'Batkangale')::text
    WHERE "operatingArea"::text LIKE '%Batkanangale%';
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE public."RouteDetail" 
    SET "operatingArea" = REPLACE("operatingArea"::text, 'Mahagaon', 'Mahagaon (Kolhapur)')::text
    WHERE "operatingArea"::text LIKE '%Mahagaon%' AND "operatingArea"::text NOT LIKE '%Mahagaon (Kolhapur)%';
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE public."RouteDetail" 
    SET "pickupLocations" = REPLACE("pickupLocations"::text, 'Batkanangale', 'Batkangale')::jsonb
    WHERE "pickupLocations"::text LIKE '%Batkanangale%';
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE public."RouteDetail" 
    SET "pickupLocations" = REPLACE("pickupLocations"::text, 'Mahagaon', 'Mahagaon (Kolhapur)')::jsonb
    WHERE "pickupLocations"::text LIKE '%Mahagaon%' AND "pickupLocations"::text NOT LIKE '%Mahagaon (Kolhapur)%';
  `);

  // 7. Auto-broadcast all orders to matching approved SHGs
  console.log('- Auto-broadcasting orders to matching approved SHGs...');
  const approvedShgs = await prisma.$queryRawUnsafe(`
    SELECT u.id, a.pincode, a.village, a."postOffice"
    FROM public."User" u
    JOIN public."Address" a ON u.id = a."userId"
    WHERE u.role = 'SHG' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL;
  `) as any[];

  console.log(`Found ${approvedShgs.length} approved SHGs for broadcasting.`);

  const normalizeStr = (s: string) => {
    if (!s) return '';
    return s.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
  };

  // Get all orders from public."Order"
  const orders = await prisma.$queryRawUnsafe(`
    SELECT o.id, o."orderId", o."sellerId", s.village, s.pincode, s.post_office as "postOffice"
    FROM public."Order" o
    JOIN public.sellers s ON o."sellerId" = s.id;
  `) as any[];

  const crypto = require('crypto');

  for (const order of orders) {
    const ov = order.village;
    const op = order.pincode;

    const matchingShgs = approvedShgs.filter(shg => 
      shg.pincode && op && 
      shg.pincode.trim().toLowerCase() === op.trim().toLowerCase() &&
      shg.village && ov && 
      normalizeStr(shg.village) === normalizeStr(ov)
    );

    if (matchingShgs.length === 0) {
      console.log(`Order ${order.orderId}: No matching approved SHGs found (Seller Village: ${ov}, Pincode: ${op}).`);
      const noPartnerQuery = `
        UPDATE %SCHEMA%."Order"
        SET "mainStatus" = 'ORDER_PLACED', "pickupShgStatus" = 'NO_PARTNERS_FOUND'
        WHERE id = $1;
      `;
      await prisma.$executeRawUnsafe(noPartnerQuery.replace('%SCHEMA%', 'public'), order.id);
      await prisma.$executeRawUnsafe(noPartnerQuery.replace('%SCHEMA%', 'gmu'), order.id);
      continue;
    }

    console.log(`Order ${order.orderId}: Broadcasting to SHG IDs: ${matchingShgs.map(s => s.id).join(', ')}`);

    // Fetch the correct UUID for public."Order"
    const publicOrderRes = await prisma.$queryRawUnsafe(`
      SELECT id FROM public."Order" WHERE "orderId" = $1 LIMIT 1;
    `, order.orderId) as any[];
    const publicOrderId = publicOrderRes[0]?.id;

    // Fetch the correct UUID for gmu."Order"
    const gmuOrderRes = await prisma.$queryRawUnsafe(`
      SELECT id FROM gmu."Order" WHERE "orderId" = $1 LIMIT 1;
    `, order.orderId) as any[];
    const gmuOrderId = gmuOrderRes[0]?.id;

    if (!publicOrderId || !gmuOrderId) {
      console.log(`Warning: Order ${order.orderId} not found in public.Order (${publicOrderId}) or gmu.Order (${gmuOrderId}). Skipping.`);
      continue;
    }

    for (const shg of matchingShgs) {
      const assignmentIdPub = crypto.randomUUID();
      const insertAssignmentQueryPub = `
        INSERT INTO public."OrderAssignment" (id, "orderId", "assigneeId", "assigneeType", role, status, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'SHG', 'PICKUP', 'PENDING', NOW(), NOW());
      `;
      await prisma.$executeRawUnsafe(insertAssignmentQueryPub, assignmentIdPub, publicOrderId, String(shg.id));

      const assignmentIdGmu = crypto.randomUUID();
      const insertAssignmentQueryGmu = `
        INSERT INTO gmu."OrderAssignment" (id, "orderId", "assigneeId", "assigneeType", role, status, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'SHG', 'PICKUP', 'PENDING', NOW(), NOW());
      `;
      await prisma.$executeRawUnsafe(insertAssignmentQueryGmu, assignmentIdGmu, gmuOrderId, String(shg.id));
    }

    const assignedQueryPub = `
      UPDATE public."Order"
      SET "mainStatus" = 'PICKUP_ASSIGNED', "pickupShgStatus" = 'PENDING'
      WHERE id = $1;
    `;
    await prisma.$executeRawUnsafe(assignedQueryPub, publicOrderId);

    const assignedQueryGmu = `
      UPDATE gmu."Order"
      SET "mainStatus" = 'PICKUP_ASSIGNED', "pickupShgStatus" = 'PENDING'
      WHERE id = $1;
    `;
    await prisma.$executeRawUnsafe(assignedQueryGmu, gmuOrderId);
  }

  console.log('Success! All orders have been reset and auto-broadcasted to matching approved SHGs.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

