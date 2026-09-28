import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId } from '@/lib/razorpay';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(req:Request){
  try{
    if(!razorpayConfigured)return NextResponse.json({error:'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel.'},{status:503});
    const b=await req.json();
    const linkId=String(b.linkId||'');
    const email=String(b.email||'guest@novapay.test').trim().slice(0,200)||'guest@novapay.test';
    const link=await prisma.paymentLink.findUnique({where:{id:linkId}});
    if(!link||link.status!=='ACTIVE')return NextResponse.json({error:'Payment link unavailable'},{status:404});
    const payment=await prisma.payment.create({data:{linkId:link.id,amount:link.amount,currency:link.currency,status:'PENDING',customerEmail:email}});
    try{
      const order=await createRazorpayOrder({amount:link.amount,currency:link.currency,receipt:payment.id.slice(0,40),notes:{novapayPaymentId:payment.id,novapayLinkId:link.id}});
      const saved=await prisma.payment.update({where:{id:payment.id},data:{providerOrderId:order.id}});
      return NextResponse.json({orderId:order.id,paymentId:saved.id,amount:order.amount,currency:order.currency,keyId:razorpayKeyId(),title:link.title});
    }catch(error){
      await prisma.payment.delete({where:{id:payment.id}}).catch(()=>{});
      throw error;
    }
  }catch(error){
    console.error(error);
    return NextResponse.json({error:error instanceof Error?error.message:'Could not create payment order.'},{status:500});
  }
}
