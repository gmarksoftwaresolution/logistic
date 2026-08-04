import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables manually from the gmu module .env
const dotenvPath = path.join(__dirname, '../.env');
if (fs.existsSync(dotenvPath)) {
  const dotenvContent = fs.readFileSync(dotenvPath, 'utf8');
  dotenvContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

// Override connection for stable seeding if DIRECT_URL is present
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding inventory orders...');

  // 1. Find Seller and Buyer
  const seller = await prisma.seller.findFirst({
    where: { village: { contains: 'Gadhinglaj', mode: 'insensitive' } }
  });

  const buyer = await prisma.buyer.findFirst({
    where: { village: { contains: 'Mahagaon', mode: 'insensitive' } }
  });

  if (!seller || !buyer) {
    throw new Error('Seller or Buyer not found');
  }

  // 2. Find any Product in the database
  const products = await prisma.$queryRawUnsafe(`
    SELECT id, price, name, weight, seller_id FROM public.products LIMIT 1;
  `) as any[];

  if (products.length === 0) {
    throw new Error(`No products found in public.products`);
  }
  const product = products[0];
  console.log(`Using Product: ${product.name} (ID: ${product.id}, Price: ${product.price})`);

  const seedOrders = [
    // Stored Inventory Orders
    {
      orderId: 'ORD-INV-STORED-1',
      mainStatus: 'STORED',
      returnType: null,
      totalWeight: 12.5,
      productCount: 1,
      totalQty: 2,
    },
    {
      orderId: 'ORD-INV-STORED-2',
      mainStatus: 'AT_HUB',
      returnType: null,
      totalWeight: 8.0,
      productCount: 1,
      totalQty: 1,
    },
    {
      orderId: 'ORD-INV-STORED-3',
      mainStatus: 'STORED',
      returnType: null,
      totalWeight: 25.0,
      productCount: 2,
      totalQty: 5,
    },
    // Transporter Return Orders
    {
      orderId: 'ORD-INV-T-RET-1',
      mainStatus: 'INVENTORY_TRANSPORTER_RETURN',
      returnType: 'TRANSPORTER_RETURN',
      totalWeight: 18.2,
      productCount: 1,
      totalQty: 1,
    },
    {
      orderId: 'ORD-INV-T-RET-2',
      mainStatus: 'INVENTORY_TRANSPORTER_RETURN',
      returnType: 'TRANSPORTER_RETURN',
      totalWeight: 5.5,
      productCount: 1,
      totalQty: 1,
    },
    // Buyer Return Orders
    {
      orderId: 'ORD-INV-B-RET-1',
      mainStatus: 'INVENTORY_BUYER_RETURN',
      returnType: 'BUYER_RETURN',
      totalWeight: 10.0,
      productCount: 1,
      totalQty: 1,
    },
    {
      orderId: 'ORD-INV-B-RET-2',
      mainStatus: 'INVENTORY_BUYER_RETURN',
      returnType: 'BUYER_RETURN',
      totalWeight: 14.5,
      productCount: 1,
      totalQty: 1,
    },
  ];

  for (const info of seedOrders) {
    console.log(`Creating order ${info.orderId}...`);

    // Delete existing order if it exists to make seed repeatable
    await prisma.order.deleteMany({
      where: { orderId: info.orderId }
    });

    const rawMo = await prisma.$queryRawUnsafe(`
      SELECT id FROM public.master_orders WHERE order_number = $1 LIMIT 1;
    `, info.orderId) as any[];

    if (rawMo.length > 0) {
      await prisma.$executeRawUnsafe(`
        DELETE FROM public.master_orders WHERE order_number = $1;
      `, info.orderId);
    }

    // 1. Create in gmu schema Order table
    await prisma.order.create({
      data: {
        orderId: info.orderId,
        barcode: null,
        sellerId: seller.id,
        buyerId: buyer.id,
        productCount: info.productCount,
        totalQty: info.totalQty,
        totalWeight: info.totalWeight,
        mainStatus: info.mainStatus,
        returnType: info.returnType,
      }
    });

    // 2. Create in public schema master_orders
    const insertMo: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO public.master_orders (order_number, buyer_id, total_amount, payment_status, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'PENDING', 'CREATED', NOW(), NOW())
      RETURNING id;
    `, info.orderId, buyer.id, Number(product.price || 100.0) * info.totalQty);
    const masterOrderId = insertMo[0].id;

    // 3. Create in public schema master_order_items
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.master_order_items (master_order_id, product_id, seller_id, quantity, price)
      VALUES ($1, $2, $3, $4, $5);
    `, masterOrderId, product.id, seller.id, info.totalQty, Number(product.price || 100.0));

    // 4. Create in public schema pickup_orders
    const insertPo: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO public.pickup_orders (pickup_order_number, master_order_id, seller_id, status, created_at)
      VALUES ($1, $2, $3, 'PENDING', NOW())
      RETURNING id;
    `, `PKP-${info.orderId}`, masterOrderId, seller.id);
    const pickupOrderId = insertPo[0].id;

    // 5. Create in public schema pickup_order_items
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.pickup_order_items (pickup_order_id, product_id, quantity)
      VALUES ($1, $2, $3);
    `, pickupOrderId, product.id, info.totalQty);

    // 6. Create in public schema pickup_tracking
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.pickup_tracking (pickup_order_id, status, remarks, updated_at)
      VALUES ($1, 'ORDER_PLACED', 'Order Created', NOW());
    `, pickupOrderId);

    console.log(`Order ${info.orderId} seeded successfully!`);
  }

  console.log('Seeding completed.');
}

main()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
