"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const AIRTABLE_TOKEN = process.env.NEXT_PUBLIC_AIRTABLE_TOKEN;
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const API = `https://api.airtable.com/v0/${BASE_ID}`;
const HEADERS = { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" };
const AUTHORIZED_EMAILS = ["tchamfong@gmail.com", "ophelie.linde@gmail.com"];
const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const MOIS_FULL = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const CAT_COLORS = {"LOGEMENT":"#2563eb","MAISON":"#7c3aed","VOITURE & TRANSPORT":"#ea580c","ABONNEMENTS":"#0891b2","SPORT & SANTÉ":"#16a34a","ENFANTS":"#db2777","DEPENSES EXEPTIONNELLES":"#dc2626","LOISIRS":"#ca8a04","ALIMENTAIRE":"#65a30d"};
const CHART_COLORS = ["#2563eb","#7c3aed","#ea580c","#0891b2","#16a34a","#db2777","#dc2626","#ca8a04","#65a30d"];
const fmt = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);

async function fetchAll(table){let all=[],offset=null;do{const url=`${API}/${encodeURIComponent(table)}?pageSize=100${offset?`&offset=${offset}`:""}`;const res=await fetch(url,{headers:HEADERS});const data=await res.json();all=all.concat(data.records||[]);offset=data.offset;}while(offset);return all;}
async function updateRecord(table,id,fields){return(await fetch(`${API}/${encodeURIComponent(table)}/${id}`,{method:"PATCH",headers:HEADERS,body:JSON.stringify({fields})})).json();}
async function createRecord(table,fields){return(await fetch(`${API}/${encodeURIComponent(table)}`,{method:"POST",headers:HEADERS,body:JSON.stringify({records:[{fields}]})})).json();}

function decodeJwt(t){try{return JSON.parse(atob(t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));}catch{return null;}}

