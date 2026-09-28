'use client';

import Script from 'next/script';
import {useState} from 'react';

declare global {
  interface Window {
    Razorpay?: new (config:any)=>{open:()=>void;on:(event:string,handler:(response:any)=>void)=>void};
  }
}

export default function Checkout({link}:{link:{id:string;title:string;description:string;amount:number;currency:string;status:string}}){
  const [email,setEmail]=useState('');
  const [state,setState]=useState('');
  const [busy,setBusy]=useState(false);
  const [mode,setMode]=useState('');

  async function pay(){
    if(busy||link.status!=='ACTIVE')return;
    setBusy(true);setState('');
    try{
      const r=await fetch('/api/razorpay/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({linkId:link.id,email})});
      const order=await r.json();
      if(!r.ok)throw new Error(order.error||'Could not create payment order');
      setMode(order.keyId?.startsWith('rzp_test_')?'Test Mode':'Live Mode');
      if(!window.Razorpay)throw new Error('Secure checkout failed to load. Refresh and try again.');
      const checkout=new window.Razorpay({
        key:order.keyId,
        amount:order.amount,
        currency:order.currency,
        name:'NovaPay',
        description:order.title,
        order_id:order.orderId,
        prefill:{email},
        theme:{color:'#635bff'},
        modal:{ondismiss:()=>setBusy(false)},
        handler:async(response:any)=>{
          try{
            const vr=await fetch('/api/razorpay/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(response)});
            const vd=await vr.json();
            if(!vr.ok)throw new Error(vd.error||'Payment verification failed');
            setState('SUCCESS');
          }catch(error){setState(error instanceof Error?error.message:'Payment verification failed')}
          finally{setBusy(false)}
        }
      });
      checkout.on('payment.failed',(response:any)=>{
        setState(response?.error?.description||'Payment failed. You were not charged successfully.');
        setBusy(false);
      });
      checkout.open();
    }catch(error){setState(error instanceof Error?error.message:'Could not start payment');setBusy(false)}
  }

  return <main className="checkoutPage">
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive"/>
    <section className="checkoutCard">
      <div className="checkoutBrand"><span className="checkoutLogo">N</span><b>NovaPay</b><small>{mode||'SECURE CHECKOUT'}</small></div>
      <div className="merchant">Payment to demo merchant</div>
      <h1>{link.title}</h1>
      {link.description&&<p className="checkoutDesc">{link.description}</p>}
      <div className="checkoutAmount">₹{(link.amount/100).toLocaleString('en-IN',{minimumFractionDigits:2})}</div>
      {state==='SUCCESS'?<div className="result successResult"><div className="resultMark">✓</div><b>Payment successful</b><p>Your payment was securely verified by NovaPay.</p><div className="secure">Razorpay payment verified · NovaPay does not store card numbers or CVV.</div></div>:<>
        <div className="checkoutLabel">Customer email <span>optional</span></div>
        <input className="checkoutInput" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" type="email"/>
        {state&&<div className="payError">{state}</div>}
        <button disabled={busy||link.status!=='ACTIVE'} onClick={pay} className="checkoutPrimary">{busy?'Opening secure checkout…':'Pay securely'}</button>
        <div className="providerNote">Secure payment collection is handled by Razorpay. NovaPay receives the verified payment result.</div>
      </>}
      <div className="secure">🔒 {mode||'Secure'} · Amount: ₹{(link.amount/100).toFixed(2)}</div>
    </section>
  </main>
}
