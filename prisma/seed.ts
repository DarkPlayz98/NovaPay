import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.paymentLink.create({
    data: {
      title: 'NovaPay onboarding payment',
      description: 'A payment link for NovaPay development setup.',
      amount: 49900
    }
  });

  console.log('Seeded one NovaPay payment link.');
}

main().finally(() => prisma.$disconnect());