const S={
  app:{fontFamily:"'Segoe UI',-apple-system,sans-serif",background:"#f8fafc",minHeight:"100vh",color:"#1e293b"},
  header:{background:"linear-gradient(135deg,#1e293b 0%,#334155 100%)",padding:"20px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12},
  headerTitle:{color:"#fff",fontSize:22,fontWeight:700,margin:0},
  headerSub:{color:"#94a3b8",fontSize:13,marginTop:2},
  nav:{display:"flex",gap:4,background:"#fff",padding:"8px 32px",borderBottom:"1px solid #e2e8f0",flexWrap:"wrap"},
  navBtn:a=>({padding:"8px 18px",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,background:a?"#2563eb":"transparent",color:a?"#fff":"#64748b"}),
  content:{maxWidth:1280,margin:"0 auto",padding:"24px 32px"},
  card:{background:"#fff",borderRadius:12,padding:20,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"},
  kpi:c=>({background:"#fff",borderRadius:12,padding:"16px 20px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0",borderLeft:`4px solid ${c}`,flex:1,minWidth:180}),
  kpiLabel:{fontSize:12,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5},
  kpiValue:c=>({fontSize:26,fontWeight:800,color:c,marginTop:4}),
  table:{width:"100%",borderCollapse:"collapse",fontSize:13},
  th:{textAlign:"left",padding:"10px 12px",borderBottom:"2px solid #e2e8f0",color:"#64748b",fontWeight:600,fontSize:11,textTransform:"uppercase",letterSpacing:0.5},
  td:{padding:"10px 12px",borderBottom:"1px solid #f1f5f9"},
  input:{padding:"6px 10px",border:"1px solid #d1d5db",borderRadius:6,fontSize:13,width:80,outline:"none",textAlign:"right"},
  inputFull:{padding:"8px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13,width:"100%",outline:"none",boxSizing:"border-box"},
  select:{padding:"8px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13,outline:"none",background:"#fff"},
  btn:(c="#2563eb")=>({padding:"8px 16px",background:c,color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}),
  btnOutline:{padding:"8px 16px",background:"transparent",color:"#64748b",border:"1px solid #d1d5db",borderRadius:8,cursor:"pointer",fontSize:13},
  badge:c=>({display:"inline-block",padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:600,background:`${c}15`,color:c}),
  progress:{height:8,borderRadius:4,background:"#e2e8f0",overflow:"hidden"},
  progressBar:(pct,c)=>({height:"100%",width:`${Math.min(pct,100)}%`,background:c,borderRadius:4,transition:"width 0.5s"}),
  monthBtn:a=>({padding:"6px 12px",border:a?"2px solid #2563eb":"1px solid #d1d5db",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:a?700:400,background:a?"#eff6ff":"#fff",color:a?"#2563eb":"#64748b"}),
  modal:{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000},
  modalContent:{background:"#fff",borderRadius:16,padding:28,maxWidth:500,width:"90%",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"},
  tag:c=>({display:"inline-block",padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:600,background:c+"18",color:c,marginRight:6}),
  loading:{display:"flex",alignItems:"center",justifyContent:"center",height:300,color:"#94a3b8",fontSize:16},
  saving:{position:"fixed",bottom:20,right:20,background:"#16a34a",color:"#fff",padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:600,boxShadow:"0 4px 12px rgba(0,0,0,0.15)",zIndex:2000},
  loginPage:{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%)"},
  loginCard:{background:"#fff",borderRadius:20,padding:"48px 40px",boxShadow:"0 20px 60px rgba(0,0,0,0.08)",textAlign:"center",maxWidth:400,width:"90%"},
  yearBtn:a=>({padding:"4px 12px",border:"none",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:a?700:400,background:a?"#fff":"transparent",color:a?"#2563eb":"#94a3b8",boxShadow:a?"0 1px 3px rgba(0,0,0,0.1)":"none"}),
  avatar:{width:32,height:32,borderRadius:"50%",objectFit:"cover"},
};

function LoginPage({onLogin}){
  useEffect(()=>{
    const s=document.createElement("script");s.src="https://accounts.google.com/gsi/client";s.async=true;
    s.onload=()=>{window.google?.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:r=>{
      const p=decodeJwt(r.credential);
      if(p&&AUTHORIZED_EMAILS.includes(p.email)){localStorage.setItem("budget_user",JSON.stringify({email:p.email,name:p.name,picture:p.picture}));onLogin({email:p.email,name:p.name,picture:p.picture});}
      else alert("Accès refusé. Seuls les comptes autorisés peuvent se connecter.");
    }});window.google?.accounts.id.renderButton(document.getElementById("gsi-btn"),{theme:"outline",size:"large",width:320,text:"signin_with",shape:"pill"});};
    document.body.appendChild(s);return()=>{try{document.body.removeChild(s);}catch{}};
  },[onLogin]);
  return(<div style={S.loginPage}><div style={S.loginCard}>
    <div style={{fontSize:48,marginBottom:12}}>&#128176;</div>
    <div style={{fontSize:28,fontWeight:800,color:"#1e293b",marginBottom:4}}>Budget Familial</div>
    <div style={{fontSize:14,color:"#64748b",marginBottom:32}}>Lionel & Ophélie Tchamfong</div>
    <div id="gsi-btn" style={{display:"flex",justifyContent:"center"}}></div>
    <p style={{fontSize:12,color:"#94a3b8",marginTop:24}}>Accès réservé aux membres de la famille</p>
  </div></div>);
}

export default function BudgetApp(){
  const[user,setUser]=useState(null);
  const[authChecked,setAuthChecked]=useState(false);
  const[tab,setTab]=useState("dashboard");
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[mois,setMois]=useState(new Date().getMonth());
  const[annee,setAnnee]=useState(2026);
  const[chartType,setChartType]=useState("bar");
  const[revenus,setRevenus]=useState([]);
  const[charges,setCharges]=useState([]);
  const[chargesMontants,setChargesMontants]=useState([]);
  const[epargne,setEpargne]=useState([]);
  const[epargneMontants,setEpargneMontants]=useState([]);
  const[objectifs,setObjectifs]=useState([]);
  const[showAddCharge,setShowAddCharge]=useState(false);
  const[showAddEpargne,setShowAddEpargne]=useState(false);

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

  const initYear=async y=>{if(revenus.some(r=>r.fields?.annee===y)){setAnnee(y);return;}if(!confirm(`Initialiser ${y} ? Les charges seront copiées avec des montants à 0.`))return;setSaving(true);try{for(let m=1;m<=12;m++)await createRecord("Revenus",{mois:m,annee:y,lionel:0,ophelie:0});for(const c of charges)for(let m=1;m<=12;m++)await createRecord("Charges_Montants",{mois:m,annee:y,lionel:0,ophelie:0,charge_id:[c.id]});for(const ep of epargne)for(let m=1;m<=12;m++)await createRecord("Epargne_montants",{mois:m,annee:y,montant:0,epargne_id:[ep.id]});await loadData();setAnnee(y);}catch(e){console.error(e);alert("Erreur");}setSaving(false);};

  if(!authChecked)return null;
  if(!user)return<LoginPage onLogin={setUser}/>;
  if(loading)return(<div style={S.app}><div style={S.header}><div><div style={S.headerTitle}>Budget Familial {annee}</div></div></div><div style={S.loading}>Chargement...</div></div>);

  const rev=getRevMois(mois),chg=totalChgMois(mois),ep=totalEpMois(mois),solde=(rev.lionel+rev.ophelie)-chg-ep;

  return(<div style={S.app}>
    {saving&&<div style={S.saving}>Sauvegarde...</div>}
    <div style={S.header}>
      <div><div style={S.headerTitle}>Budget Familial {annee}</div><div style={S.headerSub}>Lionel & Ophélie TCHAMFONG</div></div>
      <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:2,background:"#1e293b",borderRadius:8,padding:3}}>{availYears.map(y=><button key={y} style={S.yearBtn(annee===y)} onClick={()=>initYear(y)}>{y}</button>)}</div>
        <select value={mois} onChange={e=>setMois(+e.target.value)} style={{...S.select,background:"#334155",color:"#fff",border:"1px solid #475569"}}>{MOIS_FULL.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
        <div style={{display:"flex",alignItems:"center",gap:8}}>{user.picture&&<img src={user.picture} style={S.avatar} alt="" referrerPolicy="no-referrer"/>}<div><div style={{color:"#fff",fontSize:13,fontWeight:600}}>{user.name}</div><button onClick={logout} style={{background:"none",border:"none",color:"#94a3b8",fontSize:11,cursor:"pointer",padding:0}}>Déconnexion</button></div></div>
      </div>
    </div>
    <div style={S.nav}>{[["dashboard","Tableau de bord"],["revenus","Revenus"],["charges","Charges"],["epargne","Épargne"],["objectifs","Objectifs"]].map(([k,l])=><button key={k} style={S.navBtn(tab===k)} onClick={()=>setTab(k)}>{l}</button>)}</div>
    <div style={S.content}>

    {tab==="dashboard"&&<div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        <div style={S.kpi("#2563eb")}><div style={S.kpiLabel}>Revenus</div><div style={S.kpiValue("#2563eb")}>{fmt(rev.lionel+rev.ophelie)}</div></div>
        <div style={S.kpi("#dc2626")}><div style={S.kpiLabel}>Charges</div><div style={S.kpiValue("#dc2626")}>{fmt(chg)}</div></div>
        <div style={S.kpi("#7c3aed")}><div style={S.kpiLabel}>Épargne</div><div style={S.kpiValue("#7c3aed")}>{fmt(ep)}</div></div>
        <div style={S.kpi(solde>=0?"#16a34a":"#dc2626")}><div style={S.kpiLabel}>Solde net</div><div style={S.kpiValue(solde>=0?"#16a34a":"#dc2626")}>{fmt(solde)}</div></div>
      </div>
      <div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{margin:0,fontSize:16,fontWeight:700}}>Évolution {annee}</h3><div style={{display:"flex",gap:4}}>{[["bar","Barres"],["line","Lignes"],["area","Aires"]].map(([t,l])=><button key={t} style={{...S.navBtn(chartType===t),fontSize:12,padding:"4px 12px"}} onClick={()=>setChartType(t)}>{l}</button>)}</div></div>
        <ResponsiveContainer width="100%" height={280}>{chartType==="bar"?<BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="mois" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:12}}/><Bar dataKey="revenus" fill="#2563eb" name="Revenus" radius={[4,4,0,0]}/><Bar dataKey="charges" fill="#dc2626" name="Charges" radius={[4,4,0,0]}/><Bar dataKey="epargne" fill="#7c3aed" name="Épargne" radius={[4,4,0,0]}/></BarChart>:chartType==="line"?<LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="mois" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:12}}/><Line type="monotone" dataKey="revenus" stroke="#2563eb" strokeWidth={2} name="Revenus"/><Line type="monotone" dataKey="charges" stroke="#dc2626" strokeWidth={2} name="Charges"/><Line type="monotone" dataKey="epargne" stroke="#7c3aed" strokeWidth={2} name="Épargne"/></LineChart>:<AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="mois" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:12}}/><Area type="monotone" dataKey="revenus" fill="#2563eb" fillOpacity={0.15} stroke="#2563eb" strokeWidth={2} name="Revenus"/><Area type="monotone" dataKey="charges" fill="#dc2626" fillOpacity={0.15} stroke="#dc2626" strokeWidth={2} name="Charges"/><Area type="monotone" dataKey="epargne" fill="#7c3aed" fillOpacity={0.15} stroke="#7c3aed" strokeWidth={2} name="Épargne"/></AreaChart>}</ResponsiveContainer></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div style={S.card}><h3 style={{margin:"0 0 12px",fontSize:16,fontWeight:700}}>Charges — {MOIS_FULL[mois]}</h3><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} style={{fontSize:10}}>{pieData.map((e,i)=><Cell key={i} fill={CAT_COLORS[e.name]||CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><Tooltip formatter={v=>fmt(v)}/></PieChart></ResponsiveContainer></div>
        <div style={S.card}><h3 style={{margin:"0 0 12px",fontSize:16,fontWeight:700}}>Objectifs {annee}</h3><div style={{display:"flex",flexDirection:"column",gap:14}}>{objectifs.map(obj=>{const type=obj.fields?.type||"",target=obj.fields?.objectif_annuel||0;const actual=emByYear.reduce((s,em)=>{const e=epargne.find(e=>{const l=em.fields?.epargne_id;return(Array.isArray(l)?l[0]:l)===e.id;});if(!e)return s;if(type.includes(e.fields.type)&&(type.includes(e.fields.beneficiaire)||type.includes("Commun")))return s+(em.fields.montant||0);return s;},0);const pct=target>0?(actual/target)*100:0;return(<div key={obj.id}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{fontWeight:600}}>{type}</span><span style={{color:"#64748b"}}>{fmt(actual)} / {fmt(target)}</span></div><div style={S.progress}><div style={S.progressBar(pct,pct>=100?"#16a34a":"#2563eb")}/></div></div>);})}</div></div>
      </div>
    </div>}

    {tab==="revenus"&&<div style={S.card}><h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:700}}>Revenus {annee}</h3><table style={S.table}><thead><tr><th style={S.th}>Mois</th><th style={{...S.th,textAlign:"right"}}>Lionel</th><th style={{...S.th,textAlign:"right"}}>Ophélie</th><th style={{...S.th,textAlign:"right"}}>Total</th><th style={{...S.th,width:80}}></th></tr></thead><tbody>{MOIS_FULL.map((m,i)=>{const r=getRevMois(i);return<EditRow key={i} label={m} a={r.lionel} b={r.ophelie} onSave={async(a,b)=>{await save(async()=>{if(r.id){await updateRecord("Revenus",r.id,{lionel:a,ophelie:b});setRevenus(p=>p.map(x=>x.id===r.id?{...x,fields:{...x.fields,lionel:a,ophelie:b}}:x));}});}}/>})}</tbody><tfoot><tr style={{fontWeight:700,background:"#f8fafc"}}><td style={S.td}>Total</td><td style={{...S.td,textAlign:"right"}}>{fmt(revByYear.reduce((s,r)=>s+(r.fields?.lionel||0),0))}</td><td style={{...S.td,textAlign:"right"}}>{fmt(revByYear.reduce((s,r)=>s+(r.fields?.ophelie||0),0))}</td><td style={{...S.td,textAlign:"right"}}>{fmt(revByYear.reduce((s,r)=>s+(r.fields?.lionel||0)+(r.fields?.ophelie||0),0))}</td><td style={S.td}></td></tr></tfoot></table></div>}

    {tab==="charges"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><h3 style={{margin:0,fontSize:16,fontWeight:700}}>Charges — {MOIS_FULL[mois]} {annee}</h3><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{MOIS.map((m,i)=><button key={i} style={S.monthBtn(mois===i)} onClick={()=>setMois(i)}>{m}</button>)}</div><button style={S.btn("#16a34a")} onClick={()=>setShowAddCharge(true)}>+ Ajouter</button></div></div>
      {Object.entries(chargesByCat).map(([cat,chgs])=>{const catT=chgs.reduce((s,c)=>{const cm=getCM(c.id,mois);return s+(cm?cm.lionel+cm.ophelie:0);},0);return(<div key={cat} style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={S.tag(CAT_COLORS[cat]||"#64748b")}>{cat}</div><span style={{fontWeight:700,fontSize:14}}>{fmt(catT)}</span></div><table style={S.table}><thead><tr><th style={S.th}>Description</th><th style={{...S.th,width:70}}>Compte</th><th style={{...S.th,textAlign:"right",width:100}}>Lionel</th><th style={{...S.th,textAlign:"right",width:100}}>Ophélie</th><th style={{...S.th,textAlign:"right",width:120}}>Total</th></tr></thead><tbody>{chgs.map(c=>{const cm=getCM(c.id,mois);return<ChgRow key={c.id} charge={c} l={cm?.lionel||0} o={cm?.ophelie||0} onSave={async(l,o)=>{await save(async()=>{if(cm?.id){await updateRecord("Charges_Montants",cm.id,{lionel:l,ophelie:o});setChargesMontants(p=>p.map(r=>r.id===cm.id?{...r,fields:{...r.fields,lionel:l,ophelie:o}}:r));}});}}/>;})}</tbody></table></div>);})}
    </div>}

    {tab==="epargne"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><h3 style={{margin:0,fontSize:16,fontWeight:700}}>Épargne — {MOIS_FULL[mois]} {annee}</h3><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{MOIS.map((m,i)=><button key={i} style={S.monthBtn(mois===i)} onClick={()=>setMois(i)}>{m}</button>)}</div><button style={S.btn("#16a34a")} onClick={()=>setShowAddEpargne(true)}>+ Ajouter</button></div></div>
      <div style={S.card}><table style={S.table}><thead><tr><th style={S.th}>Type</th><th style={S.th}>Bénéficiaire</th><th style={{...S.th,textAlign:"right",width:120}}>Montant</th><th style={{...S.th,textAlign:"right",width:120}}>Cumul {annee}</th><th style={{...S.th,width:80}}></th></tr></thead><tbody>{epargne.sort((a,b)=>(a.fields?.ordre||0)-(b.fields?.ordre||0)).map(ep=>{const em=getEM(ep.id,mois);const cumul=emByYear.filter(r=>{const l=r.fields?.epargne_id;return(Array.isArray(l)?l[0]:l)===ep.id;}).reduce((s,r)=>s+(r.fields?.montant||0),0);return<EpRow key={ep.id} ep={ep} montant={em?.montant||0} cumul={cumul} onSave={async v=>{await save(async()=>{if(em?.id){await updateRecord("Epargne_montants",em.id,{montant:v});setEpargneMontants(p=>p.map(r=>r.id===em.id?{...r,fields:{...r.fields,montant:v}}:r));}});}}/>;})}</tbody><tfoot><tr style={{fontWeight:700,background:"#f8fafc"}}><td style={S.td} colSpan={2}>Total</td><td style={{...S.td,textAlign:"right"}}>{fmt(totalEpMois(mois))}</td><td style={{...S.td,textAlign:"right"}}>{fmt(emByYear.reduce((s,r)=>s+(r.fields?.montant||0),0))}</td><td style={S.td}></td></tr></tfoot></table></div>
    </div>}

    {tab==="objectifs"&&<div style={S.card}><h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:700}}>Objectifs {annee}</h3><table style={S.table}><thead><tr><th style={S.th}>Type</th><th style={{...S.th,textAlign:"right",width:150}}>Objectif</th><th style={{...S.th,textAlign:"right",width:150}}>Réalisé</th><th style={{...S.th,width:200}}>Progression</th><th style={{...S.th,width:80}}></th></tr></thead><tbody>{objectifs.map(obj=><ObjRow key={obj.id} obj={obj} epargne={epargne} emByYear={emByYear} onSave={async v=>{await save(async()=>{await updateRecord("Objectifs",obj.id,{objectif_annuel:v});setObjectifs(p=>p.map(r=>r.id===obj.id?{...r,fields:{...r.fields,objectif_annuel:v}}:r));});}}/>)}</tbody></table></div>}

    </div>

    {showAddCharge&&<AddChgModal cats={Object.keys(chargesByCat)} onClose={()=>setShowAddCharge(false)} onAdd={async d=>{await save(async()=>{const res=await createRecord("Charges",{description:d.description,categorie:d.categorie,compte:d.compte,ordre:charges.length+1});const nid=res.records[0].id;for(let m=0;m<12;m++)await createRecord("Charges_Montants",{mois:m+1,annee,lionel:d.moisList.includes(m)?d.lionel:0,ophelie:d.moisList.includes(m)?d.ophelie:0,charge_id:[nid]});await loadData();});setShowAddCharge(false);}}/>}
    {showAddEpargne&&<AddEpModal onClose={()=>setShowAddEpargne(false)} onAdd={async d=>{await save(async()=>{const res=await createRecord("Epargne",{type:d.type,beneficiaire:d.beneficiaire,ordre:epargne.length+1});const nid=res.records[0].id;for(let m=1;m<=12;m++)await createRecord("Epargne_montants",{mois:m,annee,montant:0,epargne_id:[nid]});if(d.objectif>0)await createRecord("Objectifs",{type:`${d.type} ${d.beneficiaire}`,objectif_annuel:d.objectif});await loadData();});setShowAddEpargne(false);}}/>}
  </div>);
}

