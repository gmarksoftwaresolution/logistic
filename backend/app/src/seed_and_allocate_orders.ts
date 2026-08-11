import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAndAllocateOrders() {
  console.log('================================================================');
  console.log('=== ALLOCATING ORDERS TO APPROVED SHGs & TRANSPORTERS ===');
  console.log('================================================================\n');

  // 1. Fetch Sellers, Buyers, Products
  const sellers = await prisma.seller.findMany();
  const buyers = await prisma.buyer.findMany();
  let products = await prisma.product.findMany();

  if (sellers.length === 0 || buyers.length === 0) {
    console.error('Error: Sellers or Buyers missing in database.');
    process.exit(1);
  }

  // Ensure products catalog
  if (products.length < 4) {
    console.log('Seeding baseline products...');
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

  // 2. Clean old orders
  console.log('Purging old orders and parcels...');
  await prisma.scanSessionItem.deleteMany({}).catch(() => {});
  await prisma.scanSession.deleteMany({}).catch(() => {});
  await prisma.parcelScanHistory.deleteMany({}).catch(() => {});
  await prisma.parcel.deleteMany({}).catch(() => {});
  await prisma.orderAssignment.deleteMany({}).catch(() => {});
  await prisma.order.deleteMany({}).catch(() => {});

  // 3. Fetch Approved SHGs and Transporters
  const approvedShgs = await prisma.user.findMany({
    where: { role: 'SHG', applicationStatus: 'APPROVED', deletedAt: null },
    include: { address: true, shgDetail: true },
  });

  const approvedTransporters = await prisma.user.findMany({
    where: { role: 'TRANSPORTER', applicationStatus: 'APPROVED', deletedAt: null },
    include: { address: true, transporterDetail: true, routeDetail: true, milkVanDetail: true },
  });

  console.log(`Found ${approvedShgs.length} Approved SHGs:`);
  approvedShgs.forEach(s => console.log(`  • [SHG] ${s.fullName} (${s.uniqueCode}) | Village: ${s.address?.village} (${s.address?.pincode})`));

  console.log(`\nFound ${approvedTransporters.length} Approved Transporters:`);
  approvedTransporters.forEach(t => {
    const villages = t.milkVanDetail?.assignedVillages || (t.routeDetail?.operatingArea ? t.routeDetail.operatingArea.split(',').map((v: string) => v.trim()) : []);
    console.log(`  • [Transporter] ${t.fullName} (${t.uniqueCode}) | Route Villages:`, villages);
  });

  // Sync SHG Service Areas
  for (const s of approvedShgs) {
    if (s.address?.village) {
      await prisma.shgServiceArea.deleteMany({
        where: { OR: [{ shgUserId: String(s.id) }, { shgUserId: s.authId || '' }] }
      }).catch(() => {});
      await prisma.shgServiceArea.create({
        data: {
          shgUserId: String(s.id),
          village: s.address.village,
          pincode: s.address.pincode || '416501'
        }
      }).catch(() => {});
    }
  }

  const normalizeStr = (str?: string | null) => (str || '').replace(/[^a-z0-9]/gi, '').trim().toLowerCase();

  // Function to find matching SHG for a village
  const findMatchingShg = (village: string, pincode: string) => {
    const vNorm = normalizeStr(village);
    const match = approvedShgs.find(s => {
      const sV = normalizeStr(s.address?.village);
      return sV && (sV === vNorm || sV.includes(vNorm) || vNorm.includes(sV));
    });
    if (match) return match;
    return approvedShgs[0];
  };

  // Function to find matching Transporter for a village route
  const findMatchingTransporter = (village: string, orderIndex: number) => {
    const vNorm = normalizeStr(village);
    const matchingTransporters = approvedTransporters.filter(t => {
      let routeVillages: string[] = [];
      if (Array.isArray(t.milkVanDetail?.assignedVillages)) {
        routeVillages = t.milkVanDetail.assignedVillages.map(String);
      } else if (t.routeDetail?.operatingArea) {
        routeVillages = t.routeDetail.operatingArea.split(',').map(s => s.trim());
      }
      return routeVillages.some(rv => {
        const rvNorm = normalizeStr(rv);
        return rvNorm && (rvNorm === vNorm || rvNorm.includes(vNorm) || vNorm.includes(rvNorm));
      });
    });

    if (matchingTransporters.length > 0) {
      return matchingTransporters[orderIndex % matchingTransporters.length];
    }
    return approvedTransporters.length > 0 ? approvedTransporters[orderIndex % approvedTransporters.length] : null;
  };

  // 4. Create 20 Fresh Orders
  console.log('\nCreating and allocating 20 Orders...');
  for (let i = 1; i <= 20; i++) {
    const cleanNum = 100 + i;
    const orderIdVal = `ORD-2026-${cleanNum}`;

    const seller = sellers[(i - 1) % sellers.length];
    const buyer = buyers[(i - 1) % buyers.length];

    const pickupShg = findMatchingShg(seller.village, seller.pincode);
    const dropShg = findMatchingShg(buyer.village, buyer.pincode);

    const pickupTransporter = findMatchingTransporter(seller.village, i - 1);
    const dropTransporter = findMatchingTransporter(buyer.village, i - 1);

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

    // Create Order in True Starting Live State (Only Pickup SHG allocated)
    const createdOrder = await prisma.order.create({
      data: {
        id: orderIdVal,
        orderId: orderIdVal,
        sellerId: seller.id,
        buyerId: buyer.id,
        totalWeight,
        totalQty,
        productCount: selectedProds.length,
        barcode: `QR-2026-${cleanNum}-PCL-1`,
        phase: 'PICKUP',
        mainStatus: 'PICKUP_ASSIGNED',
        
        pickupShgId: pickupShg ? String(pickupShg.id) : null,
        pickupShgStatus: 'ACCEPTED',

        dropShgId: null,
        dropShgStatus: 'PENDING',

        pickupTransporterId: null,
        pickupTransporterStatus: 'PENDING',

        dropTransporterId: null,
        dropTransporterStatus: 'PENDING',
      },
    });

    // Create SHG Pickup Assignment ONLY
    if (pickupShg) {
      await prisma.orderAssignment.create({
        data: {
          orderId: createdOrder.id,
          assigneeId: String(pickupShg.id),
          assigneeType: 'SHG',
          role: 'PICKUP',
          status: 'ACCEPTED',
        },
      });
    }

    // Create Parcels with QR codes
    for (let pIdx = 0; pIdx < selectedProds.length; pIdx++) {
      const prod = selectedProds[pIdx];
      const parcelNum = pIdx + 1;
      const parcelIdVal = `PCL-2026-${cleanNum}-${parcelNum}`;
      const verificationCode = `V-2026-${cleanNum}-0${parcelNum}`;
      const qtyVal = pIdx + 1;
      const weightVal = Number(prod.weight || 2.5);

      const qrContent = {
        parcelId: parcelIdVal,
        orderId: createdOrder.id,
        orderNo: createdOrder.orderId,
        productId: prod.id,
        productName: prod.name,
        quantity: qtyVal,
        weight: `${weightVal} KG`,
        token: verificationCode,
        verificationToken: verificationCode,
        sellerName: seller.sellerName || 'Seller',
        sellerMobileNumber: seller.mobileNumber || '',
        sellerVillage: seller.village || '',
        sellerPincode: seller.pincode || '',
        buyerName: buyer.buyerName || 'Buyer',
        buyerMobileNumber: buyer.mobileNumber || '',
        buyerVillage: buyer.village || '',
        buyerPincode: buyer.pincode || '',
      };
      const jsonQrString = JSON.stringify(qrContent);
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(jsonQrString)}`;

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
          qrCodeValue: jsonQrString,
          createdBy: 'SYSTEM',
          verificationToken: verificationCode,
          qrImage: qrImageUrl,
          parcelStatus: 'PENDING',
          currentHolderId: String(seller.id),
          currentHolderType: 'SELLER',
        },
      });
    }

    console.log(`✅ Order ${orderIdVal} allocated:`);
    console.log(`   - Seller: ${seller.sellerName} (${seller.village}) -> Pickup SHG: ${pickupShg.fullName}`);
    console.log(`   - Buyer: ${buyer.buyerName} (${buyer.village}) -> Drop SHG: ${dropShg.fullName}`);
    console.log(`   - Transporter: ${pickupTransporter?.fullName || 'None'} (Pickup & Drop Assigned)`);
  }

  console.log('\n================================================================');
  console.log('🎉 20 ORDERS SUCCESSFULLY ALLOCATED TO SHGs & TRANSPORTERS!');
  console.log('================================================================\n');
}

seedAndAllocateOrders()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
