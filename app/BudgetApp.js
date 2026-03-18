"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const AIRTABLE_TOKEN = process.env.NEXT_PUBLIC_AIRTABLE_TOKEN;
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const API = `https://api.airtable.com/v0/${BASE_ID}`;
const HEADERS = { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" };
const AUTHORIZED_EMAILS = ["tchamfong@gmail.com", "ophelie.linde@gmail.com"];
const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const MOIS_FULL = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const CAT_COLORS = {"LOGEMENT":"#1e40af","MAISON":"#6d28d9","VOITURE & TRANSPORT":"#c2410c","ABONNEMENTS":"#0e7490","SPORT & SANTÉ":"#15803d","ENFANTS":"#be185d","DEPENSES EXEPTIONNELLES":"#b91c1c","LOISIRS":"#a16207","ALIMENTAIRE":"#4d7c0f"};
const CHART_COLORS = ["#1e40af","#6d28d9","#c2410c","#0e7490","#15803d","#be185d","#b91c1c","#a16207","#4d7c0f"];
const fmt = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);

// === BARÈME IR 2026 (revenus 2025) ===
const IR_TRANCHES = [{min:0,max:11600,taux:0},{min:11600,max:29579,taux:0.11},{min:29579,max:84577,taux:0.30},{min:84577,max:181917,taux:0.41},{min:181917,max:Infinity,taux:0.45}];
const PLAFOND_QF = 1807; // par demi-part
const DECOTE_SOLO = 897;
const DECOTE_COUPLE = 1483;
const DECOTE_TAUX = 0.4525;

function calculerIR(revenuImposable, nbParts, isCouple=true) {
  const qf = revenuImposable / nbParts;
  let impotParPart = 0;
  for (const t of IR_TRANCHES) {
    if (qf <= t.min) break;
    impotParPart += (Math.min(qf, t.max) - t.min) * t.taux;
  }
  let impotBrut = impotParPart * nbParts;
  // Plafonnement quotient familial
  const partsBase = isCouple ? 2 : 1;
  const demiPartsSupp = (nbParts - partsBase) * 2; // nb demi-parts
  if (demiPartsSupp > 0) {
    const qfBase = revenuImposable / partsBase;
    let impotBase = 0;
    for (const t of IR_TRANCHES) { if (qfBase <= t.min) break; impotBase += (Math.min(qfBase, t.max) - t.min) * t.taux; }
    impotBase *= partsBase;
    const avantage = impotBase - impotBrut;
    const plafond = demiPartsSupp * PLAFOND_QF;
    if (avantage > plafond) impotBrut = impotBase - plafond;
  }
  // Décote
  const seuilDecote = isCouple ? 3277 : 1982;
  if (impotBrut > 0 && impotBrut < seuilDecote) {
    const forfait = isCouple ? DECOTE_COUPLE : DECOTE_SOLO;
    const decote = forfait - (impotBrut * DECOTE_TAUX);
    if (decote > 0) impotBrut = Math.max(0, impotBrut - decote);
  }
  return Math.round(impotBrut);
}

async function fetchAll(table){let all=[],offset=null;do{const url=`${API}/${encodeURIComponent(table)}?pageSize=100${offset?`&offset=${offset}`:""}`;const res=await fetch(url,{headers:HEADERS});const data=await res.json();all=all.concat(data.records||[]);offset=data.offset;}while(offset);return all;}
async function updateRecord(table,id,fields){return(await fetch(`${API}/${encodeURIComponent(table)}/${id}`,{method:"PATCH",headers:HEADERS,body:JSON.stringify({fields})})).json();}
async function createRecord(table,fields){return(await fetch(`${API}/${encodeURIComponent(table)}`,{method:"POST",headers:HEADERS,body:JSON.stringify({records:[{fields}]})})).json();}
async function deleteRecord(table,id){await fetch(`${API}/${encodeURIComponent(table)}/${id}`,{method:"DELETE",headers:HEADERS});}
async function batchDelete(table,ids){for(let i=0;i<ids.length;i+=10){const batch=ids.slice(i,i+10);const params=batch.map(id=>`records[]=${id}`).join("&");await fetch(`${API}/${encodeURIComponent(table)}?${params}`,{method:"DELETE",headers:HEADERS});}}
function decodeJwt(t){try{return JSON.parse(atob(t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));}catch{return null;}}

// ============================================================
// GLOBAL STYLES + LOGIN (kept from V5)
// ============================================================
function GlobalStyles(){return(<style dangerouslySetInnerHTML={{__html:`
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}body{font-family:'DM Sans',sans-serif;background:#faf9f7;color:#1a1a2e;-webkit-font-smoothing:antialiased;}
  ::selection{background:#1a1a2e;color:#faf9f7;}::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#c4c0b8;border-radius:3px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.6;}}
  @keyframes typing{0%{opacity:.2}20%{opacity:1}100%{opacity:.2}}
  .fade-up{animation:fadeUp .5s ease both;}.fade-in{animation:fadeIn .4s ease both;}.scale-in{animation:scaleIn .3s ease both;}
  .stagger-1{animation-delay:.05s;}.stagger-2{animation-delay:.1s;}.stagger-3{animation-delay:.15s;}.stagger-4{animation-delay:.2s;}
  .grain{position:fixed;inset:0;pointer-events:none;opacity:.03;z-index:9999;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");}
  .card-hover{transition:all .25s cubic-bezier(.4,0,.2,1);}.card-hover:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(26,26,46,0.08);}
  .btn-press{transition:all .15s ease;}.btn-press:active{transform:scale(0.97);}
  .row-hover:hover{background:rgba(26,26,46,0.02)!important;}
  input:focus,select:focus{border-color:#1a1a2e!important;box-shadow:0 0 0 3px rgba(26,26,46,0.08)!important;}
  .typing-dot{animation:typing 1.4s infinite both;display:inline-block;width:6px;height:6px;border-radius:50%;background:#8a8578;margin:0 2px;}
  .typing-dot:nth-child(2){animation-delay:.2s;}.typing-dot:nth-child(3){animation-delay:.4s;}
  .grid-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
  .grid-2col{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
  .header-inner{display:flex;justify-content:space-between;align-items:center;max-width:1320px;margin:0 auto;height:68px;}
  .header-right{display:flex;align-items:center;gap:14px;}
  .content-wrap{max-width:1320px;margin:0 auto;padding:28px 36px;}
  .nav-wrap{display:flex;gap:2px;max-width:1320px;margin:0 auto;padding:10px 36px;overflow-x:auto;}
  .month-bar{display:flex;gap:4px;flex-wrap:wrap;}
  .section-header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;}
  .table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}
  @media(max-width:1024px){
    .grid-kpi{grid-template-columns:repeat(2,1fr);}
    .grid-2col{grid-template-columns:1fr;}
    .content-wrap{padding:20px 16px;}
    .nav-wrap{padding:8px 16px;}
  }
  @media(max-width:640px){
    .grid-kpi{grid-template-columns:1fr;}
    .header-inner{height:auto;padding:12px 0;flex-direction:column;gap:12px;align-items:flex-start;}
    .header-right{flex-wrap:wrap;width:100%;}
    .content-wrap{padding:16px 12px;}
    .nav-wrap{padding:6px 12px;gap:4px;}
    .month-bar{gap:3px;}
    .section-header{flex-direction:column;align-items:flex-start;}
  }
`}}/>);}

function LoginPage({onLogin}){
  useEffect(()=>{const s=document.createElement("script");s.src="https://accounts.google.com/gsi/client";s.async=true;s.onload=()=>{window.google?.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:r=>{const p=decodeJwt(r.credential);if(p&&AUTHORIZED_EMAILS.includes(p.email)){localStorage.setItem("budget_user",JSON.stringify({email:p.email,name:p.name,picture:p.picture}));onLogin({email:p.email,name:p.name,picture:p.picture});}else alert("Accès refusé.");}});window.google?.accounts.id.renderButton(document.getElementById("gsi-btn"),{theme:"outline",size:"large",width:300,text:"signin_with",shape:"pill",logo_alignment:"center"});};document.body.appendChild(s);return()=>{try{document.body.removeChild(s);}catch{}};},[onLogin]);
  return(<><GlobalStyles/><div className="grain"/><div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(165deg,#faf9f7 0%,#f0ede8 40%,#e8e4dd 100%)",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:-120,right:-80,width:400,height:400,borderRadius:"50%",border:"1px solid rgba(26,26,46,0.06)"}}/>
    <div style={{position:"absolute",bottom:-60,left:-40,width:300,height:300,borderRadius:"50%",background:"rgba(26,26,46,0.02)"}}/>
    <div className="fade-up" style={{textAlign:"center",maxWidth:420,width:"90%",padding:"0 20px"}}>
      <div style={{width:72,height:72,borderRadius:20,background:"linear-gradient(135deg,#1a1a2e,#2d2b55)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 32px",boxShadow:"0 8px 32px rgba(26,26,46,0.2)"}}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#faf9f7" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:36,color:"#1a1a2e",lineHeight:1.1}}>Budget Familial</div>
      <div style={{fontSize:14,color:"#8a8578",marginTop:8,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:500}}>Lionel & Ophélie Tchamfong</div>
      <div style={{width:40,height:1,background:"#c4c0b8",margin:"28px auto"}}/>
      <div style={{background:"#fff",borderRadius:16,padding:"32px 28px",boxShadow:"0 4px 24px rgba(26,26,46,0.06)",border:"1px solid rgba(26,26,46,0.06)"}}>
        <p style={{fontSize:13,color:"#8a8578",marginBottom:20,lineHeight:1.6}}>Connectez-vous pour accéder au tableau de bord familial.</p>
        <div id="gsi-btn" style={{display:"flex",justifyContent:"center"}}/>
      </div>
      <p style={{fontSize:11,color:"#b8b4ac",marginTop:24}}>Accès sécurisé — comptes autorisés uniquement</p>
    </div>
  </div></>);}

