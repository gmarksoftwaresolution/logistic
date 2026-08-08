import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedRealProducts() {
  console.log('=== SEEDING MULTIPLE REAL PRODUCTS INTO ORDERS ===\n');

  // Fetch all existing users to link sellerId
  const users = await prisma.user.findMany();
  let defaultUserId = users[0]?.id;

  if (!defaultUserId) {
    const newUser = await prisma.user.create({
      data: {
        authId: 'auth-seller-' + Date.now(),
        phoneNumber: '9999999999',
        role: 'SELLER'
      }
    });
    defaultUserId = newUser.id;
  }

  // 1. Fetch existing products or create sample products
  let dbProducts = await prisma.product.findMany();

  if (dbProducts.length < 2) {
    const sampleProducts = [
      { name: 'Moong Dal (Yellow)', category: 'Pulses', price: 180, weight: 2.0, Unit: 'kg', sellerId: defaultUserId },
      { name: 'Organic Turmeric Powder', category: 'Spices', price: 120, weight: 0.5, Unit: 'kg', sellerId: defaultUserId },
      { name: 'Pure Kolhapuri Jaggery', category: 'Sweetener', price: 210, weight: 3.0, Unit: 'kg', sellerId: defaultUserId },
      { name: 'Cold Pressed Groundnut Oil', category: 'Oils', price: 195, weight: 1.0, Unit: 'L', sellerId: defaultUserId },
      { name: 'Indrayani Rice', category: 'Grains', price: 350, weight: 5.0, Unit: 'kg', sellerId: defaultUserId },
    ];

    for (const sp of sampleProducts) {
      try {
        const created = await prisma.product.create({ data: sp });
        dbProducts.push(created);
      } catch (err) {
        console.log('Skip product note:', (err as any).message);
      }
    }
  }

  // Re-fetch all products
  dbProducts = await prisma.product.findMany();
  console.log(`Master Products catalog size: ${dbProducts.length}`);

  // 2. Fetch active orders
  const orders = await prisma.order.findMany({
    where: {
      orderId: {
        in: Array.from({ length: 30 }, (_, idx) => `ORD-2026-${101 + idx}`)
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${orders.length} orders (ORD-2026-101 to ORD-2026-130). Assigning multiple products to each...`);

  // Clear existing parcels for these orders
  const orderIdsList = orders.map(o => o.id);
  await prisma.parcel.deleteMany({
    where: { orderId: { in: orderIdsList } }
  });

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const cleanId = (order.orderId || order.id).replace(/^ORD-/, '');

    // Assign 2 distinct real products to each order
    const p1 = dbProducts[i % dbProducts.length];
    const p2 = dbProducts[(i + 1) % dbProducts.length];
    const selectedProducts = [p1, p2];

    let totalWeight = 0;
    let totalQty = 0;

    for (let pIdx = 0; pIdx < selectedProducts.length; pIdx++) {
      const prod = selectedProducts[pIdx];
      const parcelNum = pIdx + 1;
      const parcelIdVal = `PCL-${cleanId}-${parcelNum}-${i + 1}`;
      const barcodeValue = `QR-${cleanId}-PCL-${parcelNum}`;
      const verificationCode = `V-${cleanId}-0${parcelNum}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(barcodeValue)}`;

      const qtyVal = pIdx + 1;
      const weightVal = Number(prod.weight || 2.5);

      totalQty += qtyVal;
      totalWeight += weightVal * qtyVal;

      await prisma.parcel.create({
        data: {
          order: { connect: { id: order.id } },
          parcelId: parcelIdVal,
          productId: prod.id,
          productName: prod.name,
          parcelNumber: parcelNum,
          totalParcels: selectedProducts.length,
          weight: String(weightVal),
          quantity: qtyVal,
          flowType: 'FORWARD',
          qrCodeValue: barcodeValue,
          createdBy: 'SYSTEM',
          verificationToken: verificationCode,
          qrImage: qrImageUrl,
          parcelStatus: 'PENDING',
          currentHolderId: order.sellerId ? String(order.sellerId) : null,
          currentHolderType: 'SELLER',
        }
      });
    }

    // Update main order total products, quantity, weight, and barcode
    await prisma.order.update({
      where: { id: order.id },
      data: {
        barcode: `QR-${cleanId}-PCL-1`,
        productCount: selectedProducts.length,
        totalQty: totalQty,
        totalWeight: totalWeight,
        pickupShgStatus: 'ACCEPTED',
        mainStatus: 'PICKUP_ASSIGNED'
      }
    });

    console.log(`  - Updated Order ${order.orderId || order.id} -> 2 Products: [${p1.name}, ${p2.name}]`);
  }

  console.log('\n🎉 Successfully updated all active orders (ORD-2026-101 to ORD-2026-130) with multiple products!');
  await prisma.$disconnect();
}

seedRealProducts().catch(e => {
  console.error('Error seeding products:', e);
  process.exit(1);
});
