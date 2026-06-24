const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { randomUUID } = require('crypto');

const ordersData = [
  { type: 'P', id: 'ORD-1769749895005-1', address: 'Shop No. 25, Near First Corner, Nesari' },
  { type: 'D', id: 'ORD-1769749895005-2', address: 'HDFC Bank, Nesari' },
  { type: 'P', id: 'ORD-1769749895005-3', address: 'Home No. 23, Chandgad' },
  { type: 'P', id: 'ORD-1769749895005-4', address: 'Market Road, Gadhinglaj' },
  { type: 'D', id: 'ORD-1769749895005-5', address: 'Surya Bakery, Nesari' },
  { type: 'D', id: 'ORD-1769749895005-6', address: 'Sai Medical, Gadhinglaj' },
  { type: 'P', id: 'ORD-1769749895005-7', address: 'Patil Galli, Nesari' },
  { type: 'D', id: 'ORD-1769749895005-8', address: 'Mahalakshmi Stores, Halkarni' },
  { type: 'P', id: 'ORD-1769749895005-9', address: 'Shivaji Chowk, Chandgad' },
  { type: 'D', id: 'ORD-1769749895005-10', address: 'SBI Bank, Chandgad' },
  { type: 'P', id: 'ORD-1769749895005-11', address: 'Gram Panchayat Road, Halkarni' },
  { type: 'D', id: 'ORD-1769749895005-12', address: 'Ganesh Traders, Ajara' },
  { type: 'P', id: 'ORD-1769749895005-13', address: 'Bus Stand Area, Kadgaon' },
  { type: 'P', id: 'ORD-1769749895005-14', address: 'Near Hanuman Temple, Ajara' },
  { type: 'D', id: 'ORD-1769749895005-15', address: 'LIC Office Road, Chandgad' },
  { type: 'P', id: 'ORD-1769749895005-16', address: 'Main Road, Mahagaon' },
  { type: 'D', id: 'ORD-1769749895005-17', address: 'Patil Agro Center, Nesari' },
  { type: 'P', id: 'ORD-1769749895005-18', address: 'Tilak Chowk, Gadhinglaj' },
  { type: 'D', id: 'ORD-1769749895005-19', address: 'Shop No. 14, Market Complex, Kadgaon' },
  { type: 'D', id: 'ORD-1769749895005-20', address: 'Near Primary School, Mahagaon' }
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

  for (let i = 0; i < ordersData.length; i++) {
    const o = ordersData[i];
    const qty = Math.floor(Math.random() * 10) + 1; // 1 to 10
    const weight = parseFloat((Math.random() * 7.5 + 0.5).toFixed(1)); // 0.5 to 8.0
    
    // Unique timestamp per order (spaced by 10 minutes)
    const orderDate = new Date(now - (ordersData.length - i) * 10 * 60 * 1000);

    let sellerId;
    if (o.type === 'P') {
      const seller = await prisma.user.create({
        data: {
          authId: randomUUID(),
          phoneNumber: `SELL-${o.id}`,
          role: 'SELLER',
          fullName: o.address, // UI uses seller.fullName as 'fromLocation'
          isVerified: true
        }
      });
      sellerId = seller.id;
    } else {
      let seller = await prisma.user.findFirst({ where: { role: 'SELLER', phoneNumber: 'SELL-GENERIC' } });
      if (!seller) {
        seller = await prisma.user.create({
          data: {
            authId: randomUUID(),
            phoneNumber: 'SELL-GENERIC',
            role: 'SELLER',
            fullName: 'Generic Seller',
            isVerified: true
          }
        });
      }
      sellerId = seller.id;
    }

    const product = await prisma.product.create({
      data: {
        sellerId,
        name: `Product for ${o.id}`,
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

    if (o.type === 'P') {
      await prisma.pickupOrder.create({
        data: {
          pickupOrderNumber: o.id,
          masterOrderId: masterOrder.id,
          sellerId,
          shgId: shg.id,
          status: 'PENDING',
          createdAt: orderDate,
          items: {
            create: [{ productId: product.id, quantity: qty }]
          }
        }
      });
    } else {
      // Drop
      await prisma.dropOrder.create({
        data: {
          dropOrderNumber: o.id,
          masterOrderId: masterOrder.id,
          buyerId: buyer.id,
          shgId: shg.id,
          status: 'PENDING',
          deliveryAddress: o.address,
          createdAt: orderDate,
          items: {
            create: [{ productId: product.id, quantity: qty }]
          }
        }
      });
    }
  }

  console.log("Seeded 20 incoming orders successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