// ============================================================
// MODALS (kept from V5)
// ============================================================
function Modal({children,onClose}){return(<div onClick={onClose} className="fade-in" style={{position:"fixed",inset:0,background:"rgba(26,26,46,0.35)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}><div onClick={e=>e.stopPropagation()} className="scale-in" style={{background:"#fff",borderRadius:20,padding:"32px 28px",maxWidth:480,width:"90%",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(26,26,46,0.15)",border:"1px solid rgba(26,26,46,0.06)"}}>{children}</div></div>);}

function ConfirmModal({title,message,onConfirm,onCancel,confirmLabel="Confirmer",danger=true}){return(<Modal onClose={onCancel}><h3 style={{fontSize:18,fontWeight:700,marginBottom:8}}>{title}</h3><p style={{color:"#8a8578",fontSize:14,marginBottom:24,lineHeight:1.6}}>{message}</p><div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><button className="btn-press" onClick={onCancel} style={{padding:"10px 20px",background:"transparent",color:"#8a8578",border:"1px solid #ddd8d0",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600}}>Annuler</button><button className="btn-press" onClick={onConfirm} style={{padding:"10px 20px",background:danger?"#b91c1c":"#1a1a2e",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600}}>{confirmLabel}</button></div></Modal>);}

function DeleteChargeModal({charge,onClose,onDelete}){const[mode,setMode]=useState("all");const[sel,setSel]=useState([]);const toggle=i=>setSel(p=>p.includes(i)?p.filter(m=>m!==i):[...p,i]);const rs=(a)=>({display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"14px 16px",border:a?"2px solid #1a1a2e":"1px solid #e8e4dd",borderRadius:12,background:a?"rgba(26,26,46,0.02)":"#fff",transition:"all .2s"});
  return(<Modal onClose={onClose}><h3 style={{fontSize:18,fontWeight:700,color:"#b91c1c",marginBottom:6}}>Supprimer une charge</h3><p style={{color:"#8a8578",fontSize:14,marginBottom:20}}>Charge : <strong style={{color:"#1a1a2e"}}>{charge.fields?.description}</strong></p><div style={{display:"flex",flexDirection:"column",gap:10}}><label style={rs(mode==="all")}><input type="radio" checked={mode==="all"} onChange={()=>setMode("all")} style={{marginTop:2}}/><div><div style={{fontSize:14,fontWeight:600}}>Supprimer complètement</div><div style={{fontSize:12,color:"#8a8578",marginTop:2}}>Charge + tous les montants</div></div></label><label style={rs(mode==="months")}><input type="radio" checked={mode==="months"} onChange={()=>setMode("months")} style={{marginTop:2}}/><div><div style={{fontSize:14,fontWeight:600}}>Remettre à 0 pour certains mois</div></div></label>{mode==="months"&&<div style={{display:"flex",gap:6,flexWrap:"wrap",paddingLeft:8}}>{MOIS.map((m,i)=><button key={i} className="btn-press" onClick={()=>toggle(i)} style={{padding:"6px 14px",border:sel.includes(i)?"2px solid #1a1a2e":"1px solid #ddd8d0",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:sel.includes(i)?700:400,background:sel.includes(i)?"rgba(26,26,46,0.05)":"#fff",color:sel.includes(i)?"#1a1a2e":"#8a8578"}}>{m}</button>)}<button className="btn-press" onClick={()=>setSel(Array.from({length:12},(_,i)=>i))} style={{padding:"6px 14px",border:"1px solid #ddd8d0",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600,background:"transparent",color:"#8a8578"}}>Tous</button></div>}</div><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:24}}><button className="btn-press" onClick={onClose} style={{padding:"10px 20px",background:"transparent",color:"#8a8578",border:"1px solid #ddd8d0",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600}}>Annuler</button><button className="btn-press" disabled={mode==="months"&&sel.length===0} onClick={()=>onDelete(mode,sel)} style={{padding:"10px 20px",background:"#b91c1c",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,opacity:mode==="months"&&sel.length===0?.5:1}}>{mode==="all"?"Supprimer":"Remettre à 0"}</button></div></Modal>);}

function InitYearModal({targetYear,prevYear,onClose,onInit}){const[mode,setMode]=useState("duplicate");const os=(a)=>({display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer",padding:"18px 20px",border:a?"2px solid #1a1a2e":"1px solid #e8e4dd",borderRadius:14,background:a?"rgba(26,26,46,0.02)":"#fff",transition:"all .2s"});
  return(<Modal onClose={onClose}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,marginBottom:6}}>Nouvelle année {targetYear}</h3><p style={{color:"#8a8578",fontSize:14,marginBottom:20,lineHeight:1.6}}>Comment initialiser {targetYear} ?</p><div style={{display:"flex",flexDirection:"column",gap:10}}><label style={os(mode==="duplicate")}><input type="radio" checked={mode==="duplicate"} onChange={()=>setMode("duplicate")} style={{marginTop:3}}/><div><div style={{fontSize:15,fontWeight:600}}>Dupliquer {prevYear}</div><div style={{fontSize:12,color:"#8a8578",marginTop:3}}>Reprend les montants</div></div></label><label style={os(mode==="zero")}><input type="radio" checked={mode==="zero"} onChange={()=>setMode("zero")} style={{marginTop:3}}/><div><div style={{fontSize:15,fontWeight:600}}>Repartir de zéro</div><div style={{fontSize:12,color:"#8a8578",marginTop:3}}>Tous les montants à 0</div></div></label></div><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:24}}><button className="btn-press" onClick={onClose} style={{padding:"10px 20px",background:"transparent",color:"#8a8578",border:"1px solid #ddd8d0",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600}}>Annuler</button><button className="btn-press" onClick={()=>onInit(mode)} style={{padding:"10px 22px",background:"#1a1a2e",color:"#faf9f7",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600}}>Initialiser {targetYear}</button></div></Modal>);}

