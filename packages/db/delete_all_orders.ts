process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING WIPE ALL ORDERS SCRIPT ---');

  console.log('Wiping all pickup tracking, drop tracking, order items, pickups, drops, and master orders...');
  
  await prisma.pickupTracking.deleteMany();
  await prisma.dropTracking.deleteMany();
  await prisma.pickupOrderItem.deleteMany();
  await prisma.pickupOrder.deleteMany();
  await prisma.dropOrderItem.deleteMany();
  await prisma.dropOrder.deleteMany();
  await prisma.masterOrderItem.deleteMany();
  await prisma.masterOrder.deleteMany();

  console.log('Wiping new logistics engine tables (ScanSession, VerificationRecord, Order, OrderAssignment, Parcels)...');
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."ScanSessionItem";`); } catch (e) {}
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."ScanSession";`); } catch (e) {}
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."VerificationRecord";`); } catch (e) {}
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."ScanHistory";`); } catch (e) {}
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."ParcelScanHistory";`); } catch (e) {}
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."Parcel";`); } catch (e) {}
  try { await prisma.$executeRawUnsafe(`DELETE FROM gmu."OrderAssignment";`); } catch (e) {}
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."OrderAssignment";`); } catch (e) {}
  try { await prisma.$executeRawUnsafe(`DELETE FROM gmu."Order" WHERE phase = 'DROP' OR id LIKE '00000000-0000-4000-8000-%';`); } catch (e) {}
  try { await prisma.$executeRawUnsafe(`DELETE FROM public."Order" WHERE phase = 'DROP' OR id LIKE '00000000-0000-4000-8000-%';`); } catch (e) {}
  
  console.log('--- DATABASE WIPED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('Wipe error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
