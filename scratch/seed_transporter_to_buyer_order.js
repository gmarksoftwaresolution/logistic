import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
});

async function main() {
  const seller = await prisma.user.findFirst({ where: { phoneNumber: '8888888888' } });
  const buyer = await prisma.user.findFirst({ where: { phoneNumber: '9999999991' } });
  const shg = await prisma.user.findFirst({ where: { phoneNumber: '7777777777' } });
  const transporter = await prisma.user.findFirst({ where: { phoneNumber: '9999999999' } });
  const product = await prisma.product.findFirst();

  if (!seller || !buyer || !shg || !transporter || !product) {
    console.error('Missing required users/products in DB!', {
      seller: !!seller,
      buyer: !!buyer,
      shg: !!shg,
      transporter: !!transporter,
      product: !!product
    });
    return;
  }

  const orderNo = `TR-BYR-${Date.now().toString().slice(-4)}`;
  console.log(`Creating order ${orderNo}...`);

  const masterOrder = await prisma.masterOrder.create({
    data: {
      orderNumber: orderNo,
      buyerId: buyer.id,
      totalAmount: product.price,
      paymentStatus: 'PENDING',
      status: 'CREATED',
      items: {
        create: {
          productId: product.id,
          sellerId: seller.id,
          quantity: 1,
          price: product.price,
        }
      }
    }
  });

  // Pickup leg: Completed since transporter has picked it up from the seller
  await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${orderNo}`,
      masterOrderId: masterOrder.id,
      sellerId: seller.id,
      shgId: shg.id,
      transporterId: transporter.id,
      status: 'COMPLETED',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        }
      }
    }
  });

  // Inbound Drop: Transporter delivering to SHG Hub (so buyerId is shg.id)
  const inboundDrop = await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-IN-${orderNo}`,
      masterOrderId: masterOrder.id,
      buyerId: shg.id, // Buyer of this leg is the SHG
      shgId: shg.id,
      transporterId: transporter.id,
      status: 'PENDING',
      deliveryAddress: 'Shanti Mahila SHG Center, Gram Panchayat Road, Halkarni',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        }
      }
    }
  });

  // Outbound Drop: SHG delivering to buyer (so buyerId is buyer.id)
  const outboundDrop = await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-OUT-${orderNo}`,
      masterOrderId: masterOrder.id,
      buyerId: buyer.id, // Buyer of this leg is the customer
      shgId: shg.id,
      transporterId: null,
      status: 'PENDING',
      deliveryAddress: 'Buyer Home, Kowad',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        }
      }
    }
  });

  console.log('--- SEEDING COMPLETED ---');
  console.log(`Created MasterOrder ID: ${masterOrder.id}`);
  console.log(`Created Inbound DropOrder ID: ${inboundDrop.id}`);
  console.log(`Created Outbound DropOrder ID: ${outboundDrop.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
