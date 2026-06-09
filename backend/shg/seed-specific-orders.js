require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  const shgUser = await prisma.user.findUnique({
    where: { phoneNumber: '7777777777' }
  });

  if (!shgUser) {
    console.log('SHG User not found!');
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

  // Create sellers with specific addresses for the pickup orders
  const seller102 = await prisma.user.create({
    data: {
      authId: crypto.randomUUID(),
      phoneNumber: `SELLER_102_${Date.now()}`,
      role: 'SELLER',
      fullName: 'Seller 102',
      isVerified: true,
      address: {
        create: {
          addressLine1: 'Shop No. 25, Near First Corner, Nesari',
          district: 'Kolhapur',
          state: 'Maharashtra',
          pincode: '416509'
        }
      }
    }
  });

  const seller104 = await prisma.user.create({
    data: {
      authId: crypto.randomUUID(),
      phoneNumber: `SELLER_104_${Date.now()}`,
      role: 'SELLER',
      fullName: 'Seller 104',
      isVerified: true,
      address: {
        create: {
          addressLine1: 'Gram Panchayat Road, Halkarni',
          district: 'Kolhapur',
          state: 'Maharashtra',
          pincode: '416509'
        }
      }
    }
  });

  const product102 = await prisma.product.create({
    data: { name: 'Product 102', price: 100, sellerId: seller102.id }
  });
  const product104 = await prisma.product.create({
    data: { name: 'Product 104', price: 100, sellerId: seller104.id }
  });

  // Common product for drop orders
  let commonSeller = await prisma.user.findFirst({ where: { role: 'SELLER' } });
  let commonProduct = await prisma.product.findFirst({ where: { sellerId: commonSeller.id } });

  const ordersToCreate = [
    {
      id: 'ORD-1769749895005-101',
      type: 'drop',
      deliveryAddress: 'HDFC Bank Road, Nesari',
      qty: 4,
      product: commonProduct,
      seller: commonSeller
    },
    {
      id: 'ORD-1769749895005-102',
      type: 'pickup',
      qty: 2,
      product: product102,
      seller: seller102
    },
    {
      id: 'ORD-1769749895005-103',
      type: 'drop',
      deliveryAddress: 'Sai Medical, Gadhinglaj',
      qty: 6,
      product: commonProduct,
      seller: commonSeller
    },
    {
      id: 'ORD-1769749895005-104',
      type: 'pickup',
      qty: 3,
      product: product104,
      seller: seller104
    },
    {
      id: 'ORD-1769749895005-105',
      type: 'drop',
      deliveryAddress: 'Surya Bakery, Nesari',
      qty: 5,
      product: commonProduct,
      seller: commonSeller
    }
  ];

  for (const orderData of ordersToCreate) {
    const masterOrder = await prisma.masterOrder.create({
      data: {
        orderNumber: orderData.id,
        buyerId: buyer.id,
        status: 'PENDING',
        totalAmount: orderData.product.price * orderData.qty,
        items: {
          create: [{
            sellerId: orderData.seller.id,
            productId: orderData.product.id,
            quantity: orderData.qty,
            price: orderData.product.price
          }]
        },
        ...(orderData.type === 'pickup' ? {
          pickupOrders: {
            create: [{
              sellerId: orderData.seller.id,
              shgId: shgUser.id,
              status: 'PENDING',
              items: {
                create: [{
                  productId: orderData.product.id,
                  quantity: orderData.qty
                }]
              }
            }]
          }
        } : {
          dropOrders: {
            create: [{
              buyerId: buyer.id,
              shgId: shgUser.id,
              status: 'PENDING',
              deliveryAddress: orderData.deliveryAddress,
              items: {
                create: [{
                  productId: orderData.product.id,
                  quantity: orderData.qty
                }]
              }
            }]
          }
        })
      }
    });
    console.log(`Created order ${orderData.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
