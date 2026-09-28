'use client';
import { useEffect, useState } from 'react';
import { auth, firebaseEnabled } from '@/lib/firebase';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';

type Data={links:any[];payments:any[];keys:any[];events:any[]};
const tabs=[['Overview','⌂'],['Payment links','↗'],['Transactions','⇄'],['Developers','⌘'],['Webhooks','⌁'],['Settings','⚙']];

export default function Home(){
 const [data,setData]=useState<Data>({links:[],payments:[],keys:[],events:[]});
 const [tab,setTab]=useState('Overview'),[modal,setModal]=useState(false),[title,setTitle]=useState(''),[amount,setAmount]=useState(''),[desc,setDesc]=useState(''),[toast,setToast]=useState(''),[user,setUser]=useState<User|null>(null),[secret,setSecret]=useState('');
 function notify(s:string){setToast(s);setTimeout(()=>setToast(''),3200)}
 async function refresh(){try{const r=await fetch('/api/demo',{cache:'no-store'});const d=await r.json();if(r.ok)setData(d);else notify(d.error||'Could not load data')}catch{notify('Could not connect to NovaPay')} }
 useEffect(()=>{refresh();if(auth)return onAuthStateChanged(auth,setUser)},[]);
 async function action(body:any){const r=await fetch('/api/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok){notify(d.error||'Request failed');return null}await refresh();return d}
 async function create(){const d=await action({action:'createLink',title,amount,description:desc});if(d){setModal(false);setTitle('');setAmount('');setDesc('');notify('Payment link created')}}
 async function key(){const d=await action({action:'apiKey',label:'Test API key'});if(d){setSecret(d.secret);notify('Test key created — copy it now')}}
 const total=data.payments.filter(p=>p.status==='SUCCEEDED').reduce((s,p)=>s+p.amount,0);
 const succeeded=data.payments.filter(p=>p.status==='SUCCEEDED').length;
 const refunded=data.payments.filter(p=>p.status==='REFUNDED').length;
 const active=data.links.filter(l=>l.status==='ACTIVE').length;
 return <div className="shell">
  <aside className="sidebar"><div className="brand"><div className="logo">N</div><span className="brandname">NovaPay</span></div><div className="workspace"><span className="workspaceDot"/> Demo workspace <span className="chev">⌄</span></div>
   <nav className="nav">{tabs.map(([name,icon])=><button key={name} data-icon={icon} className={tab===name?'active':''} onClick={()=>setTab(name)}>{icon}<span className="navlabel">{name}</span></button>)}</nav>
   <div className="sidefoot"><span className="liveDot"/> Test mode<div>Every payment is simulated. No real money is processed.</div></div>
  </aside>
  <main className="main"><header className="topbar"><div className="crumb"><span className="mobileLogo">N</span>{tab}</div><div className="profile"><span className="modeBadge"><i/> Test mode</span><div className="avatar">{user?.displayName?.[0]?.toUpperCase()||'D'}</div><span className="profileName">{user?.displayName||'Demo workspace'}</span>{firebaseEnabled&&<button className="textBtn" onClick={()=>user?signOut(auth!):signInWithPopup(auth!,new GoogleAuthProvider())}>{user?'Sign out':'Sign in'}</button>}</div></header>
   <div className="content">
    {tab==='Overview'&&<Overview data={data} total={total} succeeded={succeeded} refunded={refunded} active={active} setTab={setTab} refresh={refresh} refund={async(id)=>{await action({action:'refund',paymentId:id});notify('Refund simulated')}}/>}
    {tab==='Payment links'&&<section className="panel pagePanel"><div className="panelhead"><div><h2>Payment links</h2><p className="panelSub">Create shareable checkout pages for test payments.</p></div><button className="btn primary" onClick={()=>setModal(true)}>＋ New link</button></div><Links links={data.links} notify={notify} action={action}/></section>}
    {tab==='Transactions'&&<section className="panel pagePanel"><div className="panelhead"><div><h2>Transactions</h2><p className="panelSub">Every simulated checkout in one place.</p></div><button className="btn" onClick={refresh}>↻ Refresh</button></div><Transactions payments={data.payments} refund={async(id)=>{await action({action:'refund',paymentId:id});notify('Refund simulated')}}/></section>}
    {tab==='Developers'&&<Developers data={data} secret={secret} keyAction={key} setSecret={setSecret} notify={notify} action={action}/>}
    {tab==='Webhooks'&&<Webhooks data={data} action={action} notify={notify}/>}
    {tab==='Settings'&&<Settings user={user} firebaseEnabled={firebaseEnabled}/>}
   </div>
  </main>
  {modal&&<div className="modalback" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modalIcon">↗</div><h2>Create payment link</h2><p className="panelSub">This creates a test-only checkout page.</p>
   <div className="field"><label>Payment title</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Website design"/></div>
   <div className="field"><label>Amount <span>INR</span></label><input type="number" min="1" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="499.00"/></div>
   <div className="field"><label>Description <em>optional</em></label><input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="A short description"/></div>
   <div className="actions end"><button className="btn" onClick={()=>setModal(false)}>Cancel</button><button className="btn primary" onClick={create} disabled={!title||!amount}>Create link</button></div>
  </div></div>}
  {toast&&<div className="toast">✓ {toast}</div>}
 </div>
}

function Overview({data,total,succeeded,refunded,active,setTab,refresh,refund}:{data:Data;total:number;succeeded:number;refunded:number;active:number;setTab:(s:string)=>void;refresh:()=>void;refund:(id:string)=>void}){
 return <><div className="heading"><div><div className="eyebrow">OVERVIEW</div><h1>Good evening <span>👋</span></h1><div className="sub">A quick look at your test payment activity.</div></div><button className="btn primary" onClick={()=>setTab('Payment links')}>＋ Create payment link</button></div>
  <div className="cards"><div className="card stat"><div className="statlabel">Successful volume <span>↗</span></div><div className="statvalue">₹{(total/100).toLocaleString('en-IN',{minimumFractionDigits:2})}</div><div className="positive">Test transactions only</div></div><div className="card stat"><div className="statlabel">Successful payments</div><div className="statvalue">{succeeded}</div><div className="muted small">Completed test checkouts</div></div><div className="card stat"><div className="statlabel">Active payment links</div><div className="statvalue">{active}</div><div className="muted small">Shareable checkout pages</div></div><div className="card miniStat"><span className="miniIcon">↩</span><div><b>{refunded}</b><small>Refunded payments</small></div></div></div>
  <section className="panel"><div className="panelhead"><div><h2>Recent transactions</h2><p className="panelSub">Latest test activity</p></div><button className="btn" onClick={()=>setTab('Transactions')}>View all</button></div><Transactions payments={data.payments.slice(0,6)} refund={refund}/></section>
  <section className="panel"><div className="panelhead"><div><h2>Payment links</h2><p className="panelSub">Your latest checkout pages</p></div><button className="btn" onClick={()=>setTab('Payment links')}>Manage links</button></div><Links links={data.links.slice(0,3)} notify={()=>{}} action={async()=>null}/></section></>
}
function Links({links,notify,action}:{links:any[];notify:(s:string)=>void;action:(b:any)=>Promise<any>}){
 return links.length===0?<div className="empty"><div className="emptyIcon">↗</div><b>No payment links yet</b><span>Create one to get your first test checkout.</span></div>:<>{links.map(l=><div key={l.id} className="linkrow"><div className="linkMain"><div className="linktitle">{l.title} <span className="pill">{l.status}</span></div><div className="linkurl">₹{(l.amount/100).toFixed(2)} · {l.payments?.length||0} payments · /pay/{l.id}</div></div><div className="actions"><button className="btn" onClick={()=>{navigator.clipboard?.writeText(window.location.origin+'/pay/'+l.id);notify('Payment link copied')}}>Copy</button><a className="btn" href={'/pay/'+l.id} target="_blank" rel="noreferrer">Preview</a>{l.status==='ACTIVE'&&<button className="btn dangerBtn" onClick={async()=>{await action({action:'deactivateLink',id:l.id});notify('Link disabled')}}>Disable</button>}</div></div>)}</>
}
function Transactions({payments,refund}:{payments:any[];refund:(id:string)=>void}){
 return payments.length===0?<div className="empty"><div className="emptyIcon">⇄</div><b>No transactions yet</b><span>Create a payment link and run a test checkout.</span></div>:<div className="tablewrap"><table><thead><tr><th>Payment</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td><b>{p.id.slice(-8).toUpperCase()}</b><div className="muted tiny">{p.link?.title||'Test event'}</div></td><td>{p.customerEmail}</td><td className="amount">₹{(p.amount/100).toFixed(2)}</td><td><span className={'pill '+(p.status==='FAILED'?'failed':p.status==='PENDING'?'pending':p.status==='REFUNDED'?'refunded':'')}>{p.status}</span></td><td>{new Date(p.createdAt).toLocaleDateString()}</td><td>{p.status==='SUCCEEDED'?<button className="btn" onClick={()=>refund(p.id)}>Refund</button>:''}</td></tr>)}</tbody></table></div>
}
function Developers({data,secret,keyAction,setSecret,notify,action}:{data:Data;secret:string;keyAction:()=>void;setSecret:(s:string)=>void;notify:(s:string)=>void;action:(b:any)=>Promise<any>}){
 const curl="curl -X POST https://nova-pay-sage.vercel.app/api/v1/payment-links \\\\\\n  -H \"Authorization: Bearer np_test_...\" \\\\\\n  -H \"Content-Type: application/json\" \\\\\\n  -d '{\"title\":\"Order #123\",\"amount\":499}'";
 return <><section className="panel pagePanel"><div className="panelhead"><div><h2>API keys</h2><p className="panelSub">Use test keys with the NovaPay API.</p></div><button className="btn primary" onClick={keyAction}>＋ Create test key</button></div>
  {secret&&<div className="secretBox"><div><b>New secret — shown once</b><span>{secret}</span></div><button className="btn" onClick={()=>{navigator.clipboard?.writeText(secret);notify('Secret copied');setSecret('')}}>Copy & hide</button></div>}
  {data.keys.length===0?<div className="empty">No API keys yet.</div>:data.keys.map(k=><div className="linkrow" key={k.id}><div><b>{k.label}</b><div className="linkurl">{k.prefix}•••••••• · {k.revoked?'Revoked':'Active'}</div></div>{!k.revoked&&<button className="btn dangerBtn" onClick={async()=>{await action({action:'revokeKey',id:k.id});notify('Key revoked')}}>Revoke</button>}</div>)}</section>
  <section className="panel pagePanel"><div className="panelhead"><div><h2>API quick start</h2><p className="panelSub">Create a payment link with your test key.</p></div></div><pre>{curl}</pre><div className="notice">Test API only. It cannot move real money.</div></section></>
}
function Webhooks({data,action,notify}:{data:Data;action:(b:any)=>Promise<any>;notify:(s:string)=>void}){
 return <section className="panel pagePanel"><div className="panelhead"><div><h2>Webhooks</h2><p className="panelSub">Inspect events generated by your test payments.</p></div><button className="btn primary" onClick={async()=>{await action({action:'simulateWebhook',type:'payment.test'});notify('Test event generated')}}>＋ Send test event</button></div><div className="notice">Events are recorded in NovaPay. External delivery is intentionally disabled in test mode.</div>{data.events.length===0?<div className="empty"><div className="emptyIcon">⌁</div><b>No webhook events</b><span>Complete a test checkout or send a test event.</span></div>:data.events.map(e=><details className="event" key={e.id}><summary><div><b>{e.type}</b><span>{new Date(e.createdAt).toLocaleString()} · {e.delivered?'Recorded':'Pending'}</span></div><code>{e.id.slice(-10)}</code></summary><pre>{JSON.stringify(e.payload,null,2)}</pre></details>)}</section>
}
function Settings({user,firebaseEnabled}:{user:User|null;firebaseEnabled:boolean}){
 return <section className="panel pagePanel settings"><div className="eyebrow">WORKSPACE</div><h2>Settings</h2><p className="panelSub">Basic workspace information for the NovaPay test environment.</p><div className="setting"><span>Environment</span><b><i/> Test mode</b></div><div className="setting"><span>Authentication</span><b>{firebaseEnabled?(user?'Signed in as '+(user.email||user.displayName||'user'):'Firebase enabled'):'Demo mode'}</b></div><div className="setting"><span>Currency</span><b>INR (₹)</b></div><div className="setting"><span>Payments</span><b>Simulation only</b></div><div className="notice">NovaPay is currently a development platform. No customer card data or real funds are processed.</div></section>
}