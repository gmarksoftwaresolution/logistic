process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Mimic the OrderService logic from order.service.ts
async function main() {
  const transporterId = 66;

  console.log(`Simulating getAssignedPickups for transporter ${transporterId}...`);
  const pickups = await prisma.pickupOrder.findMany({
    where: {
      OR: [
        { transporterId },
        { transporterId: null },
      ],
      status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURNED'] },
    },
    include: {
      seller: {
        select: {
          fullName: true,
          phoneNumber: true,
          address: true,
        },
      },
      shg: {
        include: {
          shgDetail: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
      masterOrder: {
        include: {
          dropOrders: {
            include: {
              tracking: {
                orderBy: { updatedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
      tracking: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`Pickups count: ${pickups.length}`);

  console.log(`\nSimulating getAssignedDrops for transporter ${transporterId}...`);
  const drops = await prisma.dropOrder.findMany({
    where: {
      OR: [
        { transporterId },
        { transporterId: null },
      ],
      status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'COMPLETED', 'REJECTED', 'RETURN_PENDING', 'RETURN_ACCEPTED', 'RETURN_PICKED_UP', 'RETURNED'] },
    },
    select: {
      id: true,
      dropOrderNumber: true,
      masterOrderId: true,
      buyerId: true,
      shgId: true,
      transporterId: true,
      status: true,
      deliveryAddress: true,
      createdAt: true,
      handoverCode: true,
      buyer: {
        select: {
          fullName: true,
          phoneNumber: true,
          address: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
      masterOrder: {
        include: {
          pickupOrders: {
            include: {
              seller: {
                select: {
                  fullName: true,
                  phoneNumber: true,
                  address: true,
                }
              },
              tracking: {
                orderBy: { updatedAt: 'desc' },
                take: 1
              }
            }
          }
        }
      },
      tracking: {
        orderBy: { updatedAt: 'desc' },
        take: 1
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`Drops count: ${drops.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
