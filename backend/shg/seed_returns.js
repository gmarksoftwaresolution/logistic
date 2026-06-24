const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { randomUUID } = require('crypto');

const returnsData = [
  { type: 'P', id: 'RET-1769749895005-21', address: 'Patil Agro Center, Nesari' },
  { type: 'D', id: 'RET-1769749895005-22', address: 'Market Road, Gadhinglaj' },
  { type: 'P', id: 'RET-1769749895005-23', address: 'Sai Medical, Gadhinglaj' },
  { type: 'D', id: 'RET-1769749895005-24', address: 'Gram Panchayat Road, Halkarni' },
  { type: 'P', id: 'RET-1769749895005-25', address: 'Ganesh Traders, Ajara' },
  { type: 'D', id: 'RET-1769749895005-26', address: 'Shivaji Chowk, Chandgad' },
  { type: 'P', id: 'RET-1769749895005-27', address: 'Mahalakshmi Stores, Halkarni' },
  { type: 'D', id: 'RET-1769749895005-28', address: 'Main Road, Mahagaon' },
  { type: 'P', id: 'RET-1769749895005-29', address: 'Surya Bakery, Nesari' },
  { type: 'D', id: 'RET-1769749895005-30', address: 'Bus Stand Area, Kadgaon' },
];

const returnReasons = [
  "Customer Not Available",
  "Wrong Product Delivered",
  "Damaged Product",
  "Customer Rejected Order",
  "Address Issue",
  "Duplicate Delivery",
  "Product Quality Issue",
  "Order Cancelled After Dispatch"
];

async function main() {
  const shg = await prisma.user.findUnique({ where: { phoneNumber: '7575757575' } });
  if (!shg) {
    console.log("SHG not found!");
    return;
  }
  
  const buyer = await prisma.user.upsert({
    where: { phoneNumber: 'BUYER-TEMP' },
    update: {},
    create: {
      authId: randomUUID(),
      phoneNumber: 'BUYER-TEMP',
      role: 'BUYER',
      fullName: 'Temp Buyer',
      isVerified: true,
    }
  });

  const now = Date.now();

  for (let i = 0; i < returnsData.length; i++) {
    const o = returnsData[i];
    const qty = Math.floor(Math.random() * 10) + 1; // 1 to 10
    const weight = parseFloat((Math.random() * 7.5 + 0.5).toFixed(1)); // 0.5 to 8.0
    const reason = returnReasons[Math.floor(Math.random() * returnReasons.length)];
    
    // Unique timestamp per order (spaced by 10 minutes)
    const orderDate = new Date(now - (returnsData.length - i) * 10 * 60 * 1000);

    let seller = await prisma.user.findFirst({ where: { role: 'SELLER', phoneNumber: 'SELL-RET-GENERIC' } });
    if (!seller) {
      seller = await prisma.user.create({
        data: {
          authId: randomUUID(),
          phoneNumber: 'SELL-RET-GENERIC',
          role: 'SELLER',
          fullName: 'Generic Seller',
          isVerified: true
        }
      });
    }

    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        name: `Returned Product for ${o.id}`,
        price: 100,
        weight: weight
      }
    });

    const masterOrder = await prisma.masterOrder.create({
      data: {
        orderNumber: `MO-${o.id}`,
        buyerId: buyer.id,
        totalAmount: 100,
        createdAt: orderDate
      }
    });

    // Create the DropOrder
    const dropOrder = await prisma.dropOrder.create({
      data: {
        dropOrderNumber: o.id,
        masterOrderId: masterOrder.id,
        buyerId: o.type === 'P' ? shg.id : buyer.id, // P means shg is receiving it (buyerId = shgId). D means shg is dropping it to buyer.
        shgId: shg.id,
        status: 'RETURN_PENDING',
        deliveryAddress: o.address,
        createdAt: orderDate,
        items: {
          create: [{ productId: product.id, quantity: qty }]
        }
      }
    });

    // Add tracking
    await prisma.dropTracking.create({
      data: {
        dropOrderId: dropOrder.id,
        status: 'RETURN_PENDING',
        remarks: `Return initiated. Reason: ${reason}`
      }
    });
  }

  console.log("Seeded 10 return orders successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
