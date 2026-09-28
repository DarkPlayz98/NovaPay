import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchRazorpayPayment, razorpayConfigured, verifyPaymentSignature } from '@/lib/razorpay';

export const runtime='nodejs';

export async function POST(req:Request){
  try{
    if(!razorpayConfigured)return NextResponse.json({error:'Razorpay is not configured.'},{status:503});
    const b=await req.json();
    const orderId=String(b.razorpay_order_id||'');
    const paymentId=String(b.razorpay_payment_id||'');
    const signature=String(b.razorpay_signature||'');
    if(!orderId||!paymentId||!signature)return NextResponse.json({error:'Incomplete Razorpay response.'},{status:400});
    const local=await prisma.payment.findUnique({where:{providerOrderId:orderId}});
    if(!local)return NextResponse.json({error:'Payment order not found.'},{status:404});
    if(local.status==='SUCCEEDED'&&local.providerPaymentId===paymentId)return NextResponse.json({ok:true,payment:local});
    if(!verifyPaymentSignature(orderId,paymentId,signature))return NextResponse.json({error:'Payment signature verification failed.'},{status:400});
    const remote=await fetchRazorpayPayment(paymentId);
    if(remote.order_id!==orderId||Number(remote.amount)!==local.amount||remote.currency!==local.currency)return NextResponse.json({error:'Payment details do not match the NovaPay order.'},{status:400});
    if(remote.status!=='captured')return NextResponse.json({error:'Payment is not captured yet.',status:remote.status},{status:409});
    const payment=await prisma.payment.update({where:{id:local.id},data:{providerPaymentId:paymentId,providerSignature:signature,status:'SUCCEEDED',paidAt:new Date()}});
    await prisma.webhookEvent.create({data:{paymentId:payment.id,type:'payment.captured',payload:{id:paymentId,order_id:orderId,amount:remote.amount,currency:remote.currency,status:remote.status},delivered:true}});
    return NextResponse.json({ok:true,payment});
  }catch(error){
    console.error(error);
    return NextResponse.json({error:error instanceof Error?error.message:'Payment verification failed.'},{status:500});
  }
}
