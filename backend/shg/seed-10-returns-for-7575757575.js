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

  // 1. Clean up existing RETURN orders for targetUser to avoid clutter
  // Optional: We won't clean up regular orders so they can still test the main flow

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

  let commonSeller = await prisma.user.findFirst({ where: { fullName: 'Common Seller for Drops' } });
  if (!commonSeller) {
    commonSeller = await prisma.user.create({
      data: {
        authId: crypto.randomUUID(),
        phoneNumber: `SELLER_D_${Date.now()}`,
        role: 'SELLER',
        fullName: 'Common Seller for Drops',
        isVerified: true,
      }
    });
  }

  let commonProduct = await prisma.product.findFirst({ where: { name: 'Drop Common Product' } });
  if (!commonProduct) {
    commonProduct = await prisma.product.create({
      data: {
        name: 'Drop Common Product',
        price: randomFloat(50, 500),
        sellerId: commonSeller.id,
        weight: randomFloat(0.5, 8.0)
      }
    });
  }

  const orders = [
    { num: 'R1', type: 'return_pickup', addr: 'Transporter to SHG' },
    { num: 'R2', type: 'return_drop', addr: 'SHG back to Seller 1' },
    { num: 'R3', type: 'return_pickup', addr: 'Transporter to SHG' },
    { num: 'R4', type: 'return_drop', addr: 'SHG back to Seller 2' },
    { num: 'R5', type: 'return_pickup', addr: 'Transporter to SHG' },
    { num: 'R6', type: 'return_drop', addr: 'SHG back to Seller 3' },
    { num: 'R7', type: 'return_pickup', addr: 'Transporter to SHG' },
    { num: 'R8', type: 'return_drop', addr: 'SHG back to Seller 4' },
    { num: 'R9', type: 'return_pickup', addr: 'Transporter to SHG' },
    { num: 'R10', type: 'return_drop', addr: 'SHG back to Seller 5' }
  ];

  let baseTime = new Date();
  baseTime.setHours(baseTime.getHours() - 12);

  for (const o of orders) {
    const qty = randomInt(1, 5);
    const orderNumber = `#ORD-RET-1769749895005-${o.num}`;
    
    baseTime = new Date(baseTime.getTime() + randomInt(5, 20) * 60000);

    const masterOrderData = {
      orderNumber,
      buyerId: buyer.id,
      status: 'RETURNED', // Master order is returned
      totalAmount: commonProduct.price * qty,
      createdAt: baseTime,
      updatedAt: baseTime,
      items: {
        create: [{
          sellerId: commonSeller.id,
          productId: commonProduct.id,
          quantity: qty,
          price: commonProduct.price
        }]
      }
    };

    if (o.type === 'return_pickup') {
      // Return pickup: SHG receives it from Transporter
      // In our model, this is a DropOrder where buyerId = shgId
      masterOrderData.dropOrders = {
        create: [{
          buyerId: targetUser.id, // SHG is the "buyer" receiving the return from transporter
          shgId: targetUser.id,
          status: 'RETURN_PENDING',
          deliveryAddress: o.addr,
          createdAt: baseTime,
          dropOrderNumber: `D-${orderNumber.substring(1)}`,
          items: {
            create: [{
              productId: commonProduct.id,
              quantity: qty
            }]
          }
        }]
      };
    } else {
      // Return drop: SHG delivers it back to the seller
      // In our model, this is a DropOrder where buyerId != shgId
      masterOrderData.dropOrders = {
        create: [{
          buyerId: commonSeller.id, // Seller is the "buyer" receiving the return from SHG
          shgId: targetUser.id,
          status: 'RETURN_PENDING',
          deliveryAddress: o.addr,
          createdAt: baseTime,
          dropOrderNumber: `D-${orderNumber.substring(1)}`,
          items: {
            create: [{
              productId: commonProduct.id,
              quantity: qty
            }]
          }
        }]
      };
    }

    await prisma.masterOrder.create({
      data: masterOrderData
    });

    console.log(`Created return order ${orderNumber} (${o.type}) with qty ${qty}, time ${baseTime.toISOString()}`);
  }

  console.log(`Successfully seeded 10 incoming return orders for ${targetPhone}!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
