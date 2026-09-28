import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

export const runtime='nodejs';
export const dynamic='force-dynamic';

async function authorized(req:Request){
 const header=req.headers.get('authorization')||'';
 if(!header.startsWith('Bearer '))return false;
 const secret=header.slice(7).trim();
 if(!secret.startsWith('np_test_'))return false;
 const hash=createHash('sha256').update(secret).digest('hex');
 const key=await prisma.apiKey.findFirst({where:{secretHash:hash,revoked:false}});
 return !!key;
}
export async function GET(req:Request){
 try{
  if(!(await authorized(req)))return NextResponse.json({error:'Invalid or revoked test API key.'},{status:401});
  const links=await prisma.paymentLink.findMany({orderBy:{createdAt:'desc'},take:50});
  return NextResponse.json({data:links.map(l=>({id:l.id,title:l.title,description:l.description,amount:l.amount,currency:l.currency,status:l.status,createdAt:l.createdAt}))});
 }catch(e){console.error(e);return NextResponse.json({error:'API unavailable.'},{status:500})}
}
export async function POST(req:Request){
 try{
  if(!(await authorized(req)))return NextResponse.json({error:'Invalid or revoked test API key.'},{status:401});
  const body=await req.json();const title=String(body.title||'').trim();const amount=Math.round(Number(body.amount)*100);
  if(!title||!Number.isInteger(amount)||amount<100||amount>100000000)return NextResponse.json({error:'title is required and amount must be between ₹1 and ₹1,000,000.'},{status:400});
  const link=await prisma.paymentLink.create({data:{title,description:String(body.description||'').trim(),amount}});
  return NextResponse.json({data:{id:link.id,title:link.title,description:link.description,amount:link.amount,currency:link.currency,status:link.status,checkoutUrl:'/pay/'+link.id}}, {status:201});
 }catch(e){console.error(e);return NextResponse.json({error:'API request failed.'},{status:500})}
}