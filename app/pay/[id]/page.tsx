import { prisma } from '@/lib/prisma';
import Checkout from './ui';
export default async function PayPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const link=await prisma.paymentLink.findUnique({where:{id}});if(!link)return <main style={{padding:40,fontFamily:'sans-serif'}}>Payment link not found.</main>;return <Checkout link={{id:link.id,title:link.title,description:link.description,amount:link.amount,currency:link.currency,status:link.status}}/>}
