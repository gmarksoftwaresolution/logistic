"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = require("fs");
const path = require("path");
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
            }
            else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
            }
            process.env[key] = value.trim();
        }
    });
}
if (process.env.DIRECT_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
}
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Querying database for ORD-PICK-1017 status details...');
    const masterOrder = await prisma.masterOrder.findFirst({
        where: { orderNumber: 'ORD-PICK-1017' },
        include: {
            pickupOrders: true
        }
    });
    if (masterOrder) {
        console.log('MasterOrder status:', masterOrder.status);
        console.log('PickupOrders:', masterOrder.pickupOrders.map(p => ({ id: p.id, status: p.status, transporterId: p.transporterId })));
        const gmuOrder = await prisma.order.findFirst({
            where: { orderId: 'ORD-PICK-1017' }
        });
        if (gmuOrder) {
            console.log('GMU Order details:');
            console.log('  mainStatus:', gmuOrder.mainStatus);
            console.log('  pickupShgStatus:', gmuOrder.pickupShgStatus);
            console.log('  pickupTransporterStatus:', gmuOrder.pickupTransporterStatus);
            console.log('  pickupTransporterId:', gmuOrder.pickupTransporterId);
        }
        else {
            console.log('GMU Order not found.');
        }
    }
    else {
        console.log('Order ORD-PICK-1017 not found.');
    }
}
main()
    .catch(e => console.error(e))
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=check_order_status.js.map