// === ROW COMPONENTS ===
function EditRow({label,a:initA,b:initB,onSave}){const[ed,setEd]=useState(false);const[a,setA]=useState(initA);const[b,setB]=useState(initB);useEffect(()=>{setA(initA);setB(initB);},[initA,initB]);return(<tr style={{background:ed?"#fffbeb":"transparent"}}><td style={{...S.td,fontWeight:600}}>{label}</td><td style={{...S.td,textAlign:"right"}}>{ed?<input style={S.input} type="number" value={a} onChange={e=>setA(+e.target.value)}/>:fmt(initA)}</td><td style={{...S.td,textAlign:"right"}}>{ed?<input style={S.input} type="number" value={b} onChange={e=>setB(+e.target.value)}/>:fmt(initB)}</td><td style={{...S.td,textAlign:"right",fontWeight:600}}>{fmt((ed?a:initA)+(ed?b:initB))}</td><td style={S.td}>{ed?<div style={{display:"flex",gap:4}}><button style={S.btn("#16a34a")} onClick={()=>{onSave(a,b);setEd(false);}}>OK</button><button style={S.btnOutline} onClick={()=>{setA(initA);setB(initB);setEd(false);}}>X</button></div>:<button style={S.btnOutline} onClick={()=>setEd(true)}>Modifier</button>}</td></tr>);}

