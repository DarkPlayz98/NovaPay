import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes, createHash } from 'crypto';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(){
 try{
  const [links,payments,keys,events]=await Promise.all([
   prisma.paymentLink.findMany({include:{payments:true},orderBy:{createdAt:'desc'}}),
   prisma.payment.findMany({include:{link:true},orderBy:{createdAt:'desc'},take:50}),
   prisma.apiKey.findMany({orderBy:{createdAt:'desc'}}),
   prisma.webhookEvent.findMany({orderBy:{createdAt:'desc'},take:20})
  ]);
  return NextResponse.json({links,payments,keys:keys.map(k=>({...k,secretHash:undefined})),events});
 }catch(e){console.error(e);return NextResponse.json({error:'Database unavailable. Configure DATABASE_URL and run prisma db push.'},{status:503})}
}
export async function POST(req:Request){
 try{
  const b=await req.json();
  if(b.action==='createLink'){const title=String(b.title||'').trim();const amount=Math.round(Number(b.amount)*100);if(!title||!Number.isInteger(amount)||amount<100||amount>100000000)return NextResponse.json({error:'Enter a title and amount between ₹1 and ₹1,000,000.'},{status:400});const link=await prisma.paymentLink.create({data:{title,description:String(b.description||'').trim(),amount}});return NextResponse.json({link})}
  if(b.action==='deactivateLink'){const link=await prisma.paymentLink.update({where:{id:String(b.id||'')},data:{status:'INACTIVE'}});return NextResponse.json({link})}
  if(b.action==='checkout'){const link=await prisma.paymentLink.findUnique({where:{id:String(b.linkId)}});if(!link||link.status!=='ACTIVE')return NextResponse.json({error:'Payment link unavailable'},{status:404});const outcome=String(b.outcome||'success');const status=outcome==='fail'?'FAILED':outcome==='pending'?'PENDING':'SUCCEEDED';const payment=await prisma.payment.create({data:{linkId:link.id,amount:link.amount,status,customerEmail:String(b.email||'guest@novapay.test').trim()}});await prisma.webhookEvent.create({data:{paymentId:payment.id,type:'payment.'+status.toLowerCase(),payload:{paymentId:payment.id,status,amount:payment.amount,currency:payment.currency},delivered:true}});return NextResponse.json({payment})}
  if(b.action==='refund'){const p=await prisma.payment.findUnique({where:{id:String(b.paymentId)}});if(!p||p.status!=='SUCCEEDED')return NextResponse.json({error:'Only successful payments can be refunded.'},{status:400});const payment=await prisma.payment.update({where:{id:p.id},data:{status:'REFUNDED',refundedAt:new Date()}});await prisma.webhookEvent.create({data:{paymentId:p.id,type:'payment.refunded',payload:{paymentId:p.id,status:'REFUNDED',amount:p.amount},delivered:true}});return NextResponse.json({payment})}
  if(b.action==='apiKey'){const secret='np_test_'+randomBytes(24).toString('hex');const key=await prisma.apiKey.create({data:{label:String(b.label||'Development key'),prefix:secret.slice(0,14),secretHash:createHash('sha256').update(secret).digest('hex')}});return NextResponse.json({key:{id:key.id,label:key.label,prefix:key.prefix},secret})}
  if(b.action==='revokeKey'){await prisma.apiKey.update({where:{id:String(b.id)},data:{revoked:true}});return NextResponse.json({ok:true})}
  if(b.action==='simulateWebhook'){const event=await prisma.webhookEvent.create({data:{type:String(b.type||'payment.test'),payload:{test:true,message:'Simulated webhook event',createdAt:new Date().toISOString()},delivered:true}});return NextResponse.json({event})}
  return NextResponse.json({error:'Unknown action'},{status:400});
 }catch(e){console.error(e);return NextResponse.json({error:'Request failed. Check database configuration.'},{status:500})}
}