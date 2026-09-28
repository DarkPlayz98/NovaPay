import { createHmac, timingSafeEqual } from 'crypto';

const keyId=process.env.RAZORPAY_KEY_ID;
const keySecret=process.env.RAZORPAY_KEY_SECRET;
export const razorpayConfigured=Boolean(keyId&&keySecret);

function authHeader(){
  if(!keyId||!keySecret)throw new Error('Razorpay is not configured');
  return 'Basic '+Buffer.from(keyId+':'+keySecret).toString('base64');
}
async function razorpayFetch(path:string,init:RequestInit={}){
  const response=await fetch('https://api.razorpay.com/v1'+path,{
    ...init,
    headers:{'Content-Type':'application/json',Authorization:authHeader(),...(init.headers||{})},
    cache:'no-store'
  });
  const body=await response.text();
  let data:any={};
  try{data=body?JSON.parse(body):{}}catch{data={error:{description:body||'Razorpay request failed'}}}
  if(!response.ok)throw new Error(data?.error?.description||data?.error?.reason||'Razorpay request failed');
  return data;
}
export async function createRazorpayOrder(args:{amount:number;currency:string;receipt:string;notes?:Record<string,string>}){
  return razorpayFetch('/orders',{method:'POST',body:JSON.stringify({amount:args.amount,currency:args.currency,receipt:args.receipt,notes:args.notes||{},partial_payment:false})});
}
export async function fetchRazorpayPayment(paymentId:string){
  return razorpayFetch('/payments/'+encodeURIComponent(paymentId),{method:'GET'});
}
export async function refundRazorpayPayment(paymentId:string,amount:number){
  return razorpayFetch('/payments/'+encodeURIComponent(paymentId)+'/refund',{method:'POST',body:JSON.stringify({amount})});
}
function safeEqual(expected:string,actual:string){
  const a=Buffer.from(expected,'utf8'),b=Buffer.from(actual,'utf8');
  return a.length===b.length&&timingSafeEqual(a,b);
}
export function verifyPaymentSignature(orderId:string,paymentId:string,signature:string){
  if(!keySecret||!signature)return false;
  return safeEqual(createHmac('sha256',keySecret).update(orderId+'|'+paymentId).digest('hex'),signature);
}
export function verifyWebhookSignature(rawBody:string,signature:string){
  const secret=process.env.RAZORPAY_WEBHOOK_SECRET;
  if(!secret||!signature)return false;
  return safeEqual(createHmac('sha256',secret).update(rawBody).digest('hex'),signature);
}
export function razorpayKeyId(){return keyId||''}
