require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

async function main() {
  const targetPhone = '7575757575';
  const targetUser = await prisma.user.findUnique({
    where: { phoneNumber: targetPhone }
  });

  if (!targetUser) {
    console.error(`User with phone ${targetPhone} not found!`);
    process.exit(1);
  }

  // 1. Clean up existing orders for targetUser
  const pickupOrdersOld = await prisma.pickupOrder.findMany({
    where: { shgId: targetUser.id }
  });

  const dropOrdersOld = await prisma.dropOrder.findMany({
    where: { shgId: targetUser.id }
  });

  const masterOrderIds = new Set([
    ...pickupOrdersOld.map(o => o.masterOrderId),
    ...dropOrdersOld.map(o => o.masterOrderId)
  ]);

  const masterOrderIdsArray = Array.from(masterOrderIds);

  if (masterOrderIdsArray.length > 0) {
    console.log(`Cleaning up ${masterOrderIdsArray.length} existing master orders for SHG user ${targetUser.id}...`);
    
    await prisma.pickupTracking.deleteMany({
      where: { pickupOrder: { masterOrderId: { in: masterOrderIdsArray } } }
    });

    await prisma.dropTracking.deleteMany({
      where: { dropOrder: { masterOrderId: { in: masterOrderIdsArray } } }
    });

    await prisma.pickupOrderItem.deleteMany({
      where: { pickupOrder: { masterOrderId: { in: masterOrderIdsArray } } }
    });

    await prisma.pickupOrder.deleteMany({
      where: { masterOrderId: { in: masterOrderIdsArray } }
    });

    await prisma.dropOrderItem.deleteMany({
      where: { dropOrder: { masterOrderId: { in: masterOrderIdsArray } } }
    });

    await prisma.dropOrder.deleteMany({
      where: { masterOrderId: { in: masterOrderIdsArray } }
    });

    await prisma.masterOrderItem.deleteMany({
      where: { masterOrderId: { in: masterOrderIdsArray } }
    });

    await prisma.masterOrder.deleteMany({
      where: { id: { in: masterOrderIdsArray } }
    });
    
    console.log('Clean up complete.');
  }

  // 2. Start Seeding
  // Create a single buyer for drop orders
  let buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
  if (!buyer) {
    buyer = await prisma.user.create({
      data: {
        authId: crypto.randomUUID(),
        phoneNumber: '1111111111',
        role: 'BUYER',
        fullName: 'Test Buyer',
        isVerified: true
      }
    });
  }

  // Pickup addresses
  const pickupAddresses = [
    { id: '1', addr: 'Shop No. 25, Near First Corner, Nesari' },
    { id: '3', addr: 'Home No. 23, Chandgad' },
    { id: '4', addr: 'Market Road, Gadhinglaj' },
    { id: '7', addr: 'Patil Galli, Nesari' },
    { id: '9', addr: 'Shivaji Chowk, Chandgad' },
    { id: '11', addr: 'Gram Panchayat Road, Halkarni' },
    { id: '13', addr: 'Bus Stand Area, Kadgaon' },
    { id: '14', addr: 'Near Hanuman Temple, Ajara' },
    { id: '16', addr: 'Main Road, Mahagaon' },
    { id: '18', addr: 'Tilak Chowk, Gadhinglaj' },
  ];

  const sellers = {};
  const products = {};

  // Create sellers and products for pickups
  for (const p of pickupAddresses) {
    const seller = await prisma.user.create({
      data: {
        authId: crypto.randomUUID(),
        phoneNumber: `SELLER_P_${p.id}_${Date.now()}`,
        role: 'SELLER',
        fullName: `Seller ${p.id}`,
        isVerified: true,
        address: {
          create: {
            addressLine1: p.addr,
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416509'
          }
        }
      }
    });
    sellers[p.id] = seller;

    const product = await prisma.product.create({
      data: {
        name: `Product ${p.id}`,
        price: randomFloat(50, 500),
        sellerId: seller.id,
        weight: randomFloat(0.5, 8.0)
      }
    });
    products[p.id] = product;
  }

  // Common seller and product for Drop orders
  let commonSeller = await prisma.user.create({
    data: {
      authId: crypto.randomUUID(),
      phoneNumber: `SELLER_D_${Date.now()}`,
      role: 'SELLER',
      fullName: 'Common Seller for Drops',
      isVerified: true,
    }
  });

  let commonProduct = await prisma.product.create({
    data: {
      name: 'Drop Common Product',
      price: randomFloat(50, 500),
      sellerId: commonSeller.id,
      weight: randomFloat(0.5, 8.0)
    }
  });

  const orders = [
    { num: '1', type: 'pickup', idKey: '1' },
    { num: '2', type: 'drop', addr: 'HDFC Bank, Nesari' },
    { num: '3', type: 'pickup', idKey: '3' },
    { num: '4', type: 'pickup', idKey: '4' },
    { num: '5', type: 'drop', addr: 'Surya Bakery, Nesari' },
    { num: '6', type: 'drop', addr: 'Sai Medical, Gadhinglaj' },
    { num: '7', type: 'pickup', idKey: '7' },
    { num: '8', type: 'drop', addr: 'Mahalakshmi Stores, Halkarni' },
    { num: '9', type: 'pickup', idKey: '9' },
    { num: '10', type: 'drop', addr: 'SBI Bank, Chandgad' },
    { num: '11', type: 'pickup', idKey: '11' },
    { num: '12', type: 'drop', addr: 'Ganesh Traders, Ajara' },
    { num: '13', type: 'pickup', idKey: '13' },
    { num: '14', type: 'pickup', idKey: '14' },
    { num: '15', type: 'drop', addr: 'LIC Office Road, Chandgad' },
    { num: '16', type: 'pickup', idKey: '16' },
    { num: '17', type: 'drop', addr: 'Patil Agro Center, Nesari' },
    { num: '18', type: 'pickup', idKey: '18' },
    { num: '19', type: 'drop', addr: 'Shop No. 14, Market Complex, Kadgaon' },
    { num: '20', type: 'drop', addr: 'Near Primary School, Mahagaon' }
  ];

  let baseTime = new Date();
  // Start from 24 hours ago
  baseTime.setHours(baseTime.getHours() - 24);

  for (const o of orders) {
    const qty = randomInt(1, 10);
    const orderNumber = `#ORD-1769749895005-${o.num}`;
    
    baseTime = new Date(baseTime.getTime() + randomInt(15, 45) * 60000);

    let product, seller;
    if (o.type === 'pickup') {
      product = products[o.idKey];
      seller = sellers[o.idKey];
    } else {
      product = commonProduct;
      seller = commonSeller;
    }

    const masterOrderData = {
      orderNumber,
      buyerId: buyer.id,
      status: 'PENDING',
      totalAmount: product.price * qty,
      createdAt: baseTime,
      updatedAt: baseTime,
      items: {
        create: [{
          sellerId: seller.id,
          productId: product.id,
          quantity: qty,
          price: product.price
        }]
      }
    };

    if (o.type === 'pickup') {
      masterOrderData.pickupOrders = {
        create: [{
          sellerId: seller.id,
          shgId: targetUser.id,
          status: 'PENDING',
          createdAt: baseTime,
          pickupOrderNumber: `P-${orderNumber.substring(1)}`,
          items: {
            create: [{
              productId: product.id,
              quantity: qty
            }]
          }
        }]
      };
    } else {
      masterOrderData.dropOrders = {
        create: [{
          buyerId: buyer.id,
          shgId: targetUser.id,
          status: 'PENDING',
          deliveryAddress: o.addr,
          createdAt: baseTime,
          dropOrderNumber: `D-${orderNumber.substring(1)}`,
          items: {
            create: [{
              productId: product.id,
              quantity: qty
            }]
          }
        }]
      };
    }

    await prisma.masterOrder.create({
      data: masterOrderData
    });

    console.log(`Created order ${orderNumber} (${o.type}) with qty ${qty}, time ${baseTime.toISOString()}`);
  }

  console.log(`Successfully seeded 20 specific mixed orders for ${targetPhone}!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