function AddChgModal({cats,onClose,onAdd}){const[desc,setDesc]=useState("");const[cat,setCat]=useState(cats[0]||"");const[newCat,setNewCat]=useState("");const[useNew,setUseNew]=useState(false);const[compte,setCompte]=useState("Commun");const[l,setL]=useState(0);const[o,setO]=useState(0);const[sel,setSel]=useState(Array.from({length:12},(_,i)=>i));const toggle=i=>setSel(p=>p.includes(i)?p.filter(m=>m!==i):[...p,i]);
  const ls={fontSize:11,fontWeight:600,color:"#8a8578",marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:"0.05em"};const is={padding:"10px 14px",border:"1px solid #ddd8d0",borderRadius:10,fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",background:"#faf9f7",fontFamily:"'DM Sans',sans-serif"};
  return(<Modal onClose={onClose}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,marginBottom:20}}>Nouvelle charge</h3><div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><label style={ls}>Description</label><input style={is} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ex: Netflix"/></div>
    <div><label style={ls}>Catégorie</label><div style={{display:"flex",gap:8}}>{!useNew?<select style={{...is,flex:1,cursor:"pointer"}} value={cat} onChange={e=>setCat(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select>:<input style={{...is,flex:1}} value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Nouvelle catégorie"/>}<button className="btn-press" onClick={()=>setUseNew(!useNew)} style={{padding:"10px 14px",background:"transparent",border:"1px solid #ddd8d0",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,color:"#1a1a2e",whiteSpace:"nowrap"}}>{useNew?"Existante":"+ Nouvelle"}</button></div></div>
    <div><label style={ls}>Compte</label><div style={{display:"flex",gap:8}}>{["Commun","Perso"].map(c=><button key={c} className="btn-press" onClick={()=>setCompte(c)} style={{flex:1,padding:"10px",border:compte===c?"2px solid #1a1a2e":"1px solid #ddd8d0",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:compte===c?700:400,background:compte===c?"rgba(26,26,46,0.04)":"#fff",color:compte===c?"#1a1a2e":"#8a8578"}}>{c}</button>)}</div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div><label style={ls}>Montant Lionel</label><input style={{...is,textAlign:"right"}} type="number" value={l} onChange={e=>setL(+e.target.value)}/></div><div><label style={ls}>Montant Ophélie</label><input style={{...is,textAlign:"right"}} type="number" value={o} onChange={e=>setO(+e.target.value)}/></div></div>
    <div><label style={ls}>Mois</label><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{MOIS.map((m,i)=><button key={i} className="btn-press" onClick={()=>toggle(i)} style={{padding:"7px 13px",border:sel.includes(i)?"2px solid #1a1a2e":"1px solid #ddd8d0",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:sel.includes(i)?700:400,background:sel.includes(i)?"rgba(26,26,46,0.05)":"#fff",color:sel.includes(i)?"#1a1a2e":"#8a8578"}}>{m}</button>)}</div></div>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><button className="btn-press" onClick={onClose} style={{padding:"10px 20px",background:"transparent",color:"#8a8578",border:"1px solid #ddd8d0",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600}}>Annuler</button><button className="btn-press" disabled={!desc} onClick={()=>onAdd({description:desc,categorie:useNew?newCat:cat,compte,lionel:l,ophelie:o,moisList:sel})} style={{padding:"10px 22px",background:"#1a1a2e",color:"#faf9f7",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,opacity:desc?1:.5}}>Ajouter</button></div>
  </div></Modal>);}

function AddEpModal({onClose,onAdd}){const[type,setType]=useState("");const[benef,setBenef]=useState("Lionel");const[obj,setObj]=useState(0);const ls={fontSize:11,fontWeight:600,color:"#8a8578",marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:"0.05em"};const is={padding:"10px 14px",border:"1px solid #ddd8d0",borderRadius:10,fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",background:"#faf9f7",fontFamily:"'DM Sans',sans-serif"};
  return(<Modal onClose={onClose}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,marginBottom:20}}>Nouveau type d'épargne</h3><div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><label style={ls}>Type</label><input style={is} value={type} onChange={e=>setType(e.target.value)} placeholder="PER, CTO, Crypto..."/></div>
    <div><label style={ls}>Bénéficiaire</label><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Lionel","Ophélie","Noémie","Alizée","Commun"].map(b=><button key={b} className="btn-press" onClick={()=>setBenef(b)} style={{padding:"8px 16px",border:benef===b?"2px solid #1a1a2e":"1px solid #ddd8d0",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:benef===b?700:400,background:benef===b?"rgba(26,26,46,0.04)":"#fff",color:benef===b?"#1a1a2e":"#8a8578"}}>{b}</button>)}</div></div>
    <div><label style={ls}>Objectif annuel</label><input style={{...is,textAlign:"right"}} type="number" value={obj} onChange={e=>setObj(+e.target.value)}/></div>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><button className="btn-press" onClick={onClose} style={{padding:"10px 20px",background:"transparent",color:"#8a8578",border:"1px solid #ddd8d0",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600}}>Annuler</button><button className="btn-press" disabled={!type} onClick={()=>onAdd({type,beneficiaire:benef,objectif:obj})} style={{padding:"10px 22px",background:"#1a1a2e",color:"#faf9f7",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,opacity:type?1:.5}}>Ajouter</button></div>
  </div></Modal>);}

// ============================================================
// AI ASSISTANT COMPONENT
// ============================================================
function AIAssistant({revenus,charges,chargesMontants,epargne,epargneMontants,objectifs,annee}){
  const[msgs,setMsgs]=useState([{role:"assistant",content:"Bonjour ! Je suis votre assistant budgétaire. Posez-moi des questions sur vos finances : analyse des dépenses, conseils d'économies, projections..."}]);
  const[input,setInput]=useState("");
  const[loading,setLoading]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  // Build context from data
  const buildContext=()=>{
    const revByYear=revenus.filter(r=>r.fields?.annee===annee);
    const cmByYear=chargesMontants.filter(r=>r.fields?.annee===annee);
    const emByYear=epargneMontants.filter(r=>r.fields?.annee===annee);
    let ctx=`DONNÉES BUDGET FAMILIAL ${annee} (Lionel & Ophélie Tchamfong)\n\n`;
    ctx+=`REVENUS PAR MOIS:\n`;
    for(let m=1;m<=12;m++){const r=revByYear.find(r=>r.fields?.mois===m);ctx+=`${MOIS_FULL[m-1]}: Lionel=${r?.fields?.lionel||0}€, Ophélie=${r?.fields?.ophelie||0}€\n`;}
    ctx+=`\nCHARGES PAR CATÉGORIE ET MOIS:\n`;
    charges.forEach(c=>{const montants=cmByYear.filter(cm=>{const l=cm.fields?.charge_id;return(Array.isArray(l)?l[0]:l)===c.id;});const total=montants.reduce((s,m)=>s+(m.fields?.lionel||0)+(m.fields?.ophelie||0),0);if(total>0)ctx+=`${c.fields?.categorie} > ${c.fields?.description} (${c.fields?.compte}): Total annuel=${total}€\n`;});
    ctx+=`\nÉPARGNE:\n`;
    epargne.forEach(ep=>{const montants=emByYear.filter(em=>{const l=em.fields?.epargne_id;return(Array.isArray(l)?l[0]:l)===ep.id;});const total=montants.reduce((s,m)=>s+(m.fields?.montant||0),0);ctx+=`${ep.fields?.type} (${ep.fields?.beneficiaire}): Total=${total}€\n`;});
    ctx+=`\nOBJECTIFS:\n`;
    objectifs.forEach(o=>ctx+=`${o.fields?.type}: Objectif=${o.fields?.objectif_annuel||0}€\n`);
    return ctx;
  };

  const send=async()=>{
    if(!input.trim()||loading)return;
    const userMsg={role:"user",content:input};
    setMsgs(p=>[...p,userMsg]);setInput("");setLoading(true);
    try{
      const ctx=buildContext();
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        system:`Tu es un assistant budgétaire expert pour une famille française. Tu analyses leurs données financières et donnes des conseils précis, chiffrés et actionables. Réponds toujours en français, de manière concise et bienveillante. Voici les données:\n\n${ctx}`,
        messages:[...msgs.filter(m=>m.role!=="assistant"||msgs.indexOf(m)>0).slice(-6),userMsg]
      })});
      const data=await res.json();
      if(data.error){setMsgs(p=>[...p,{role:"assistant",content:`⚠️ ${data.error}`}]);}
      else{const text=data.content?.map(c=>c.text||"").join("")||"Désolé, je n'ai pas pu analyser vos données.";setMsgs(p=>[...p,{role:"assistant",content:text}]);}
    }catch(e){setMsgs(p=>[...p,{role:"assistant",content:"Erreur de connexion. Réessayez."}]);}
    setLoading(false);
  };

  const suggestions=["Où dépensons-nous le plus ?","Combien économiser si on réduit les abonnements ?","Quel est notre taux d'épargne ?","Sommes-nous sur la bonne trajectoire pour nos objectifs ?"];

  return(<div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 180px)",maxHeight:700}}>
    {/* Messages */}
    <div style={{flex:1,overflowY:"auto",padding:"20px 0",display:"flex",flexDirection:"column",gap:16}}>
      {msgs.map((m,i)=><div key={i} className="fade-up" style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
        <div style={{maxWidth:"80%",padding:"14px 18px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?"#1a1a2e":"#fff",color:m.role==="user"?"#faf9f7":"#1a1a2e",fontSize:14,lineHeight:1.6,boxShadow:"0 2px 8px rgba(0,0,0,0.04)",border:m.role==="user"?"none":"1px solid #e8e4dd",whiteSpace:"pre-wrap"}}>{m.content}</div>
      </div>)}
      {loading&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{padding:"14px 18px",borderRadius:"16px 16px 16px 4px",background:"#fff",border:"1px solid #e8e4dd",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></div></div>}
      <div ref={endRef}/>
    </div>
    {/* Suggestions */}
    {msgs.length<=1&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>{suggestions.map((s,i)=><button key={i} className="btn-press" onClick={()=>{setInput(s);}} style={{padding:"8px 14px",background:"#fff",border:"1px solid #ddd8d0",borderRadius:20,cursor:"pointer",fontSize:12,color:"#1a1a2e",fontWeight:500}}>{s}</button>)}</div>}
    {/* Input */}
    <div style={{display:"flex",gap:10,padding:"16px 0",borderTop:"1px solid #e8e4dd"}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Posez une question sur votre budget..." style={{flex:1,padding:"12px 16px",border:"1px solid #ddd8d0",borderRadius:12,fontSize:14,outline:"none",background:"#fff",fontFamily:"'DM Sans',sans-serif"}}/>
      <button className="btn-press" onClick={send} disabled={loading||!input.trim()} style={{padding:"12px 24px",background:"#1a1a2e",color:"#faf9f7",border:"none",borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:600,opacity:loading||!input.trim()?.5:1}}>Envoyer</button>
    </div>
  </div>);
}

// ============================================================
// TAX SIMULATOR COMPONENT
// ============================================================
function TaxSimulator(){
  const[revL,setRevL]=useState(30000);
  const[revO,setRevO]=useState(50000);
  const[situation,setSituation]=useState("couple");
  const[enfants,setEnfants]=useState(2);
  const[result,setResult]=useState(null);

  const calculate=()=>{
    const revTotal=revL+revO;
    const isCouple=situation==="couple";
    const partsBase=isCouple?2:1;
    const partsEnfants=enfants<=2?enfants*0.5:1+((enfants-2)*1);
    const nbParts=partsBase+partsEnfants;
    const impot=calculerIR(revTotal,nbParts,isCouple);
    const tauxMoyen=revTotal>0?((impot/revTotal)*100):0;
    // TMI
    const qf=revTotal/nbParts;
    let tmi=0;
    for(const t of IR_TRANCHES){if(qf>t.min)tmi=t.taux*100;}
    // Détail par tranche
    const detail=[];
    for(const t of IR_TRANCHES){
      if(qf<=t.min)break;
      const montant=((Math.min(qf,t.max)-t.min)*t.taux)*nbParts;
      detail.push({tranche:`${fmt(t.min)} — ${t.max===Infinity?"∞":fmt(t.max)}`,taux:`${(t.taux*100).toFixed(0)}%`,montant:Math.round(montant)});
    }
    setResult({impot,tauxMoyen:tauxMoyen.toFixed(1),tmi:tmi.toFixed(0),nbParts,revTotal,detail,mensuel:Math.round(impot/12)});
  };

  useEffect(()=>{calculate();},[revL,revO,situation,enfants]);

  const ls={fontSize:11,fontWeight:600,color:"#8a8578",marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:"0.05em"};
  const is={padding:"10px 14px",border:"1px solid #ddd8d0",borderRadius:10,fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",background:"#faf9f7",fontFamily:"'DM Sans',sans-serif",textAlign:"right"};

  return(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
    {/* Formulaire */}
    <div style={{background:"#fff",borderRadius:16,padding:24,border:"1px solid rgba(26,26,46,0.06)"}}>
      <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:18,marginBottom:20}}>Paramètres</h3>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div><label style={ls}>Revenu net imposable — Lionel</label><input style={is} type="number" value={revL} onChange={e=>setRevL(+e.target.value)}/></div>
        <div><label style={ls}>Revenu net imposable — Ophélie</label><input style={is} type="number" value={revO} onChange={e=>setRevO(+e.target.value)}/></div>
        <div><label style={ls}>Situation</label><div style={{display:"flex",gap:8}}>{[["couple","Marié / Pacsé"],["solo","Célibataire"]].map(([v,l])=><button key={v} className="btn-press" onClick={()=>setSituation(v)} style={{flex:1,padding:"10px",border:situation===v?"2px solid #1a1a2e":"1px solid #ddd8d0",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:situation===v?700:400,background:situation===v?"rgba(26,26,46,0.04)":"#fff",color:situation===v?"#1a1a2e":"#8a8578"}}>{l}</button>)}</div></div>
        <div><label style={ls}>Nombre d'enfants à charge</label><div style={{display:"flex",gap:6}}>{[0,1,2,3,4,5].map(n=><button key={n} className="btn-press" onClick={()=>setEnfants(n)} style={{width:42,height:42,border:enfants===n?"2px solid #1a1a2e":"1px solid #ddd8d0",borderRadius:10,cursor:"pointer",fontSize:15,fontWeight:enfants===n?700:400,background:enfants===n?"rgba(26,26,46,0.04)":"#fff",color:enfants===n?"#1a1a2e":"#8a8578"}}>{n}</button>)}</div></div>
        <div style={{padding:"12px 16px",background:"#f2efeb",borderRadius:10,fontSize:12,color:"#8a8578"}}>
          Barème IR 2026 (revenus 2025) — Quotient familial : <strong style={{color:"#1a1a2e"}}>{result?.nbParts} parts</strong>
        </div>
      </div>
    </div>
    {/* Résultats */}
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:"linear-gradient(135deg,#1a1a2e,#2d2b55)",borderRadius:16,padding:28,color:"#faf9f7"}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:"#7a7890",marginBottom:8}}>Impôt estimé</div>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:42,lineHeight:1}}>{fmt(result?.impot||0)}</div>
        <div style={{fontSize:14,color:"#7a7890",marginTop:8}}>soit {fmt(result?.mensuel||0)} / mois</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <div style={{background:"#fff",borderRadius:12,padding:16,border:"1px solid rgba(26,26,46,0.06)",textAlign:"center"}}><div style={{fontSize:11,color:"#8a8578",textTransform:"uppercase",marginBottom:4}}>Taux moyen</div><div style={{fontSize:22,fontWeight:800,color:"#1a1a2e"}}>{result?.tauxMoyen}%</div></div>
        <div style={{background:"#fff",borderRadius:12,padding:16,border:"1px solid rgba(26,26,46,0.06)",textAlign:"center"}}><div style={{fontSize:11,color:"#8a8578",textTransform:"uppercase",marginBottom:4}}>TMI</div><div style={{fontSize:22,fontWeight:800,color:"#1a1a2e"}}>{result?.tmi}%</div></div>
        <div style={{background:"#fff",borderRadius:12,padding:16,border:"1px solid rgba(26,26,46,0.06)",textAlign:"center"}}><div style={{fontSize:11,color:"#8a8578",textTransform:"uppercase",marginBottom:4}}>Parts</div><div style={{fontSize:22,fontWeight:800,color:"#1a1a2e"}}>{result?.nbParts}</div></div>
      </div>
      <div style={{background:"#fff",borderRadius:12,padding:16,border:"1px solid rgba(26,26,46,0.06)"}}>
        <div style={{fontSize:12,fontWeight:600,color:"#8a8578",textTransform:"uppercase",marginBottom:12}}>Détail par tranche</div>
        {result?.detail?.map((d,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<result.detail.length-1?"1px solid #f2efeb":"none",fontSize:13}}>
          <span style={{color:"#8a8578"}}>{d.tranche}</span>
          <span style={{display:"flex",gap:16}}><span style={{color:"#8a8578",minWidth:40,textAlign:"right"}}>{d.taux}</span><span style={{fontWeight:600,minWidth:80,textAlign:"right"}}>{fmt(d.montant)}</span></span>
        </div>)}
      </div>
    </div>
  </div>);
}

