import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function resetAndSeed20Orders() {
  console.log('================================================================');
  console.log('=== PURGING OLD ORDERS AND SEEDING EXACTLY 20 FRESH ORDERS ===');
  console.log('================================================================\n');

  // 1. Fetch Sellers, Buyers, and Products catalog from DB
  const sellers = await prisma.seller.findMany();
  const buyers = await prisma.buyer.findMany();
  let products = await prisma.product.findMany();

  console.log(`Found ${sellers.length} Sellers, ${buyers.length} Buyers, and ${products.length} Products in database.`);

  if (sellers.length === 0 || buyers.length === 0) {
    console.error('Error: Sellers or Buyers missing in database.');
    process.exit(1);
  }

  // Ensure products catalog is available
  if (products.length < 4) {
    console.log('Seeding baseline products into Product table...');
    const users = await prisma.user.findMany();
    const defaultUserId = users[0]?.id || 1;

    const sampleProds = [
      { name: 'Moong Dal (Yellow)', category: 'Pulses', price: 180, weight: 2.0, Unit: 'kg', sellerId: defaultUserId },
      { name: 'Organic Turmeric Powder', category: 'Spices', price: 120, weight: 0.5, Unit: 'kg', sellerId: defaultUserId },
      { name: 'Pure Kolhapuri Jaggery', category: 'Sweetener', price: 210, weight: 3.0, Unit: 'kg', sellerId: defaultUserId },
      { name: 'Cold Pressed Groundnut Oil', category: 'Oils', price: 195, weight: 1.0, Unit: 'L', sellerId: defaultUserId },
      { name: 'Indrayani Rice', category: 'Grains', price: 350, weight: 5.0, Unit: 'kg', sellerId: defaultUserId },
      { name: 'Handmade Besan (Gram Flour)', category: 'Flour', price: 110, weight: 1.0, Unit: 'kg', sellerId: defaultUserId },
    ];

    for (const sp of sampleProds) {
      await prisma.product.create({ data: sp }).catch(() => {});
    }
    products = await prisma.product.findMany();
  }

  // 2. PURGE ALL OLD ORDERS AND DEPENDENCIES
  console.log('Deleting old scan session items...');
  await prisma.scanSessionItem.deleteMany({}).catch(() => {});
  console.log('Deleting old scan sessions...');
  await prisma.scanSession.deleteMany({}).catch(() => {});
  console.log('Deleting old parcel scan histories...');
  await prisma.parcelScanHistory.deleteMany({}).catch(() => {});
  console.log('Deleting old parcels...');
  await prisma.parcel.deleteMany({}).catch(() => {});
  console.log('Deleting old order assignments...');
  await prisma.orderAssignment.deleteMany({}).catch(() => {});
  console.log('Deleting old orders...');
  await prisma.order.deleteMany({}).catch(() => {});

  console.log('✅ Database completely purged!\n');

  // Ensure SHG users have addresses matching seller location pincodes & villages
  const shgUsers = await prisma.user.findMany({
    where: { role: 'SHG', applicationStatus: 'APPROVED', deletedAt: null }
  });

  if (shgUsers.length > 0) {
    for (let sIdx = 0; sIdx < shgUsers.length; sIdx++) {
      const shg = shgUsers[sIdx];
      const matchingSeller = sellers[sIdx % sellers.length];
      await prisma.$executeRawUnsafe(`
        INSERT INTO public."Address" ("userId", village, pincode, taluka, district, state, "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT ("userId") DO UPDATE
        SET village = EXCLUDED.village, pincode = EXCLUDED.pincode, taluka = EXCLUDED.taluka, district = EXCLUDED.district, state = EXCLUDED.state, "updatedAt" = NOW();
      `, shg.id, matchingSeller.village, matchingSeller.pincode, matchingSeller.taluka, matchingSeller.district, matchingSeller.state).catch(() => {});

      await prisma.$executeRawUnsafe(`
        INSERT INTO public."ShgServiceArea" (id, "shgUserId", village, pincode, status, "isPrimary", "updatedAt")
        VALUES ($1, $2, $3, $4, 'ACTIVE', true, NOW())
        ON CONFLICT (id) DO UPDATE
        SET village = EXCLUDED.village, pincode = EXCLUDED.pincode, status = 'ACTIVE', "isPrimary" = true, "updatedAt" = NOW();
      `, `SA-SHG-${shg.id}`, String(shg.id), matchingSeller.village, matchingSeller.pincode).catch(() => {});
    }
  }

  // 3. CREATE EXACTLY 20 NEW FRESH ORDERS (ORD-2026-101 to ORD-2026-120)
  console.log('Creating 20 new fresh orders with location-based SHG routing (Pincode + Village)...');

  for (let i = 1; i <= 20; i++) {
    const cleanNum = 100 + i; // 101 to 120
    const orderIdVal = `ORD-2026-${cleanNum}`;

    // Select Seller and Buyer deterministically
    const seller = sellers[(i - 1) % sellers.length];
    const buyer = buyers[(i - 1) % buyers.length];

    // Select matching SHG user by seller index
    const assignedShg = shgUsers.length > 0 ? shgUsers[(i - 1) % shgUsers.length] : null;
    const assignedShgId = assignedShg ? String(assignedShg.id) : null;

    // Select 2 distinct products from Product table
    const prod1 = products[(i - 1) % products.length];
    const prod2 = products[i % products.length];
    const selectedProds = [prod1, prod2];

    let totalWeight = 0;
    let totalQty = 0;

    selectedProds.forEach((p, idx) => {
      const qty = idx + 1;
      const w = Number(p.weight || 2.5);
      totalQty += qty;
      totalWeight += w * qty;
    });

    // Create Order record
    const createdOrder = await prisma.order.create({
      data: {
        orderId: orderIdVal,
        sellerId: seller.id,
        buyerId: buyer.id,
        totalWeight: totalWeight,
        totalQty: totalQty,
        productCount: selectedProds.length,
        barcode: `QR-2026-${cleanNum}-PCL-1`,
        phase: 'PICKUP',
        mainStatus: 'PENDING',
        pickupShgStatus: 'ACCEPTED',
        pickupTransporterStatus: null,
        dropShgStatus: 'PENDING',
        dropTransporterStatus: null,
        pickupShgId: assignedShgId,
      }
    });

    // Create OrderAssignment ONLY for the single matching SHG
    if (assignedShgId) {
      await prisma.orderAssignment.create({
        data: {
          orderId: createdOrder.id,
          assigneeId: assignedShgId,
          assigneeType: 'SHG',
          role: 'PICKUP',
          status: 'ACCEPTED'
        }
      }).catch(() => {});
    }

    // Create 2 individual per-product Parcel records with QR codes
    for (let pIdx = 0; pIdx < selectedProds.length; pIdx++) {
      const prod = selectedProds[pIdx];
      const parcelNum = pIdx + 1;
      const parcelIdVal = `PCL-2026-${cleanNum}-${parcelNum}`;
      const verificationCode = `V-2026-${cleanNum}-0${parcelNum}`;
      const qtyVal = pIdx + 1;
      const weightVal = Number(prod.weight || 2.5);

      const qrPayload = {
        parcelId: parcelIdVal,
        orderId: orderIdVal,
        orderNo: orderIdVal,
        productId: prod.id,
        productName: prod.name,
        quantity: qtyVal,
        weight: `${weightVal} KG`,
        verificationToken: verificationCode,
        token: verificationCode,
        version: 1,
      };

      const barcodeValue = JSON.stringify(qrPayload);
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(barcodeValue)}`;

      await prisma.parcel.create({
        data: {
          order: { connect: { id: createdOrder.id } },
          parcelId: parcelIdVal,
          productId: prod.id,
          productName: prod.name,
          parcelNumber: parcelNum,
          totalParcels: selectedProds.length,
          weight: String(weightVal),
          quantity: qtyVal,
          flowType: 'FORWARD',
          qrCodeValue: barcodeValue,
          createdBy: 'SYSTEM',
          verificationToken: verificationCode,
          qrImage: qrImageUrl,
          parcelStatus: 'PENDING'
        }
      });
    }

    console.log(`  - Created Order ${orderIdVal} | Seller: ${seller.sellerName} | Buyer: ${buyer.buyerName} | Products: [${prod1.name}, ${prod2.name}]`);
  }

  console.log('\n================================================================');
  console.log('🎉 SUCCESSFULLY RESET DATABASE WITH EXACTLY 20 FRESH ORDERS!');
  console.log('================================================================\n');

  await prisma.$disconnect();
}

resetAndSeed20Orders().catch(e => {
  console.error('Error resetting orders:', e);
  process.exit(1);
});
