process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/logistic_db?schema=public";

import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = "transporter-backend-super-secret-key-change-me";

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { id: 66 },
    });

    if (!user) {
      console.error('Transporter 66 not found in DB!');
      return;
    }

    console.log('Found transporter user:', { id: user.id, role: user.role, status: user.applicationStatus });

    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.applicationStatus,
      ...(user.uniqueCode ? { transporterUniqueId: user.uniqueCode } : {})
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    console.log('Generated JWT token successfully.');

    const url = 'http://localhost:3001/api/orders/drop/21/complete';
    console.log(`Sending POST request to: ${url}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Response Status:', res.status);
    const bodyText = await res.text();
    console.log('Response Body:', bodyText);

  } catch (err: any) {
    console.error('Script error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
