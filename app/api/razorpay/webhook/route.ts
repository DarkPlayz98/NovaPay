import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/razorpay';

export const runtime='nodejs';

export async function POST(req:Request){
  const raw=await req.text();
  const signature=req.headers.get('x-razorpay-signature')||'';
  if(!verifyWebhookSignature(raw,signature))return NextResponse.json({error:'Invalid webhook signature'},{status:400});
  try{
    const body=JSON.parse(raw);
    const eventType=String(body.event||'unknown');
    const paymentEntity=body?.payload?.payment?.entity;
    const orderId=paymentEntity?.order_id?String(paymentEntity.order_id):'';
    const providerPaymentId=paymentEntity?.id?String(paymentEntity.id):'';
    let paymentId:string|undefined;
    if(orderId){
      const local=await prisma.payment.findUnique({where:{providerOrderId:orderId}});
      paymentId=local?.id;
      if(local&&['payment.authorized','payment.captured'].includes(eventType)){
        await prisma.payment.update({where:{id:local.id},data:{providerPaymentId:providerPaymentId||local.providerPaymentId,status:eventType==='payment.captured'?'SUCCEEDED':local.status==='SUCCEEDED'?'SUCCEEDED':'PENDING',paidAt:eventType==='payment.captured'?new Date():local.paidAt}});
      }
    }
    await prisma.webhookEvent.create({data:{paymentId,type:eventType,payload:body,delivered:true}});
    return NextResponse.json({ok:true});
  }catch(error){
    console.error(error);
    return NextResponse.json({error:'Webhook processing failed.'},{status:500});
  }
}
