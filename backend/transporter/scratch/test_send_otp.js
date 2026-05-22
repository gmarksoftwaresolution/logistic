const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

async function main() {
  try {
    // Clean up existing user if any
    await prisma.user.deleteMany({ where: { phoneNumber: '9999999999' } }).catch(() => {});
    
    // Create new transporter user simulating the sendOtp flow
    const res = await prisma.user.create({
      data: {
        phoneNumber: '9999999999',
        language: 'English',
        role: 'TRANSPORTER',
        applicationStatus: 'PENDING',
        authId: randomUUID(),
      },
    });
    console.log('Simulated User Creation Success:', res);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
