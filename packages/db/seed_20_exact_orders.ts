import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING SEED 20 EXACT ORDERS SCRIPT ---');

  // Clean up existing order data
  console.log('Cleaning up existing order data...');
  await prisma.pickupTracking.deleteMany();
  await prisma.dropTracking.deleteMany();
  await prisma.pickupOrderItem.deleteMany();
  await prisma.pickupOrder.deleteMany();
  await prisma.dropOrderItem.deleteMany();
  await prisma.dropOrder.deleteMany();
  await prisma.masterOrderItem.deleteMany();
  await prisma.masterOrder.deleteMany();



  // Ensure SHG User exists (phone: 7575757575)
  console.log('Ensuring SHG User exists (phone: 7575757575)...');
  let shg = await prisma.user.findFirst({
    where: { phoneNumber: '7575757575', role: UserRole.SHG }
  });
  if (!shg) {
    shg = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '7575757575',
        role: UserRole.SHG,
        fullName: 'Mahadev',
        isVerified: true,
      }
    });
  }

  // Ensure Transporter User exists
  let transporter = await prisma.user.findFirst({
    where: { phoneNumber: '9999999999', role: UserRole.TRANSPORTER }
  });
  if (!transporter) {
    transporter = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '9999999999',
        role: UserRole.TRANSPORTER,
        fullName: 'Mahendra Powar',
        isVerified: true,
      }
    });
  }

  // Configuration of the exactly 20 orders requested
  const exactOrders = [
    { type: 'pickup', id: 'ORD-1769749895005-1',  addr: 'Shop No. 25, Near First Corner, Nesari' },
    { type: 'drop',   id: 'ORD-1769749895005-2',  addr: 'HDFC Bank, Nesari' },
    { type: 'pickup', id: 'ORD-1769749895005-3',  addr: 'Home No. 23, Chandgad' },
    { type: 'pickup', id: 'ORD-1769749895005-4',  addr: 'Market Road, Gadhinglaj' },
    { type: 'drop',   id: 'ORD-1769749895005-5',  addr: 'Surya Bakery, Nesari' },
    { type: 'drop',   id: 'ORD-1769749895005-6',  addr: 'Sai Medical, Gadhinglaj' },
    { type: 'pickup', id: 'ORD-1769749895005-7',  addr: 'Patil Galli, Nesari' },
    { type: 'drop',   id: 'ORD-1769749895005-8',  addr: 'Mahalakshmi Stores, Halkarni' },
    { type: 'pickup', id: 'ORD-1769749895005-9',  addr: 'Shivaji Chowk, Chandgad' },
    { type: 'drop',   id: 'ORD-1769749895005-10', addr: 'SBI Bank, Chandgad' },
    { type: 'pickup', id: 'ORD-1769749895005-11', addr: 'Gram Panchayat Road, Halkarni' },
    { type: 'drop',   id: 'ORD-1769749895005-12', addr: 'Ganesh Traders, Ajara' },
    { type: 'pickup', id: 'ORD-1769749895005-13', addr: 'Bus Stand Area, Kadgaon' },
    { type: 'pickup', id: 'ORD-1769749895005-14', addr: 'Near Hanuman Temple, Ajara' },
    { type: 'drop',   id: 'ORD-1769749895005-15', addr: 'LIC Office Road, Chandgad' },
    { type: 'pickup', id: 'ORD-1769749895005-16', addr: 'Main Road, Mahagaon' },
    { type: 'drop',   id: 'ORD-1769749895005-17', addr: 'Patil Agro Center, Nesari' },
    { type: 'pickup', id: 'ORD-1769749895005-18', addr: 'Tilak Chowk, Gadhinglaj' },
    { type: 'drop',   id: 'ORD-1769749895005-19', addr: 'Shop No. 14, Market Complex, Kadgaon' },
    { type: 'drop',   id: 'ORD-1769749895005-20', addr: 'Near Primary School, Mahagaon' },
  ];

  console.log('Seeding 20 exact orders...');
  const now = new Date();

  for (let i = 0; i < exactOrders.length; i++) {
    const item = exactOrders[i];
    
    // Generate different timestamps for all orders (spaced by 5 mins)
    const orderDate = new Date(now.getTime() - (20 - i) * 5 * 60000);
    
    // Randomize
    const qty = Math.floor(Math.random() * 10) + 1; // 1-10
    const weight = (Math.random() * 7.5 + 0.5).toFixed(1); // 0.5 - 8.0 kg

    const testPhone = `88${Math.floor(Math.random() * 90000000).toString().padStart(8, '0')}`;
    const testPhone2 = `89${Math.floor(Math.random() * 90000000).toString().padStart(8, '0')}`;
    
    const isPickup = item.type === 'pickup';

    // Create dummy users for seller and buyer
    const seller = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: testPhone,
        role: UserRole.SELLER,
        fullName: `Test Seller ${i+1}`,
        address: {
          create: {
            addressLine1: isPickup ? item.addr : 'Transporter Hub',
            addressLine2: 'Test area',
            village: isPickup ? (item.addr.split(', ').pop() || 'Unknown') : 'Hub',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416509',
          }
        }
      }
    });

    const buyer = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: testPhone2,
        role: UserRole.BUYER,
        fullName: `Test Buyer ${i+1}`,
        address: {
          create: {
            addressLine1: !isPickup ? item.addr : 'Transporter Hub',
            addressLine2: 'Test area',
            village: !isPickup ? (item.addr.split(', ').pop() || 'Unknown') : 'Hub',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416509',
          }
        }
      }
    });

    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        name: `Test Product ${i+1}`,
        category: 'FOOD',
        price: 120.0,
        stock: 500,
        weight: parseFloat(weight),
      }
    });

    const masterOrder = await prisma.masterOrder.create({
      data: {
        orderNumber: item.id, // exact ORD-1769749895005-X string
        totalAmount: qty * 120.0,
        buyerId: buyer.id,
        paymentStatus: 'PENDING',
        paymentMethod: 'Online',
        status: 'PENDING', // Keep as PENDING so it appears in new incoming orders
        createdAt: orderDate,
        updatedAt: orderDate,
        items: {
          create: {
            productId: product.id,
            sellerId: seller.id,
            quantity: qty,
            price: 120.0,
          }
        }
      }
    });

    if (isPickup) {
      await prisma.pickupOrder.create({
        data: {
          pickupOrderNumber: item.id,
          masterOrderId: masterOrder.id,
          sellerId: seller.id,
          shgId: shg.id, // Only for Pickup it's assigned to SHG right away
          transporterId: transporter.id,
          status: 'PENDING',
          createdAt: orderDate,
          items: {
            create: {
              productId: product.id,
              quantity: qty,
            }
          }
        }
      });
      // We still create the DropOrder to fulfill schema integrity, but unassigned to SHG
      await prisma.dropOrder.create({
        data: {
          dropOrderNumber: item.id.replace('PKP', 'DRP'), // just dummy logic, won't show
          masterOrderId: masterOrder.id,
          buyerId: buyer.id,
          shgId: null, // NOT assigned to SHG
          transporterId: transporter.id,
          status: 'PENDING',
          createdAt: orderDate,
          items: {
            create: {
              productId: product.id,
              quantity: qty,
            }
          }
        }
      });
      console.log(`Created Pickup: ${item.id} from ${item.addr} (Qty: ${qty}, Weight: ${weight}kg)`);
    } else {
      await prisma.pickupOrder.create({
        data: {
          pickupOrderNumber: item.id.replace('DRP', 'PKP'),
          masterOrderId: masterOrder.id,
          sellerId: seller.id,
          shgId: null, // NOT assigned to SHG
          transporterId: transporter.id,
          status: 'COMPLETED',
          createdAt: orderDate,
          items: {
            create: {
              productId: product.id,
              quantity: qty,
            }
          }
        }
      });
      await prisma.dropOrder.create({
        data: {
          dropOrderNumber: item.id,
          masterOrderId: masterOrder.id,
          buyerId: buyer.id,
          shgId: shg.id, // Assigned specifically to SHG
          transporterId: transporter.id,
          status: 'PENDING',
          createdAt: orderDate,
          items: {
            create: {
              productId: product.id,
              quantity: qty,
            }
          }
        }
      });
      console.log(`Created Drop: ${item.id} to ${item.addr} (Qty: ${qty}, Weight: ${weight}kg)`);
    }
  }

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
