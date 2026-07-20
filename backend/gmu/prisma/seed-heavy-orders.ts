import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables manually from the root .env
const dotenvPath = path.join(__dirname, '../../../.env');
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
  console.log('Seeding 3 heavy orders (40 kg, 135 kg, 480 kg)...');

  // 1. Find Seller (Gadhinglaj) and Buyer (Mahagaon)
  const seller = await prisma.seller.findFirst({
    where: { village: { equals: 'Gadhinglaj', mode: 'insensitive' } }
  });

  const buyer = await prisma.buyer.findFirst({
    where: { village: { equals: 'Mahagaon', mode: 'insensitive' } }
  });

  if (!seller) {
    throw new Error('Seller in Gadhinglaj not found');
  }
  if (!buyer) {
    throw new Error('Buyer in Mahagaon not found');
  }

  console.log(`Using Seller: ${seller.sellerName} (ID: ${seller.id}, Village: ${seller.village})`);
  console.log(`Using Buyer: ${buyer.buyerName} (ID: ${buyer.id}, Village: ${buyer.village})`);

  // 2. Find a Product owned by the Seller
  // Product owned by seller 1 (Gadhinglaj)
  const products = await prisma.$queryRawUnsafe(`
    SELECT id, price, name, weight FROM public.products WHERE seller_id = $1 LIMIT 1;
  `, seller.id) as any[];

  if (products.length === 0) {
    throw new Error(`No products found for seller ID ${seller.id}`);
  }
  const product = products[0];
  console.log(`Using Product: ${product.name} (ID: ${product.id}, Price: ${product.price})`);

  // Target weights
  const weights = [40.0, 135.0, 480.0];

  for (let i = 0; i < weights.length; i++) {
    const targetWeight = weights[i];
    const orderNo = `ORD-PICK-HEAVY-${i + 1}`;

    console.log(`Creating order ${orderNo} with weight ${targetWeight} kg...`);

    // 1. Create in gmu schema Order table
    const createdGmuOrder = await prisma.order.create({
      data: {
        orderId: orderNo,
        barcode: null,
        sellerId: seller.id,
        buyerId: buyer.id,
        productCount: 1,
        totalQty: 1,
        totalWeight: targetWeight,
        pickupShgId: null,
        pickupTransporterId: null,
        mainStatus: 'ORDER_PLACED',
        pickupShgStatus: null,
        pickupTransporterStatus: null,
      }
    });

    // 2. Create in public schema master_orders
    const insertMo: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO public.master_orders (order_number, buyer_id, total_amount, payment_status, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'PENDING', 'CREATED', NOW(), NOW())
      RETURNING id;
    `, orderNo, buyer.id, Number(product.price || 100.0));
    const masterOrderId = insertMo[0].id;

    // 3. Create in public schema master_order_items
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.master_order_items (master_order_id, product_id, seller_id, quantity, price)
      VALUES ($1, $2, $3, 1, $4);
    `, masterOrderId, product.id, seller.id, Number(product.price || 100.0));

    // 4. Create in public schema pickup_orders
    const insertPo: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO public.pickup_orders (pickup_order_number, master_order_id, seller_id, status, created_at)
      VALUES ($1, $2, $3, 'PENDING', NOW())
      RETURNING id;
    `, `PKP-${orderNo}`, masterOrderId, seller.id);
    const pickupOrderId = insertPo[0].id;

    // 5. Create in public schema pickup_order_items
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.pickup_order_items (pickup_order_id, product_id, quantity)
      VALUES ($1, $2, 1);
    `, pickupOrderId, product.id);

    // 6. Create in public schema pickup_tracking
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.pickup_tracking (pickup_order_id, status, remarks, updated_at)
      VALUES ($1, 'ORDER_PLACED', 'Order Created', NOW());
    `, pickupOrderId);

    console.log(`Order ${orderNo} created successfully!`);
  }

  console.log('Heavy orders seeding completed.');
}

main()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