function ChgRow({charge,l:initL,o:initO,onSave}){const[ed,setEd]=useState(false);const[l,setL]=useState(initL);const[o,setO]=useState(initO);useEffect(()=>{setL(initL);setO(initO);},[initL,initO]);return(<tr style={{background:ed?"#fffbeb":"transparent"}}><td style={S.td}>{charge.fields?.description}</td><td style={S.td}><span style={S.badge(charge.fields?.compte==="Perso"?"#ea580c":"#2563eb")}>{charge.fields?.compte||"Commun"}</span></td><td style={{...S.td,textAlign:"right"}}>{ed?<input style={S.input} type="number" value={l} onChange={e=>setL(+e.target.value)}/>:fmt(initL)}</td><td style={{...S.td,textAlign:"right"}}>{ed?<input style={S.input} type="number" value={o} onChange={e=>setO(+e.target.value)}/>:fmt(initO)}</td><td style={{...S.td,textAlign:"right"}}>{ed?<div style={{display:"flex",gap:4,justifyContent:"flex-end"}}><button style={S.btn("#16a34a")} onClick={()=>{onSave(l,o);setEd(false);}}>OK</button><button style={S.btnOutline} onClick={()=>{setL(initL);setO(initO);setEd(false);}}>X</button></div>:<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>{fmt(initL+initO)}</span><button style={{...S.btnOutline,padding:"4px 10px",fontSize:11}} onClick={()=>setEd(true)}>Modifier</button></div>}</td></tr>);}

