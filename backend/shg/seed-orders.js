const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  const shgUser = await prisma.user.findUnique({
    where: { phoneNumber: '7777777777' }
  });

  if (!shgUser) {
    console.log('SHG User with phone 7777777777 not found!');
    process.exit(1);
  }

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

  let seller = await prisma.user.findFirst({ where: { role: 'SELLER' } });
  if (!seller) {
    seller = await prisma.user.create({
      data: {
        authId: crypto.randomUUID(),
        phoneNumber: '2222222222',
        role: 'SELLER',
        fullName: 'Test Seller',
        isVerified: true
      }
    });
  }

  let product = await prisma.product.findFirst({ where: { sellerId: seller.id } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        name: 'Test Product',
        price: 150,
        stock: 100,
        sellerId: seller.id,
        category: 'Spices',
        weight: 1
      }
    });
  }

  console.log(`Seeding 10 orders for SHG ${shgUser.fullName} (ID: ${shgUser.id})...`);

  for (let i = 0; i < 10; i++) {
    const masterOrder = await prisma.masterOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}-${i}`,
        buyerId: buyer.id,
        status: 'PENDING',
        totalAmount: 300,
        items: {
          create: [{
            sellerId: seller.id,
            productId: product.id,
            quantity: 2,
            price: 150
          }]
        },
        pickupOrders: {
          create: [{
            sellerId: seller.id,
            shgId: shgUser.id,
            status: 'PENDING',
            items: {
              create: [{
                productId: product.id,
                quantity: 2
              }]
            }
          }]
        },
        dropOrders: {
          create: [{
            buyerId: buyer.id,
            shgId: shgUser.id,
            status: 'PENDING',
            deliveryAddress: '123 Test Avenue, Test City',
            items: {
              create: [{
                productId: product.id,
                quantity: 2
              }]
            }
          }]
        }
      }
    });
    console.log(`Created Master Order ID: ${masterOrder.id}`);
  }
  console.log('Seeding completed successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