// ============================================================
// VIREMENT COMPONENT
// ============================================================
function VirementCalcul({charges,chargesMontants,revenus,annee,mois}){
  const cmByYear=chargesMontants.filter(r=>r.fields?.annee===annee);
  const results=MOIS_FULL.map((moisNom,m)=>{
    let communL=0,communO=0,persoL=0,persoO=0;
    charges.forEach(c=>{
      const cm=cmByYear.find(r=>{const l=r.fields?.charge_id;return(Array.isArray(l)?l[0]:l)===c.id&&r.fields?.mois===m+1;});
      if(!cm)return;
      const l=cm.fields?.lionel||0,o=cm.fields?.ophelie||0;
      if(c.fields?.compte==="Perso"){persoL+=l;persoO+=o;}else{communL+=l;communO+=l;communO+=o;/* total commun */}
    });
    // Recalculate properly
    let totCommun=0,totPersoL=0,totPersoO=0;
    charges.forEach(c=>{
      const cm=cmByYear.find(r=>{const l=r.fields?.charge_id;return(Array.isArray(l)?l[0]:l)===c.id&&r.fields?.mois===m+1;});
      if(!cm)return;
      const l=cm.fields?.lionel||0,o=cm.fields?.ophelie||0;
      if(c.fields?.compte==="Perso"){totPersoL+=l;totPersoO+=o;}
      else{totCommun+=l+o;}
    });
    const totalChargesL=charges.reduce((s,c)=>{const cm=cmByYear.find(r=>{const l=r.fields?.charge_id;return(Array.isArray(l)?l[0]:l)===c.id&&r.fields?.mois===m+1;});return s+(cm?.fields?.lionel||0);},0);
    const totalChargesO=charges.reduce((s,c)=>{const cm=cmByYear.find(r=>{const l=r.fields?.charge_id;return(Array.isArray(l)?l[0]:l)===c.id&&r.fields?.mois===m+1;});return s+(cm?.fields?.ophelie||0);},0);
    const virementL=totalChargesL-totPersoL;
    const virementO=totalChargesO-totPersoO;
    return{mois:moisNom,totCommun,totPersoL,totPersoO,virementL,virementO,totalL:totalChargesL,totalO:totalChargesO};
  });
  const current=results[mois];
  const thS={textAlign:"left",padding:"10px 12px",borderBottom:"2px solid #e8e4dd",color:"#8a8578",fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em"};
  const tdS={padding:"10px 12px",borderBottom:"1px solid #f2efeb",fontSize:13};

  return(<div style={{display:"flex",flexDirection:"column",gap:20}}>
    {/* Current month highlight */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div className="card-hover" style={{background:"#fff",borderRadius:16,padding:24,border:"1px solid rgba(26,26,46,0.06)",borderTop:"3px solid #1e40af"}}>
        <div style={{fontSize:11,fontWeight:600,color:"#8a8578",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Virement Lionel</div>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:32,color:"#1e40af"}}>{fmt(current?.virementL||0)}</div>
        <div style={{fontSize:12,color:"#8a8578",marginTop:6}}>vers le compte commun — {MOIS_FULL[mois]}</div>
      </div>
      <div className="card-hover" style={{background:"#fff",borderRadius:16,padding:24,border:"1px solid rgba(26,26,46,0.06)",borderTop:"3px solid #be185d"}}>
        <div style={{fontSize:11,fontWeight:600,color:"#8a8578",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Virement Ophélie</div>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:32,color:"#be185d"}}>{fmt(current?.virementO||0)}</div>
        <div style={{fontSize:12,color:"#8a8578",marginTop:6}}>vers le compte commun — {MOIS_FULL[mois]}</div>
      </div>
    </div>
    {/* Monthly table */}
    <div style={{background:"#fff",borderRadius:16,padding:24,border:"1px solid rgba(26,26,46,0.06)"}}>
      <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:18,marginBottom:16}}>Récapitulatif mensuel {annee}</h3>
      <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={thS}>Mois</th><th style={{...thS,textAlign:"right"}}>Charges Lionel</th><th style={{...thS,textAlign:"right"}}>Perso Lionel</th><th style={{...thS,textAlign:"right"}}>Virement Lionel</th><th style={{...thS,textAlign:"right"}}>Charges Ophélie</th><th style={{...thS,textAlign:"right"}}>Perso Ophélie</th><th style={{...thS,textAlign:"right"}}>Virement Ophélie</th></tr></thead><tbody>
        {results.map((r,i)=><tr key={i} className="row-hover" style={{background:i===mois?"rgba(26,26,46,0.03)":"transparent",fontWeight:i===mois?600:400}}>
          <td style={tdS}>{r.mois}</td>
          <td style={{...tdS,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmt(r.totalL)}</td>
          <td style={{...tdS,textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#8a8578"}}>{fmt(r.totPersoL)}</td>
          <td style={{...tdS,textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#1e40af",fontWeight:600}}>{fmt(r.virementL)}</td>
          <td style={{...tdS,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmt(r.totalO)}</td>
          <td style={{...tdS,textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#8a8578"}}>{fmt(r.totPersoO)}</td>
          <td style={{...tdS,textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#be185d",fontWeight:600}}>{fmt(r.virementO)}</td>
        </tr>)}
      </tbody></table>
    </div>
  </div>);
}

// ============================================================
// ALERTS COMPONENT
// ============================================================
function Alerts({revenus,chargesMontants,epargneMontants,annee,mois}){
  const[dismissed,setDismissed]=useState(()=>{try{return JSON.parse(localStorage.getItem("budget_dismissed_alerts")||"[]");}catch{return[];}});
  const dismiss=(key)=>{const next=[...dismissed,key];setDismissed(next);localStorage.setItem("budget_dismissed_alerts",JSON.stringify(next));};
  const clearAll=()=>{setDismissed([]);localStorage.removeItem("budget_dismissed_alerts");};
  const cmByYear=chargesMontants.filter(r=>r.fields?.annee===annee);
  const emByYear=epargneMontants.filter(r=>r.fields?.annee===annee);
  const revByYear=revenus.filter(r=>r.fields?.annee===annee);
  const allAlerts=[];
  for(let m=0;m<12;m++){
    const rev=revByYear.find(r=>r.fields?.mois===m+1);
    const revTotal=(rev?.fields?.lionel||0)+(rev?.fields?.ophelie||0);
    const chgTotal=cmByYear.filter(r=>r.fields?.mois===m+1).reduce((s,r)=>s+(r.fields?.lionel||0)+(r.fields?.ophelie||0),0);
    const epTotal=emByYear.filter(r=>r.fields?.mois===m+1).reduce((s,r)=>s+(r.fields?.montant||0),0);
    const solde=revTotal-chgTotal-epTotal;
    if(solde<0)allAlerts.push({key:`neg-${annee}-${m}`,type:"danger",icon:"⚠",msg:`${MOIS_FULL[m]} : Solde négatif de ${fmt(solde)}`});
    if(epTotal===0&&revTotal>0)allAlerts.push({key:`noep-${annee}-${m}`,type:"warning",icon:"💡",msg:`${MOIS_FULL[m]} : Aucune épargne enregistrée`});
    if(chgTotal>revTotal*0.8&&revTotal>0)allAlerts.push({key:`high-${annee}-${m}`,type:"warning",icon:"📊",msg:`${MOIS_FULL[m]} : Charges = ${((chgTotal/revTotal)*100).toFixed(0)}% des revenus`});
  }
  const alerts=allAlerts.filter(a=>!dismissed.includes(a.key));
  const colors={danger:{bg:"#fef2f2",border:"#fca5a5",text:"#b91c1c"},warning:{bg:"#fffbeb",border:"#fcd34d",text:"#a16207"},success:{bg:"#f0fdf4",border:"#86efac",text:"#15803d"}};
  return(<div style={{display:"flex",flexDirection:"column",gap:10}}>
    {dismissed.length>0&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}><button className="btn-press" onClick={clearAll} style={{padding:"6px 14px",background:"transparent",border:"1px solid #ddd8d0",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600,color:"#8a8578"}}>Réafficher les alertes ignorées ({dismissed.length})</button></div>}
    {alerts.length===0&&<div className="fade-up" style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:12}}><span style={{fontSize:18}}>✓</span><span style={{fontSize:14,color:"#15803d",fontWeight:600}}>Tout est en ordre ! Aucune alerte active.</span></div>}
    {alerts.map((a,i)=>{const c=colors[a.type];return(<div key={a.key} className="fade-up" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:c.bg,border:`1px solid ${c.border}`,borderRadius:12,animation:`fadeUp .3s ease ${i*0.05}s both`}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:18}}>{a.icon}</span><span style={{fontSize:13,color:c.text,fontWeight:500}}>{a.msg}</span></div>
      <button className="btn-press" onClick={()=>dismiss(a.key)} style={{padding:"4px 12px",background:"transparent",border:`1px solid ${c.border}`,borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,color:c.text,whiteSpace:"nowrap"}}>Ignorer</button>
    </div>);})}
  </div>);
}

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function BudgetApp(){
  const[user,setUser]=useState(null);const[authChecked,setAuthChecked]=useState(false);const[tab,setTab]=useState("dashboard");const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[mois,setMois]=useState(new Date().getMonth());const[annee,setAnnee]=useState(2026);const[chartType,setChartType]=useState("bar");
  const[revenus,setRevenus]=useState([]);const[charges,setCharges]=useState([]);const[chargesMontants,setChargesMontants]=useState([]);const[epargne,setEpargne]=useState([]);const[epargneMontants,setEpargneMontants]=useState([]);const[objectifs,setObjectifs]=useState([]);
  const[showAddCharge,setShowAddCharge]=useState(false);const[showAddEpargne,setShowAddEpargne]=useState(false);const[delCharge,setDelCharge]=useState(null);const[delEpargne,setDelEpargne]=useState(null);const[delObjectif,setDelObjectif]=useState(null);const[initYearTarget,setInitYearTarget]=useState(null);

  useEffect(()=>{const s=localStorage.getItem("budget_user");if(s){try{const u=JSON.parse(s);if(AUTHORIZED_EMAILS.includes(u.email))setUser(u);}catch{}}setAuthChecked(true);},[]);
  const loadData=useCallback(async()=>{setLoading(true);try{const[rev,chg,cm,ep,em,obj]=await Promise.all([fetchAll("Revenus"),fetchAll("Charges"),fetchAll("Charges_Montants"),fetchAll("Epargne"),fetchAll("Epargne_montants"),fetchAll("Objectifs")]);setRevenus(rev);setCharges(chg);setChargesMontants(cm);setEpargne(ep);setEpargneMontants(em);setObjectifs(obj);}catch(e){console.error(e);}setLoading(false);},[]);
  useEffect(()=>{if(user)loadData();},[user,loadData]);
  const save=async fn=>{setSaving(true);await fn();setTimeout(()=>setSaving(false),1500);};
  const logout=()=>{localStorage.removeItem("budget_user");setUser(null);};

  const revByYear=useMemo(()=>revenus.filter(r=>r.fields?.annee===annee),[revenus,annee]);
  const cmByYear=useMemo(()=>chargesMontants.filter(r=>r.fields?.annee===annee),[chargesMontants,annee]);
  const emByYear=useMemo(()=>epargneMontants.filter(r=>r.fields?.annee===annee),[epargneMontants,annee]);
  const getRevMois=m=>{const r=revByYear.find(r=>r.fields?.mois===m+1);return r?{id:r.id,lionel:r.fields.lionel||0,ophelie:r.fields.ophelie||0}:{lionel:0,ophelie:0};};
  const getCM=(cid,m)=>{const r=cmByYear.find(r=>{const l=r.fields?.charge_id;return(Array.isArray(l)?l[0]:l)===cid&&r.fields?.mois===m+1;});return r?{id:r.id,lionel:r.fields.lionel||0,ophelie:r.fields.ophelie||0}:null;};
  const getEM=(eid,m)=>{const r=emByYear.find(r=>{const l=r.fields?.epargne_id;return(Array.isArray(l)?l[0]:l)===eid&&r.fields?.mois===m+1;});return r?{id:r.id,montant:r.fields.montant||0}:null;};
  const totalChgMois=m=>cmByYear.filter(r=>r.fields?.mois===m+1).reduce((s,r)=>s+(r.fields.lionel||0)+(r.fields.ophelie||0),0);
  const totalEpMois=m=>emByYear.filter(r=>r.fields?.mois===m+1).reduce((s,r)=>s+(r.fields.montant||0),0);
  const chargesByCat=useMemo(()=>{const map={};charges.forEach(c=>{const cat=c.fields?.categorie||"Autre";if(!map[cat])map[cat]=[];map[cat].push(c);});Object.values(map).forEach(a=>a.sort((a,b)=>(a.fields?.ordre||0)-(b.fields?.ordre||0)));return map;},[charges]);
  const availYears=useMemo(()=>{const y=new Set([2026,2027,2028,2029,2030]);revenus.forEach(r=>{if(r.fields?.annee)y.add(r.fields.annee);});return[...y].sort();},[revenus]);
  const chartData=useMemo(()=>MOIS.map((m,i)=>{const r=getRevMois(i);return{mois:m,revenus:r.lionel+r.ophelie,charges:totalChgMois(i),epargne:totalEpMois(i),solde:(r.lionel+r.ophelie)-totalChgMois(i)-totalEpMois(i)};}),[revByYear,cmByYear,emByYear]);
  const pieData=useMemo(()=>{const map={};charges.forEach(c=>{const cat=c.fields?.categorie||"Autre";const t=cmByYear.filter(cm=>{const l=cm.fields?.charge_id;return(Array.isArray(l)?l[0]:l)===c.id&&cm.fields?.mois===mois+1;}).reduce((s,cm)=>s+(cm.fields.lionel||0)+(cm.fields.ophelie||0),0);map[cat]=(map[cat]||0)+t;});return Object.entries(map).filter(([,v])=>v>0).map(([name,value])=>({name,value}));},[charges,cmByYear,mois]);

  // Alert count for badge
  const alertCount=useMemo(()=>{let c=0;for(let m=0;m<12;m++){const rev=revByYear.find(r=>r.fields?.mois===m+1);const revT=(rev?.fields?.lionel||0)+(rev?.fields?.ophelie||0);const chgT=cmByYear.filter(r=>r.fields?.mois===m+1).reduce((s,r)=>s+(r.fields.lionel||0)+(r.fields.ophelie||0),0);const epT=emByYear.filter(r=>r.fields?.mois===m+1).reduce((s,r)=>s+(r.fields.montant||0),0);if(revT-chgT-epT<0)c++;if(epT===0&&revT>0)c++;}return c;},[revByYear,cmByYear,emByYear]);

  const handleInitYear=async y=>{if(revenus.some(r=>r.fields?.annee===y)){setAnnee(y);return;}setInitYearTarget(y);};
  const doInitYear=async mode=>{const y=initYearTarget;const prevY=y-1;setInitYearTarget(null);setSaving(true);try{if(mode==="duplicate"){for(let m=1;m<=12;m++){const prev=revenus.find(r=>r.fields?.annee===prevY&&r.fields?.mois===m);await createRecord("Revenus",{mois:m,annee:y,lionel:prev?.fields?.lionel||0,ophelie:prev?.fields?.ophelie||0});}for(const c of charges){for(let m=1;m<=12;m++){const prev=chargesMontants.find(r=>{const l=r.fields?.charge_id;return(Array.isArray(l)?l[0]:l)===c.id&&r.fields?.annee===prevY&&r.fields?.mois===m;});await createRecord("Charges_Montants",{mois:m,annee:y,lionel:prev?.fields?.lionel||0,ophelie:prev?.fields?.ophelie||0,charge_id:[c.id]});}}for(const ep of epargne){for(let m=1;m<=12;m++){const prev=epargneMontants.find(r=>{const l=r.fields?.epargne_id;return(Array.isArray(l)?l[0]:l)===ep.id&&r.fields?.annee===prevY&&r.fields?.mois===m;});await createRecord("Epargne_montants",{mois:m,annee:y,montant:prev?.fields?.montant||0,epargne_id:[ep.id]});}}}else{for(let m=1;m<=12;m++)await createRecord("Revenus",{mois:m,annee:y,lionel:0,ophelie:0});for(const c of charges)for(let m=1;m<=12;m++)await createRecord("Charges_Montants",{mois:m,annee:y,lionel:0,ophelie:0,charge_id:[c.id]});for(const ep of epargne)for(let m=1;m<=12;m++)await createRecord("Epargne_montants",{mois:m,annee:y,montant:0,epargne_id:[ep.id]});}await loadData();setAnnee(y);}catch(e){console.error(e);alert("Erreur");}setSaving(false);};
  const handleDeleteCharge=async(mode,selMois)=>{const c=delCharge;setDelCharge(null);await save(async()=>{if(mode==="all"){const cmIds=chargesMontants.filter(r=>{const l=r.fields?.charge_id;return(Array.isArray(l)?l[0]:l)===c.id;}).map(r=>r.id);await batchDelete("Charges_Montants",cmIds);await deleteRecord("Charges",c.id);}else{for(const m of selMois){const cm=getCM(c.id,m);if(cm?.id)await updateRecord("Charges_Montants",cm.id,{lionel:0,ophelie:0});}}await loadData();});};
  const handleDeleteEpargne=async()=>{const ep=delEpargne;setDelEpargne(null);await save(async()=>{const emIds=epargneMontants.filter(r=>{const l=r.fields?.epargne_id;return(Array.isArray(l)?l[0]:l)===ep.id;}).map(r=>r.id);await batchDelete("Epargne_montants",emIds);await deleteRecord("Epargne",ep.id);await loadData();});};
  const handleDeleteObjectif=async()=>{const obj=delObjectif;setDelObjectif(null);await save(async()=>{await deleteRecord("Objectifs",obj.id);await loadData();});};

  if(!authChecked)return null;
  if(!user)return<LoginPage onLogin={setUser}/>;
  if(loading)return(<><GlobalStyles/><div className="grain"/><div style={{minHeight:"100vh",background:"#faf9f7",display:"flex",flexDirection:"column"}}><div style={{background:"#1a1a2e",padding:"20px 36px"}}><div style={{fontFamily:"'DM Serif Display',serif",color:"#faf9f7",fontSize:22}}>Budget Familial {annee}</div></div><div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><div style={{width:40,height:40,border:"3px solid #e8e4dd",borderTopColor:"#1a1a2e",borderRadius:"50%",animation:"pulse 1s infinite",margin:"0 auto 16px"}}/><p style={{color:"#8a8578",fontSize:14}}>Chargement...</p></div></div></div></>);

  const rev=getRevMois(mois),chgT=totalChgMois(mois),epT=totalEpMois(mois),solde=(rev.lionel+rev.ophelie)-chgT-epT;
  // Previous month: Jan compares with Dec N-1, others compare within same year
  const prevM=mois>0?mois-1:11;
  const prevAnnee=mois>0?annee:annee-1;
  const hasPrevData=revenus.some(r=>r.fields?.annee===prevAnnee);
  const prevRevByYear=revenus.filter(r=>r.fields?.annee===prevAnnee);
  const prevCmByYear=chargesMontants.filter(r=>r.fields?.annee===prevAnnee);
  const prevEmByYear=epargneMontants.filter(r=>r.fields?.annee===prevAnnee);
  const getPrevRevMois=()=>{const r=prevRevByYear.find(r=>r.fields?.mois===prevM+1);return r?{lionel:r.fields.lionel||0,ophelie:r.fields.ophelie||0}:{lionel:0,ophelie:0};};
  const prevRev=getPrevRevMois();
  const prevChg=prevCmByYear.filter(r=>r.fields?.mois===prevM+1).reduce((s,r)=>s+(r.fields.lionel||0)+(r.fields.ophelie||0),0);
  const prevEp=prevEmByYear.filter(r=>r.fields?.mois===prevM+1).reduce((s,r)=>s+(r.fields.montant||0),0);
  const prevSolde=(prevRev.lionel+prevRev.ophelie)-prevChg-prevEp;
  const CS={background:"#fff",borderRadius:16,padding:24,border:"1px solid rgba(26,26,46,0.06)",boxShadow:"0 2px 12px rgba(26,26,46,0.04)"};
  const thS={textAlign:"left",padding:"12px 14px",borderBottom:"2px solid #e8e4dd",color:"#8a8578",fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em"};
  const tdS={padding:"12px 14px",borderBottom:"1px solid #f2efeb"};
  const iS={padding:"8px 12px",border:"1px solid #ddd8d0",borderRadius:8,fontSize:13,width:90,outline:"none",textAlign:"right",background:"#faf9f7",fontFamily:"'DM Sans',sans-serif"};
  const bP={padding:"8px 18px",background:"#1a1a2e",color:"#faf9f7",border:"none",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:600};
  const bG={padding:"8px 16px",background:"transparent",color:"#8a8578",border:"1px solid #ddd8d0",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:500};
  const bD={padding:"5px 10px",background:"transparent",color:"#b91c1c",border:"1px solid #f5c6c6",borderRadius:7,cursor:"pointer",fontSize:10,fontWeight:600};
  const mB=(a)=>({padding:"7px 14px",border:a?"2px solid #1a1a2e":"1px solid #ddd8d0",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:a?700:400,background:a?"rgba(26,26,46,0.06)":"#fff",color:a?"#1a1a2e":"#8a8578"});
  const tabs=[["dashboard","Tableau de bord"],["revenus","Revenus"],["charges","Charges"],["epargne","Épargne"],["objectifs","Objectifs"],["virements","Virements"],["impots","Simulateur IR"],["assistant","Assistant IA"],["alertes",`Alertes${alertCount>0?` (${alertCount})`:""}`]];

  return(<><GlobalStyles/><div className="grain"/><div style={{minHeight:"100vh",background:"#faf9f7"}}>
    {saving&&<div className="fade-in" style={{position:"fixed",bottom:24,right:24,background:"#1a1a2e",color:"#faf9f7",padding:"10px 20px",borderRadius:12,fontSize:13,fontWeight:600,boxShadow:"0 8px 30px rgba(26,26,46,0.2)",zIndex:2000,display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:"#4ade80",animation:"pulse 1s infinite"}}/>Sauvegarde...</div>}

    {/* HEADER */}
    <div style={{background:"#1a1a2e",padding:"0 max(16px,calc((100% - 1320px)/2 + 36px))",position:"sticky",top:0,zIndex:100}}><div className="header-inner">
      <div style={{display:"flex",alignItems:"center",gap:16}}><div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#2d2b55,#44427a)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#faf9f7" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div><div style={{fontFamily:"'DM Serif Display',serif",color:"#faf9f7",fontSize:18}}>Budget Familial</div><div style={{color:"#7a7890",fontSize:11,fontWeight:500}}>Tchamfong · {annee}</div></div></div>
      <div style={{display:"flex",alignItems:"center",gap:14}}><div style={{display:"flex",gap:2,background:"rgba(255,255,255,0.06)",borderRadius:10,padding:3}}>{availYears.map(y=><button key={y} className="btn-press" onClick={()=>handleInitYear(y)} style={{padding:"5px 14px",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:annee===y?700:400,background:annee===y?"#fff":"transparent",color:annee===y?"#1a1a2e":"#7a7890"}}>{y}</button>)}</div>
      <select value={mois} onChange={e=>setMois(+e.target.value)} style={{padding:"7px 12px",background:"rgba(255,255,255,0.06)",color:"#faf9f7",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,fontSize:12,outline:"none",fontFamily:"'DM Sans',sans-serif",cursor:"pointer"}}>{MOIS_FULL.map((m,i)=><option key={i} value={i} style={{background:"#1a1a2e"}}>{m}</option>)}</select>
      <div style={{width:1,height:28,background:"rgba(255,255,255,0.1)"}}/>
      <div style={{display:"flex",alignItems:"center",gap:10}}>{user.picture&&<img src={user.picture} style={{width:30,height:30,borderRadius:8,objectFit:"cover",border:"2px solid rgba(255,255,255,0.1)"}} alt="" referrerPolicy="no-referrer"/>}<div><div style={{color:"#faf9f7",fontSize:12,fontWeight:600}}>{user.name?.split(" ")[0]}</div><button onClick={logout} style={{background:"none",border:"none",color:"#7a7890",fontSize:10,cursor:"pointer",padding:0,fontFamily:"'DM Sans',sans-serif"}}>Déconnexion</button></div></div></div>
    </div></div>

    {/* NAV */}
    <div style={{background:"#fff",borderBottom:"1px solid #e8e4dd",position:"sticky",top:68,zIndex:99}}><div className="nav-wrap">{tabs.map(([k,l])=><button key={k} className="btn-press" onClick={()=>setTab(k)} style={{padding:"8px 18px",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:600,background:tab===k?"#1a1a2e":"transparent",color:tab===k?"#faf9f7":"#8a8578",whiteSpace:"nowrap",position:"relative"}}>{l}{k==="alertes"&&alertCount>0&&tab!==k&&<span style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:"50%",background:"#b91c1c"}}/>}</button>)}</div></div>

    <div className="content-wrap">

    {/* DASHBOARD */}
    {tab==="dashboard"&&<div style={{display:"flex",flexDirection:"column",gap:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,margin:0}}>{MOIS_FULL[mois]} {annee}</h3><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{MOIS.map((m,i)=><button key={i} className="btn-press" style={mB(mois===i)} onClick={()=>setMois(i)}>{m}</button>)}</div></div>
      <div className="grid-kpi">{[["Revenus",rev.lionel+rev.ophelie,prevRev.lionel+prevRev.ophelie,"#1e40af"],["Charges",chgT,prevChg,"#b91c1c"],["Épargne",epT,prevEp,"#6d28d9"],["Solde",solde,prevSolde,solde>=0?"#15803d":"#b91c1c"]].map(([label,val,prev,color],i)=>{const diff=val-prev;const pct=prev>0?((diff/prev)*100).toFixed(0):0;const diffColor=diff>0?"#15803d":diff<0?"#b91c1c":"#8a8578";const arrowPath=diff>0?"M7 14l5-5 5 5":diff<0?"M7 10l5 5 5-5":"M5 12h14";const showArrow=hasPrevData&&prev>0;return<div key={label} className={`card-hover fade-up stagger-${i+1}`} style={{...CS,borderTop:`3px solid ${color}`,position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`${color}08`}}/><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{fontSize:11,fontWeight:600,color:"#8a8578",textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</span></div><div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color}}>{fmt(val)}</div>{showArrow&&<div style={{display:"flex",alignItems:"center",gap:4,marginTop:8}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={diffColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={arrowPath}/></svg><span style={{fontSize:11,fontWeight:600,color:diffColor}}>{diff>0?"+":""}{pct}% vs {MOIS[prevM]}{prevAnnee!==annee?` ${prevAnnee}`:""}</span></div>}</div>})}</div>
      <div className="fade-up stagger-3" style={CS}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,margin:0}}>Évolution {annee}</h3><div style={{display:"flex",gap:3,background:"#f2efeb",borderRadius:9,padding:3}}>{[["bar","Barres"],["line","Lignes"],["area","Aires"]].map(([t,l])=><button key={t} className="btn-press" onClick={()=>setChartType(t)} style={{padding:"5px 14px",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:chartType===t?600:400,background:chartType===t?"#fff":"transparent",color:chartType===t?"#1a1a2e":"#8a8578"}}>{l}</button>)}</div></div>
        <ResponsiveContainer width="100%" height={300}>{chartType==="bar"?<BarChart data={chartData} barGap={2}><CartesianGrid strokeDasharray="3 3" stroke="#f2efeb" vertical={false}/><XAxis dataKey="mois" tick={{fontSize:11,fill:"#8a8578"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#8a8578"}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:12,border:"none",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}/><Legend wrapperStyle={{fontSize:12}}/><Bar dataKey="revenus" fill="#1e40af" name="Revenus" radius={[6,6,0,0]} maxBarSize={28}/><Bar dataKey="charges" fill="#b91c1c" name="Charges" radius={[6,6,0,0]} maxBarSize={28}/><Bar dataKey="epargne" fill="#6d28d9" name="Épargne" radius={[6,6,0,0]} maxBarSize={28}/></BarChart>:chartType==="line"?<LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f2efeb" vertical={false}/><XAxis dataKey="mois" tick={{fontSize:11,fill:"#8a8578"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#8a8578"}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:12,border:"none",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}/><Legend wrapperStyle={{fontSize:12}}/><Line type="monotone" dataKey="revenus" stroke="#1e40af" strokeWidth={2.5} dot={{r:3}} name="Revenus"/><Line type="monotone" dataKey="charges" stroke="#b91c1c" strokeWidth={2.5} dot={{r:3}} name="Charges"/><Line type="monotone" dataKey="epargne" stroke="#6d28d9" strokeWidth={2.5} dot={{r:3}} name="Épargne"/></LineChart>:<AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f2efeb" vertical={false}/><XAxis dataKey="mois" tick={{fontSize:11,fill:"#8a8578"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#8a8578"}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:12,border:"none",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}/><Legend wrapperStyle={{fontSize:12}}/><Area type="monotone" dataKey="revenus" fill="#1e40af" fillOpacity={0.08} stroke="#1e40af" strokeWidth={2} name="Revenus"/><Area type="monotone" dataKey="charges" fill="#b91c1c" fillOpacity={0.08} stroke="#b91c1c" strokeWidth={2} name="Charges"/><Area type="monotone" dataKey="epargne" fill="#6d28d9" fillOpacity={0.08} stroke="#6d28d9" strokeWidth={2} name="Épargne"/></AreaChart>}</ResponsiveContainer></div>
      <div className="grid-2col">
        <div className="fade-up stagger-2" style={CS}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:18,margin:"0 0 16px"}}>Répartition — {MOIS_FULL[mois]}</h3><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={95} innerRadius={50} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} style={{fontSize:10}}>{pieData.map((e,i)=><Cell key={i} fill={CAT_COLORS[e.name]||CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:12,border:"none",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}/></PieChart></ResponsiveContainer></div>
        <div className="fade-up stagger-3" style={CS}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:18,margin:"0 0 16px"}}>Objectifs {annee}</h3><div style={{display:"flex",flexDirection:"column",gap:16}}>{objectifs.map(obj=>{const type=obj.fields?.type||"",target=obj.fields?.objectif_annuel||0;const actual=emByYear.reduce((s,em)=>{const e=epargne.find(e=>{const l=em.fields?.epargne_id;return(Array.isArray(l)?l[0]:l)===e.id;});if(!e)return s;if(type.includes(e.fields.type)&&(type.includes(e.fields.beneficiaire)||type.includes("Commun")))return s+(em.fields.montant||0);return s;},0);const pct=target>0?(actual/target)*100:0;return(<div key={obj.id}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}><span style={{fontWeight:600}}>{type}</span><span style={{color:"#8a8578"}}>{fmt(actual)} / {fmt(target)}</span></div><div style={{height:6,borderRadius:3,background:"#f2efeb",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:pct>=100?"linear-gradient(90deg,#15803d,#22c55e)":"linear-gradient(90deg,#1a1a2e,#44427a)",borderRadius:3,transition:"width .6s cubic-bezier(.4,0,.2,1)"}}/></div></div>);})}</div></div>
      </div>
    </div>}

    {/* REVENUS */}
    {tab==="revenus"&&<div className="fade-up" style={CS}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,margin:"0 0 20px"}}>Revenus {annee}</h3><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={thS}>Mois</th><th style={{...thS,textAlign:"right"}}>Lionel</th><th style={{...thS,textAlign:"right"}}>Ophélie</th><th style={{...thS,textAlign:"right"}}>Total</th><th style={{...thS,width:100}}></th></tr></thead><tbody>{MOIS_FULL.map((m,i)=>{const r=getRevMois(i);return<EditRow key={i} label={m} a={r.lionel} b={r.ophelie} tdS={tdS} iS={iS} bP={bP} bG={bG} onSave={async(a,b)=>{await save(async()=>{if(r.id){await updateRecord("Revenus",r.id,{lionel:a,ophelie:b});setRevenus(p=>p.map(x=>x.id===r.id?{...x,fields:{...x.fields,lionel:a,ophelie:b}}:x));}});}}/>;})}</tbody><tfoot><tr style={{fontWeight:700}}><td style={{...tdS,fontFamily:"'DM Serif Display',serif"}}>Total</td><td style={{...tdS,textAlign:"right"}}>{fmt(revByYear.reduce((s,r)=>s+(r.fields?.lionel||0),0))}</td><td style={{...tdS,textAlign:"right"}}>{fmt(revByYear.reduce((s,r)=>s+(r.fields?.ophelie||0),0))}</td><td style={{...tdS,textAlign:"right",fontFamily:"'DM Serif Display',serif"}}>{fmt(revByYear.reduce((s,r)=>s+(r.fields?.lionel||0)+(r.fields?.ophelie||0),0))}</td><td style={tdS}/></tr></tfoot></table></div>}

    {/* CHARGES */}
    {tab==="charges"&&<div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div className="fade-up" style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,margin:0}}>Charges — {MOIS_FULL[mois]} {annee}</h3><div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{MOIS.map((m,i)=><button key={i} className="btn-press" style={mB(mois===i)} onClick={()=>setMois(i)}>{m}</button>)}</div><button className="btn-press" onClick={()=>setShowAddCharge(true)} style={{...bP,padding:"9px 18px"}}>+ Ajouter</button></div></div>
      {Object.entries(chargesByCat).map(([cat,chgs])=>{const ac=chgs.filter(c=>{const cm=getCM(c.id,mois);return cm&&(cm.lionel+cm.ophelie)>0;});const catT=ac.reduce((s,c)=>{const cm=getCM(c.id,mois);return s+(cm?cm.lionel+cm.ophelie:0);},0);if(ac.length===0)return null;return(<div key={cat} className="fade-up card-hover" style={CS}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{display:"inline-flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,borderRadius:3,background:CAT_COLORS[cat]||"#8a8578"}}/><span style={{fontSize:13,fontWeight:700}}>{cat}</span></div><span style={{fontFamily:"'DM Serif Display',serif",fontSize:16,color:CAT_COLORS[cat]||"#1a1a2e"}}>{fmt(catT)}</span></div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={thS}>Description</th><th style={{...thS,width:90}}>Compte</th><th style={{...thS,textAlign:"right",width:100}}>Lionel</th><th style={{...thS,textAlign:"right",width:100}}>Ophélie</th><th style={{...thS,textAlign:"right",width:90}}>Total</th><th style={{...thS,width:90}}></th></tr></thead><tbody>{ac.map(c=>{const cm=getCM(c.id,mois);return<ChgRow key={c.id} charge={c} l={cm?.lionel||0} o={cm?.ophelie||0} tdS={tdS} iS={iS} bP={bP} bG={bG} bD={bD} onSave={async(l,o,newCompte)=>{await save(async()=>{if(cm?.id){await updateRecord("Charges_Montants",cm.id,{lionel:l,ophelie:o});setChargesMontants(p=>p.map(r=>r.id===cm.id?{...r,fields:{...r.fields,lionel:l,ophelie:o}}:r));}if(newCompte!==c.fields?.compte){await updateRecord("Charges",c.id,{compte:newCompte});setCharges(p=>p.map(r=>r.id===c.id?{...r,fields:{...r.fields,compte:newCompte}}:r));}});}} onDelete={()=>setDelCharge(c)}/>;})}</tbody></table></div>);})}
      {/* TOTAUX DU MOIS */}
      <div className="fade-up" style={{...CS,borderTop:"3px solid #1a1a2e"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><span style={{fontFamily:"'DM Serif Display',serif",fontSize:18}}>Total charges — {MOIS_FULL[mois]}</span></div><div style={{display:"flex",gap:24,alignItems:"center"}}><div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#8a8578",textTransform:"uppercase",fontWeight:600,letterSpacing:"0.08em"}}>Lionel</div><div style={{fontSize:18,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{fmt(cmByYear.filter(r=>r.fields?.mois===mois+1).reduce((s,r)=>s+(r.fields?.lionel||0),0))}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#8a8578",textTransform:"uppercase",fontWeight:600,letterSpacing:"0.08em"}}>Ophélie</div><div style={{fontSize:18,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{fmt(cmByYear.filter(r=>r.fields?.mois===mois+1).reduce((s,r)=>s+(r.fields?.ophelie||0),0))}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#8a8578",textTransform:"uppercase",fontWeight:600,letterSpacing:"0.08em"}}>Total</div><div style={{fontFamily:"'DM Serif Display',serif",fontSize:24,color:"#b91c1c"}}>{fmt(chgT)}</div></div></div></div></div>
    </div>}

    {/* ÉPARGNE */}
    {tab==="epargne"&&<div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div className="fade-up" style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,margin:0}}>Épargne — {MOIS_FULL[mois]} {annee}</h3><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{MOIS.map((m,i)=><button key={i} className="btn-press" style={mB(mois===i)} onClick={()=>setMois(i)}>{m}</button>)}</div><button className="btn-press" onClick={()=>setShowAddEpargne(true)} style={{...bP,padding:"9px 18px"}}>+ Ajouter</button></div></div>
      <div className="fade-up" style={CS}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={thS}>Type</th><th style={thS}>Bénéficiaire</th><th style={{...thS,textAlign:"right",width:120}}>Montant</th><th style={{...thS,textAlign:"right",width:130}}>Cumul {annee}</th><th style={{...thS,width:130}}></th></tr></thead><tbody>{epargne.sort((a,b)=>(a.fields?.ordre||0)-(b.fields?.ordre||0)).map(ep=>{const em=getEM(ep.id,mois);const cumul=emByYear.filter(r=>{const l=r.fields?.epargne_id;return(Array.isArray(l)?l[0]:l)===ep.id;}).reduce((s,r)=>s+(r.fields?.montant||0),0);return<EpRow key={ep.id} ep={ep} montant={em?.montant||0} cumul={cumul} tdS={tdS} iS={iS} bP={bP} bG={bG} bD={bD} onSave={async v=>{await save(async()=>{if(em?.id){await updateRecord("Epargne_montants",em.id,{montant:v});setEpargneMontants(p=>p.map(r=>r.id===em.id?{...r,fields:{...r.fields,montant:v}}:r));}});}} onDelete={()=>setDelEpargne(ep)}/>;})}</tbody><tfoot><tr style={{fontWeight:700}}><td style={tdS} colSpan={2}><span style={{fontFamily:"'DM Serif Display',serif"}}>Total</span></td><td style={{...tdS,textAlign:"right"}}>{fmt(totalEpMois(mois))}</td><td style={{...tdS,textAlign:"right"}}>{fmt(emByYear.reduce((s,r)=>s+(r.fields?.montant||0),0))}</td><td style={tdS}/></tr></tfoot></table></div>
    </div>}

    {/* OBJECTIFS */}
    {tab==="objectifs"&&<div className="fade-up" style={CS}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,margin:"0 0 20px"}}>Objectifs {annee}</h3><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={thS}>Type</th><th style={{...thS,textAlign:"right",width:150}}>Objectif</th><th style={{...thS,textAlign:"right",width:150}}>Réalisé</th><th style={{...thS,width:200}}>Progression</th><th style={{...thS,width:130}}></th></tr></thead><tbody>{objectifs.map(obj=><ObjRow key={obj.id} obj={obj} epargne={epargne} emByYear={emByYear} tdS={tdS} iS={iS} bP={bP} bG={bG} bD={bD} onSave={async v=>{await save(async()=>{await updateRecord("Objectifs",obj.id,{objectif_annuel:v});setObjectifs(p=>p.map(r=>r.id===obj.id?{...r,fields:{...r.fields,objectif_annuel:v}}:r));});}} onDelete={()=>setDelObjectif(obj)}/>)}</tbody></table></div>}

    {/* VIREMENTS */}
    {tab==="virements"&&<div className="fade-up"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,margin:0}}>Virements compte commun — {MOIS_FULL[mois]} {annee}</h3><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{MOIS.map((m,i)=><button key={i} className="btn-press" style={mB(mois===i)} onClick={()=>setMois(i)}>{m}</button>)}</div></div><VirementCalcul charges={charges} chargesMontants={chargesMontants} revenus={revenus} annee={annee} mois={mois}/></div>}

    {/* SIMULATEUR IR */}
    {tab==="impots"&&<div className="fade-up"><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,marginBottom:20}}>Simulateur Impôt sur le Revenu</h3><TaxSimulator/></div>}

    {/* ASSISTANT IA */}
    {tab==="assistant"&&<div className="fade-up" style={CS}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,marginBottom:16}}>Assistant budgétaire IA</h3><AIAssistant revenus={revenus} charges={charges} chargesMontants={chargesMontants} epargne={epargne} epargneMontants={epargneMontants} objectifs={objectifs} annee={annee}/></div>}

    {/* ALERTES */}
    {tab==="alertes"&&<div className="fade-up"><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,marginBottom:16}}>Alertes {annee}</h3><Alerts revenus={revenus} chargesMontants={chargesMontants} epargneMontants={epargneMontants} annee={annee} mois={mois}/></div>}

    </div>
    <div style={{textAlign:"center",padding:"40px 0 24px",color:"#c4c0b8",fontSize:11}}>Budget Familial Tchamfong · {new Date().getFullYear()}</div>
  </div>

  {/* MODALS */}
  {showAddCharge&&<AddChgModal cats={Object.keys(chargesByCat)} onClose={()=>setShowAddCharge(false)} onAdd={async d=>{await save(async()=>{const res=await createRecord("Charges",{description:d.description,categorie:d.categorie,compte:d.compte,ordre:charges.length+1});const nid=res.records[0].id;for(let m=0;m<12;m++)await createRecord("Charges_Montants",{mois:m+1,annee,lionel:d.moisList.includes(m)?d.lionel:0,ophelie:d.moisList.includes(m)?d.ophelie:0,charge_id:[nid]});await loadData();});setShowAddCharge(false);}}/>}
  {showAddEpargne&&<AddEpModal onClose={()=>setShowAddEpargne(false)} onAdd={async d=>{await save(async()=>{const res=await createRecord("Epargne",{type:d.type,beneficiaire:d.beneficiaire,ordre:epargne.length+1});const nid=res.records[0].id;for(let m=1;m<=12;m++)await createRecord("Epargne_montants",{mois:m,annee,montant:0,epargne_id:[nid]});if(d.objectif>0)await createRecord("Objectifs",{type:`${d.type} ${d.beneficiaire}`,objectif_annuel:d.objectif});await loadData();});setShowAddEpargne(false);}}/>}
  {delCharge&&<DeleteChargeModal charge={delCharge} onClose={()=>setDelCharge(null)} onDelete={handleDeleteCharge}/>}
  {delEpargne&&<ConfirmModal title="Supprimer un type d'épargne" message={`Supprimer "${delEpargne.fields?.type} — ${delEpargne.fields?.beneficiaire}" et tous ses montants ?`} onCancel={()=>setDelEpargne(null)} onConfirm={handleDeleteEpargne} confirmLabel="Supprimer"/>}
  {delObjectif&&<ConfirmModal title="Supprimer un objectif" message={`Supprimer l'objectif "${delObjectif.fields?.type}" ?`} onCancel={()=>setDelObjectif(null)} onConfirm={handleDeleteObjectif} confirmLabel="Supprimer"/>}
  {initYearTarget&&<InitYearModal targetYear={initYearTarget} prevYear={initYearTarget-1} onClose={()=>setInitYearTarget(null)} onInit={doInitYear}/>}
  </>);
}

