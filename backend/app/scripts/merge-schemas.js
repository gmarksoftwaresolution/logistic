const fs = require('fs');
const path = require('path');

const dbSchemaPath = path.join(__dirname, '../packages/db/prisma/schema.prisma');
const shgSchemaPath = path.join(__dirname, '../backend/shg/prisma/schema.prisma');
const gmuSchemaPath = path.join(__dirname, '../backend/gmu/prisma/schema.prisma');

function parseSchema(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const blocks = [];
  const lines = content.split(/\r?\n/);
  
  let currentBlock = null;
  let header = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('generator ') || line.startsWith('datasource ')) {
      header += line + '\n';
      // skip generator/datasource blocks parsing, keep it as header
      while (i < lines.length && !lines[i].trim().endsWith('}')) {
        i++;
        header += lines[i] + '\n';
      }
      header += '\n';
      continue;
    }
    
    if (line.startsWith('model ') || line.startsWith('enum ')) {
      const match = line.match(/^(model|enum)\s+(\w+)/);
      if (match) {
        currentBlock = {
          type: match[1],
          name: match[2],
          lines: [line]
        };
        continue;
      }
    }
    
    if (currentBlock) {
      currentBlock.lines.push(line);
      if (line.trim() === '}') {
        blocks.push(currentBlock);
        currentBlock = null;
      }
    }
  }
  
  return { header, blocks };
}

function merge() {
  console.log('Parsing schemas...');
  const db = parseSchema(dbSchemaPath);
  const shg = parseSchema(shgSchemaPath);
  const gmu = parseSchema(gmuSchemaPath);

  // Map of blocks in db (our base)
  const mergedBlocks = new Map();
  db.blocks.forEach(b => mergedBlocks.set(b.name, b));

  // Add missing blocks from shg
  shg.blocks.forEach(b => {
    if (!mergedBlocks.has(b.name)) {
      console.log(`Adding missing block from SHG: ${b.name}`);
      mergedBlocks.set(b.name, b);
    }
  });

  // Add missing blocks from gmu
  gmu.blocks.forEach(b => {
    if (!mergedBlocks.has(b.name)) {
      console.log(`Adding missing block from GMU: ${b.name}`);
      mergedBlocks.set(b.name, b);
    }
  });

  // Manual relation additions for base models that need to link to added models
  // 1. User model updates
  const userBlock = mergedBlocks.get('User');
  if (userBlock) {
    const fieldsToAdd = [
      '  shgReturnOrders           ReturnOrder[]               @relation("ShgReturnOrders")',
      '  transporterReturnOrders   ReturnOrder[]               @relation("TransporterReturnOrders")',
      '  return_order_assignments  return_order_assignments[]',
      '  return_order_scan_history return_order_scan_history[]',
      '  shgPickupOrders           PickupOrder[]               @relation("ShgPickupOrders")',
      '  transporterPickups        PickupOrder[]               @relation("TransporterPickupOrders")',
      '  shgDropOrders             DropOrder[]                 @relation("ShgDropOrders")',
      '  transporterDrops          DropOrder[]                 @relation("TransporterDropOrders")',
    ];
    // check if they are already in userBlock
    fieldsToAdd.forEach(field => {
      const fieldName = field.trim().split(/\s+/)[0];
      const exists = userBlock.lines.some(l => l.trim().startsWith(fieldName));
      if (!exists) {
        console.log(`Adding field '${fieldName}' to User model`);
        // Insert before the closing brace
        userBlock.lines.splice(userBlock.lines.length - 1, 0, field);
      }
    });
  }

  // 2. DropOrder model updates
  const dropOrderBlock = mergedBlocks.get('DropOrder');
  if (dropOrderBlock) {
    const fieldsToAdd = [
      '  returnOrders    ReturnOrder[]'
    ];
    fieldsToAdd.forEach(field => {
      const fieldName = field.trim().split(/\s+/)[0];
      const exists = dropOrderBlock.lines.some(l => l.trim().startsWith(fieldName));
      if (!exists) {
        console.log(`Adding field '${fieldName}' to DropOrder model`);
        dropOrderBlock.lines.splice(dropOrderBlock.lines.length - 1, 0, field);
      }
    });
  }

  // 3. Buyer model updates
  const buyerBlock = mergedBlocks.get('Buyer');
  if (buyerBlock) {
    const fieldsToAdd = [
      '  returnOrders ReturnOrder[]',
      '  masterOrders MasterOrder[] @relation("BuyerOrders")',
      '  dropOrders   DropOrder[]'
    ];
    fieldsToAdd.forEach(field => {
      const fieldName = field.trim().split(/\s+/)[0];
      const exists = buyerBlock.lines.some(l => l.trim().startsWith(fieldName));
      if (!exists) {
        console.log(`Adding field '${fieldName}' to Buyer model`);
        buyerBlock.lines.splice(buyerBlock.lines.length - 1, 0, field);
      }
    });
  }

  // 4. Product model updates
  const productBlock = mergedBlocks.get('Product');
  if (productBlock) {
    const fieldsToAdd = [
      '  returnOrderItems   ReturnOrderItem[]',
      '  masterOrderItems   MasterOrderItem[]',
      '  pickupOrderItems   PickupOrderItem[]',
      '  dropOrderItems     DropOrderItem[]'
    ];
    fieldsToAdd.forEach(field => {
      const fieldName = field.trim().split(/\s+/)[0];
      const exists = productBlock.lines.some(l => l.trim().startsWith(fieldName));
      if (!exists) {
        console.log(`Adding field '${fieldName}' to Product model`);
        productBlock.lines.splice(productBlock.lines.length - 1, 0, field);
      }
    });
  }

  // 5. Seller model updates
  const sellerBlock = mergedBlocks.get('Seller');
  if (sellerBlock) {
    const fieldsToAdd = [
      '  masterOrderItems  MasterOrderItem[]',
      '  pickupOrders      PickupOrder[]'
    ];
    fieldsToAdd.forEach(field => {
      const fieldName = field.trim().split(/\s+/)[0];
      const exists = sellerBlock.lines.some(l => l.trim().startsWith(fieldName));
      if (!exists) {
        console.log(`Adding field '${fieldName}' to Seller model`);
        sellerBlock.lines.splice(sellerBlock.lines.length - 1, 0, field);
      }
    });
  }

  // Re-serialize the master schema content
  let outputContent = db.header;
  mergedBlocks.forEach(b => {
    outputContent += b.lines.join('\n') + '\n\n';
  });

  // Write master schema back to packages/db
  fs.writeFileSync(dbSchemaPath, outputContent, 'utf8');
  console.log(`Master schema written to: ${dbSchemaPath}`);

  // Copy master schema to other workspaces
  fs.writeFileSync(shgSchemaPath, outputContent, 'utf8');
  console.log(`Copied schema to: ${shgSchemaPath}`);

  fs.writeFileSync(gmuSchemaPath, outputContent, 'utf8');
  console.log(`Copied schema to: ${gmuSchemaPath}`);

  // Let's also copy to transporter schema
  const transporterSchemaPath = path.join(__dirname, '../backend/transporter/prisma/schema.prisma');
  fs.writeFileSync(transporterSchemaPath, outputContent, 'utf8');
  console.log(`Copied schema to: ${transporterSchemaPath}`);
}

merge();
