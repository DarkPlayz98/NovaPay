import {PrismaClient} from '@prisma/client';
const prisma=new PrismaClient();
async function main(){await prisma.paymentLink.create({data:{title:'Sample design consultation',description:'A demo payment link to explore NovaPay.',amount:49900}});console.log('Seeded one sample payment link.');}
main().finally(()=>prisma.$disconnect());