// === ROW COMPONENTS ===
function EditRow({label,a:initA,b:initB,onSave,tdS,iS,bP,bG}){const[ed,setEd]=useState(false);const[a,setA]=useState(initA);const[b,setB]=useState(initB);useEffect(()=>{setA(initA);setB(initB);},[initA,initB]);return(<tr className="row-hover" style={{background:ed?"#fdfbf5":"transparent"}}><td style={{...tdS,fontWeight:600}}>{label}</td><td style={{...tdS,textAlign:"right"}}>{ed?<input style={iS} type="number" value={a} onChange={e=>setA(+e.target.value)}/>:<span style={{fontVariantNumeric:"tabular-nums"}}>{fmt(initA)}</span>}</td><td style={{...tdS,textAlign:"right"}}>{ed?<input style={iS} type="number" value={b} onChange={e=>setB(+e.target.value)}/>:<span style={{fontVariantNumeric:"tabular-nums"}}>{fmt(initB)}</span>}</td><td style={{...tdS,textAlign:"right",fontWeight:700}}>{fmt((ed?a:initA)+(ed?b:initB))}</td><td style={tdS}>{ed?<div style={{display:"flex",gap:6}}><button className="btn-press" style={bP} onClick={()=>{onSave(a,b);setEd(false);}}>OK</button><button className="btn-press" style={bG} onClick={()=>{setA(initA);setB(initB);setEd(false);}}>X</button></div>:<button className="btn-press" style={bG} onClick={()=>setEd(true)}>Modifier</button>}</td></tr>);}

