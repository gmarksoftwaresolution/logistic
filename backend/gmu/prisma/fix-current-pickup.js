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
    console.log('Fixing status for ORD-PICK-1020 in the database...');
    const masterOrder = await prisma.masterOrder.findFirst({
        where: { orderNumber: 'ORD-PICK-1020' }
    });
    if (masterOrder) {
        await prisma.pickupOrder.updateMany({
            where: { masterOrderId: masterOrder.id },
            data: { status: 'COMPLETED' }
        });
        console.log('Updated pickupOrder status to COMPLETED.');
        const gmuOrder = await prisma.order.findFirst({
            where: { orderId: 'ORD-PICK-1020' }
        });
        if (gmuOrder) {
            await prisma.orderAssignment.updateMany({
                where: { orderId: gmuOrder.id, role: 'PICKUP' },
                data: { status: 'COMPLETED' }
            });
            console.log('Updated orderAssignment status to COMPLETED.');
        }
    }
    else {
        console.log('Order ORD-PICK-1020 not found in database.');
    }
}
main()
    .catch(e => console.error(e))
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=fix-current-pickup.js.map