function EpRow({ep,montant,cumul,onSave}){const[ed,setEd]=useState(false);const[v,setV]=useState(montant);useEffect(()=>{setV(montant);},[montant]);return(<tr style={{background:ed?"#fffbeb":"transparent"}}><td style={{...S.td,fontWeight:600}}>{ep.fields?.type}</td><td style={S.td}>{ep.fields?.beneficiaire}</td><td style={{...S.td,textAlign:"right"}}>{ed?<input style={S.input} type="number" value={v} onChange={e=>setV(+e.target.value)}/>:fmt(montant)}</td><td style={{...S.td,textAlign:"right",color:"#64748b"}}>{fmt(cumul)}</td><td style={S.td}>{ed?<div style={{display:"flex",gap:4}}><button style={S.btn("#16a34a")} onClick={()=>{onSave(v);setEd(false);}}>OK</button><button style={S.btnOutline} onClick={()=>{setV(montant);setEd(false);}}>X</button></div>:<button style={S.btnOutline} onClick={()=>setEd(true)}>Modifier</button>}</td></tr>);}

function ObjRow({obj,epargne,emByYear,onSave}){const[ed,setEd]=useState(false);const[v,setV]=useState(obj.fields?.objectif_annuel||0);const type=obj.fields?.type||"";const actual=emByYear.reduce((s,em)=>{const e=epargne.find(e=>{const l=em.fields?.epargne_id;return(Array.isArray(l)?l[0]:l)===e.id;});if(!e)return s;if(type.includes(e.fields.type)&&(type.includes(e.fields.beneficiaire)||type.includes("Commun")))return s+(em.fields.montant||0);return s;},0);const pct=v>0?(actual/v)*100:0;return(<tr style={{background:ed?"#fffbeb":"transparent"}}><td style={{...S.td,fontWeight:600}}>{type}</td><td style={{...S.td,textAlign:"right"}}>{ed?<input style={S.input} type="number" value={v} onChange={e=>setV(+e.target.value)}/>:fmt(obj.fields?.objectif_annuel)}</td><td style={{...S.td,textAlign:"right"}}>{fmt(actual)}</td><td style={S.td}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{...S.progress,flex:1}}><div style={S.progressBar(pct,pct>=100?"#16a34a":"#2563eb")}/></div><span style={{fontSize:12,fontWeight:600,color:pct>=100?"#16a34a":"#64748b",minWidth:40}}>{pct.toFixed(0)}%</span></div></td><td style={S.td}>{ed?<div style={{display:"flex",gap:4}}><button style={S.btn("#16a34a")} onClick={()=>{onSave(v);setEd(false);}}>OK</button><button style={S.btnOutline} onClick={()=>{setV(obj.fields?.objectif_annuel||0);setEd(false);}}>X</button></div>:<button style={S.btnOutline} onClick={()=>setEd(true)}>Modifier</button>}</td></tr>);}