function ChgRow({charge,l:initL,o:initO,onSave,onDelete,onUpdateCompte,tdS,iS,bP,bG,bD}){const[ed,setEd]=useState(false);const[l,setL]=useState(initL);const[o,setO]=useState(initO);const[compte,setCompte]=useState(charge.fields?.compte||"Commun");useEffect(()=>{setL(initL);setO(initO);setCompte(charge.fields?.compte||"Commun");},[initL,initO,charge.fields?.compte]);return(<tr className="row-hover" style={{background:ed?"#fdfbf5":"transparent"}}><td style={tdS}>{charge.fields?.description}</td><td style={tdS}>{ed?<div style={{display:"flex",gap:4}}>{["Commun","Perso"].map(c=><button key={c} className="btn-press" onClick={()=>setCompte(c)} style={{padding:"3px 8px",border:compte===c?"2px solid #1a1a2e":"1px solid #ddd8d0",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:compte===c?700:400,background:compte===c?"rgba(26,26,46,0.04)":"#fff",color:compte===c?"#1a1a2e":"#8a8578"}}>{c}</button>)}</div>:<span style={{display:"inline-block",padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,letterSpacing:"0.04em",background:charge.fields?.compte==="Perso"?"#fef2f2":"#eff6ff",color:charge.fields?.compte==="Perso"?"#b91c1c":"#1e40af",textTransform:"uppercase"}}>{charge.fields?.compte||"Commun"}</span>}</td><td style={{...tdS,textAlign:"right"}}>{ed?<input style={iS} type="number" value={l} onChange={e=>setL(+e.target.value)}/>:<span style={{fontVariantNumeric:"tabular-nums"}}>{fmt(initL)}</span>}</td><td style={{...tdS,textAlign:"right"}}>{ed?<input style={iS} type="number" value={o} onChange={e=>setO(+e.target.value)}/>:<span style={{fontVariantNumeric:"tabular-nums"}}>{fmt(initO)}</span>}</td><td style={{...tdS,textAlign:"right",fontWeight:700}}>{fmt((ed?l:initL)+(ed?o:initO))}</td><td style={tdS}><div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>{ed?<><button className="btn-press" style={bP} onClick={()=>{onSave(l,o,compte);setEd(false);}}>OK</button><button className="btn-press" style={bG} onClick={()=>{setL(initL);setO(initO);setCompte(charge.fields?.compte||"Commun");setEd(false);}}>X</button></>:<><button className="btn-press" style={{...bG,padding:"6px 12px",fontSize:11}} onClick={()=>setEd(true)}>Modifier</button><button className="btn-press" style={bD} onClick={onDelete}>Suppr.</button></>}</div></td></tr>);}

