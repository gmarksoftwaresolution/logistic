const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.user.create({
      data: {
        phoneNumber: '9876543210',
        language: 'English',
        role: 'TRANSPORTER',
        applicationStatus: 'PENDING',
      },
    });
    console.log('User created:', res);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