// === MODALS ===
function AddChgModal({cats,onClose,onAdd}){const[desc,setDesc]=useState("");const[cat,setCat]=useState(cats[0]||"");const[newCat,setNewCat]=useState("");const[useNew,setUseNew]=useState(false);const[compte,setCompte]=useState("Commun");const[l,setL]=useState(0);const[o,setO]=useState(0);const[sel,setSel]=useState(Array.from({length:12},(_,i)=>i));const toggle=i=>setSel(p=>p.includes(i)?p.filter(m=>m!==i):[...p,i]);return(<div style={S.modal} onClick={onClose}><div style={S.modalContent} onClick={e=>e.stopPropagation()}><h3 style={{margin:"0 0 20px",fontSize:18,fontWeight:700}}>Ajouter une charge</h3><div style={{display:"flex",flexDirection:"column",gap:14}}><div><label style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:4,display:"block"}}>Description</label><input style={S.inputFull} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ex: Netflix"/></div><div><label style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:4,display:"block"}}>Catégorie</label><div style={{display:"flex",gap:8,alignItems:"center"}}>{!useNew?<select style={{...S.select,flex:1}} value={cat} onChange={e=>setCat(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select>:<input style={{...S.inputFull,flex:1}} value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Nouvelle catégorie"/>}<button style={S.btnOutline} onClick={()=>setUseNew(!useNew)}>{useNew?"Existante":"Nouvelle"}</button></div></div><div><label style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:4,display:"block"}}>Compte</label><select style={S.select} value={compte} onChange={e=>setCompte(e.target.value)}><option value="Commun">Commun</option><option value="Perso">Perso</option></select></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div><label style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:4,display:"block"}}>Montant Lionel</label><input style={S.inputFull} type="number" value={l} onChange={e=>setL(+e.target.value)}/></div><div><label style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:4,display:"block"}}>Montant Ophélie</label><input style={S.inputFull} type="number" value={o} onChange={e=>setO(+e.target.value)}/></div></div><div><label style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:6,display:"block"}}>Mois</label><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{MOIS.map((m,i)=><button key={i} style={S.monthBtn(sel.includes(i))} onClick={()=>toggle(i)}>{m}</button>)}</div></div><div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}><button style={S.btnOutline} onClick={onClose}>Annuler</button><button style={S.btn("#16a34a")} disabled={!desc} onClick={()=>onAdd({description:desc,categorie:useNew?newCat:cat,compte,lionel:l,ophelie:o,moisList:sel})}>Ajouter</button></div></div></div></div>);}