function EpRow({ep,montant,cumul,onSave,onDelete,tdS,iS,bP,bG,bD}){const[ed,setEd]=useState(false);const[v,setV]=useState(montant);useEffect(()=>{setV(montant);},[montant]);return(<tr className="row-hover" style={{background:ed?"#fdfbf5":"transparent"}}><td style={{...tdS,fontWeight:600}}>{ep.fields?.type}</td><td style={tdS}>{ep.fields?.beneficiaire}</td><td style={{...tdS,textAlign:"right"}}>{ed?<input style={iS} type="number" value={v} onChange={e=>setV(+e.target.value)}/>:<span style={{fontVariantNumeric:"tabular-nums"}}>{fmt(montant)}</span>}</td><td style={{...tdS,textAlign:"right",color:"#8a8578"}}>{fmt(cumul)}</td><td style={tdS}><div style={{display:"flex",gap:6}}>{ed?<><button className="btn-press" style={bP} onClick={()=>{onSave(v);setEd(false);}}>OK</button><button className="btn-press" style={bG} onClick={()=>{setV(montant);setEd(false);}}>X</button></>:<><button className="btn-press" style={bG} onClick={()=>setEd(true)}>Modifier</button><button className="btn-press" style={bD} onClick={onDelete}>Suppr.</button></>}</div></td></tr>);}