function AddEpModal({onClose,onAdd}){const[type,setType]=useState("");const[benef,setBenef]=useState("Lionel");const[obj,setObj]=useState(0);return(<div style={S.modal} onClick={onClose}><div style={S.modalContent} onClick={e=>e.stopPropagation()}><h3 style={{margin:"0 0 20px",fontSize:18,fontWeight:700}}>Ajouter un type d'épargne</h3><div style={{display:"flex",flexDirection:"column",gap:14}}><div><label style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:4,display:"block"}}>Type</label><input style={S.inputFull} value={type} onChange={e=>setType(e.target.value)} placeholder="Ex: PER, CTO..."/></div><div><label style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:4,display:"block"}}>Bénéficiaire</label><select style={S.select} value={benef} onChange={e=>setBenef(e.target.value)}>{["Lionel","Ophélie","Noémie","Alizée","Commun"].map(b=><option key={b}>{b}</option>)}</select></div><div><label style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:4,display:"block"}}>Objectif annuel</label><input style={S.inputFull} type="number" value={obj} onChange={e=>setObj(+e.target.value)}/></div><div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}><button style={S.btnOutline} onClick={onClose}>Annuler</button><button style={S.btn("#16a34a")} disabled={!type} onClick={()=>onAdd({type,beneficiaire:benef,objectif:obj})}>Ajouter</button></div></div></div></div>);}