function ObjRow({obj,epargne,emByYear,onSave,onDelete,tdS,iS,bP,bG,bD}){const[ed,setEd]=useState(false);const[v,setV]=useState(obj.fields?.objectif_annuel||0);const type=obj.fields?.type||"";const actual=emByYear.reduce((s,em)=>{const e=epargne.find(e=>{const l=em.fields?.epargne_id;return(Array.isArray(l)?l[0]:l)===e.id;});if(!e)return s;if(type.includes(e.fields.type)&&(type.includes(e.fields.beneficiaire)||type.includes("Commun")))return s+(em.fields.montant||0);return s;},0);const pct=v>0?(actual/v)*100:0;return(<tr className="row-hover" style={{background:ed?"#fdfbf5":"transparent"}}><td style={{...tdS,fontWeight:600}}>{type}</td><td style={{...tdS,textAlign:"right"}}>{ed?<input style={iS} type="number" value={v} onChange={e=>setV(+e.target.value)}/>:fmt(obj.fields?.objectif_annuel)}</td><td style={{...tdS,textAlign:"right"}}>{fmt(actual)}</td><td style={tdS}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,height:6,borderRadius:3,background:"#f2efeb",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:pct>=100?"linear-gradient(90deg,#15803d,#22c55e)":"linear-gradient(90deg,#1a1a2e,#44427a)",borderRadius:3,transition:"width .6s cubic-bezier(.4,0,.2,1)"}}/></div><span style={{fontSize:11,fontWeight:700,color:pct>=100?"#15803d":"#1a1a2e",minWidth:36,textAlign:"right"}}>{pct.toFixed(0)}%</span></div></td><td style={tdS}><div style={{display:"flex",gap:6}}>{ed?<><button className="btn-press" style={bP} onClick={()=>{onSave(v);setEd(false);}}>OK</button><button className="btn-press" style={bG} onClick={()=>{setV(obj.fields?.objectif_annuel||0);setEd(false);}}>X</button></>:<><button className="btn-press" style={bG} onClick={()=>setEd(true)}>Modifier</button><button className="btn-press" style={bD} onClick={onDelete}>Suppr.</button></>}</div></td></tr>);}
