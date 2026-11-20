"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useFinary, PatrimoineTab, BudgetReelTab, ComptesTab, finaryContext } from "./FinaryTabs";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const fmt = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);

// === BARÈME IR 2026 (revenus 2025) ===
const IR_TRANCHES = [{min:0,max:11600,taux:0},{min:11600,max:29579,taux:0.11},{min:29579,max:84577,taux:0.30},{min:84577,max:181917,taux:0.41},{min:181917,max:Infinity,taux:0.45}];
const PLAFOND_QF = 1807;
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
  const partsBase = isCouple ? 2 : 1;
  const demiPartsSupp = (nbParts - partsBase) * 2;
  if (demiPartsSupp > 0) {
    const qfBase = revenuImposable / partsBase;
    let impotBase = 0;
    for (const t of IR_TRANCHES) { if (qfBase <= t.min) break; impotBase += (Math.min(qfBase, t.max) - t.min) * t.taux; }
    impotBase *= partsBase;
    const avantage = impotBase - impotBrut;
    const plafond = demiPartsSupp * PLAFOND_QF;
    if (avantage > plafond) impotBrut = impotBase - plafond;
  }
  const seuilDecote = isCouple ? 3277 : 1982;
  if (impotBrut > 0 && impotBrut < seuilDecote) {
    const forfait = isCouple ? DECOTE_COUPLE : DECOTE_SOLO;
    const decote = forfait - (impotBrut * DECOTE_TAUX);
    if (decote > 0) impotBrut = Math.max(0, impotBrut - decote);
  }
  return Math.round(impotBrut);
}

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
  @media(max-width:768px){
    .sim-grid{grid-template-columns:minmax(0,1fr)!important;}
    .sim-grid>div{min-width:0;}
    .sim-grid input,.sim-grid select{min-width:0;}
    .tax-grid{grid-template-columns:1fr!important;}
    .virement-grid{grid-template-columns:1fr!important;}
  }
  @media(max-width:640px){
    .grid-kpi{grid-template-columns:repeat(2,1fr);}
    .grid-2col{grid-template-columns:1fr;}
    .header-inner{height:auto;padding:12px 0;flex-direction:column;gap:10px;align-items:flex-start;}
    .header-right{flex-wrap:wrap;width:100%;gap:8px;}
    .content-wrap{padding:14px 10px;}
    .nav-wrap{padding:6px 10px;gap:3px;}
    .month-bar{gap:2px;}
    .section-header{flex-direction:column;align-items:flex-start;}
  }
  @media(max-width:400px){
    .grid-kpi{grid-template-columns:1fr;}
    .content-wrap{padding:10px 8px;}
  }
`}}/>);}

function LoginPage({onLogin}){
  useEffect(()=>{const s=document.createElement("script");s.src="https://accounts.google.com/gsi/client";s.async=true;s.onload=()=>{window.google?.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:async r=>{try{const res=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({credential:r.credential})});const d=await res.json().catch(()=>({}));if(res.ok&&d.user)onLogin(d.user);else alert(d.error||"Accès refusé.");}catch{alert("Connexion impossible. Réessaie.");}}});window.google?.accounts.id.renderButton(document.getElementById("gsi-btn"),{theme:"outline",size:"large",width:300,text:"signin_with",shape:"pill",logo_alignment:"center"});};document.body.appendChild(s);return()=>{try{document.body.removeChild(s);}catch{}};},[onLogin]);
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

// L'assistant ne s'appuie que sur les données réelles Finary. Le budget prévisionnel saisi dans Airtable
// en mars 2026 n'est plus modifiable sur le site : il n'est plus envoyé, pour éviter des réponses périmées.
function AIAssistant({finaryData}){
  const[msgs,setMsgs]=useState([{role:"assistant",content:"Bonjour ! Je réponds à partir de vos données Finary, mises à jour chaque dimanche : patrimoine, budget réel par mois, dépenses de la semaine, objectifs et prêt. Pour le marché immobilier, je consulte aussi les données publiques de data.gouv.fr (ventes DVF)."}]);
  const[input,setInput]=useState("");
  const[loading,setLoading]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const buildSystem=()=>{
    const today=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    const ctx=finaryContext(finaryData);
    return `Tu es l'assistant budgétaire de la famille Tchamfong (Lionel, Ophélie et leurs trois filles). Nous sommes le ${today}.
Règles :
- Pour les finances du foyer, appuie-toi uniquement sur les données réelles Finary ci-dessous. Il n'existe pas d'autre budget de référence.
- Si une donnée manque, dis-le clairement. N'invente aucun chiffre et ne fais pas passer une estimation pour une donnée.
- Distingue les mois complets du mois en cours, qui est partiel. Pour une enveloppe ou un budget mensuel, pars de la moyenne des derniers mois complets, pas d'un seul mois.
- Réponds en français, en texte simple : phrases courtes, listes avec des tirets si besoin, pas de tableau, pas de titre, pas de gras.

Données publiques (outils data.gouv.fr, lecture seule) :
- Sers-t'en seulement pour le marché immobilier ou une autre donnée publique, jamais pour les finances du foyer.
- Ventes immobilières : jeu « Demandes de valeurs foncières géolocalisées » (identifiant 5cc1b94a634f4165e96436c1). Liste ses ressources pour trouver le fichier de l'année voulue, puis interroge-le en filtrant sur code_commune et type_local = Maison, par pages de 50 lignes au plus. Ne télécharge jamais un fichier entier.
- Prix au m² = valeur_fonciere / surface_reelle_bati. Une même vente peut occuper plusieurs lignes (même id_mutation) : compte-la une seule fois.
- Codes des communes suivies : Sucy-en-Brie 94071, Maisons-Alfort 94046, Le Perreux-sur-Marne 94058, Bry-sur-Marne 94015, Créteil 94028, Fontenay-sous-Bois 94033.
- Donne toujours la source, la période et le nombre de ventes derrière un chiffre. Si ce nombre est faible, dis-le.
${ctx||"\nAucune donnée Finary n'a pu être chargée. Dis-le et propose de recharger la page."}`;
  };
  const send=async()=>{
    if(!input.trim()||loading)return;
    const userMsg={role:"user",content:input};
    setMsgs(p=>[...p,userMsg]);setInput("");setLoading(true);
    try{
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        system:buildSystem(),
        messages:[...msgs.filter(m=>m.role!=="assistant"||msgs.indexOf(m)>0).slice(-6),userMsg]
      })});
      const data=await res.json();
      if(data.error){setMsgs(p=>[...p,{role:"assistant",content:`⚠️ ${data.error}`}]);}
      else{
        const text=data.content?.map(c=>c.text||"").join("\n\n").trim()||"Désolé, je n'ai pas pu analyser vos données.";
        const source=data.datagouvIndisponible?"data.gouv.fr ne répondait pas : réponse sans les données publiques.":data.datagouv>0?`Données publiques consultées sur data.gouv.fr (${data.datagouv} requête${data.datagouv>1?"s":""}${data.datagouvErreurs?`, dont ${data.datagouvErreurs} en erreur`:""}).`:null;
        setMsgs(p=>[...p,{role:"assistant",content:text,source}]);
      }
    }catch(e){setMsgs(p=>[...p,{role:"assistant",content:"Erreur de connexion. Réessayez."}]);}
    setLoading(false);
  };
  const suggestions=["Quelle est notre enveloppe mensuelle ?","Où dépensons-nous le plus ce mois-ci ?","Quel est notre taux d'épargne réel ?","Prix des maisons vendues à Sucy-en-Brie en 2025 ?"];
  return(<div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 180px)",maxHeight:700}}>
    <div style={{flex:1,overflowY:"auto",padding:"20px 0",display:"flex",flexDirection:"column",gap:16}}>
      {msgs.map((m,i)=><div key={i} className="fade-up" style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
        <div style={{maxWidth:"80%",padding:"14px 18px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?"#1a1a2e":"#fff",color:m.role==="user"?"#faf9f7":"#1a1a2e",fontSize:14,lineHeight:1.6,boxShadow:"0 2px 8px rgba(0,0,0,0.04)",border:m.role==="user"?"none":"1px solid #e8e4dd",whiteSpace:"pre-wrap"}}>{m.content}{m.source&&<div style={{marginTop:10,paddingTop:8,borderTop:"1px solid #f2efeb",fontSize:11,color:"#8a8578",whiteSpace:"normal"}}>{m.source}</div>}</div>
      </div>)}
      {loading&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{padding:"14px 18px",borderRadius:"16px 16px 16px 4px",background:"#fff",border:"1px solid #e8e4dd",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></div></div>}
      <div ref={endRef}/>
    </div>
    {msgs.length<=1&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>{suggestions.map((s,i)=><button key={i} className="btn-press" onClick={()=>{setInput(s);}} style={{padding:"8px 14px",background:"#fff",border:"1px solid #ddd8d0",borderRadius:20,cursor:"pointer",fontSize:12,color:"#1a1a2e",fontWeight:500}}>{s}</button>)}</div>}
    <div style={{display:"flex",gap:10,padding:"16px 0",borderTop:"1px solid #e8e4dd"}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Posez une question sur votre budget..." style={{flex:1,padding:"12px 16px",border:"1px solid #ddd8d0",borderRadius:12,fontSize:14,outline:"none",background:"#fff",fontFamily:"'DM Sans',sans-serif"}}/>
      <button className="btn-press" onClick={send} disabled={loading||!input.trim()} style={{padding:"12px 24px",background:"#1a1a2e",color:"#faf9f7",border:"none",borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:600,opacity:loading||!input.trim()?.5:1}}>Envoyer</button>
    </div>
  </div>);
}

function TaxSimulator(){
  const[revL,setRevL]=useState(30000);
  const[revO,setRevO]=useState(50000);
  const[situation,setSituation]=useState("couple");
  const[enfants,setEnfants]=useState(2);
  const[donsAssoc,setDonsAssoc]=useState(0);
  const[emploiDomicile,setEmploiDomicile]=useState(0);
  const[gardeEnfants,setGardeEnfants]=useState(0);
  const[deficitFoncier,setDeficitFoncier]=useState(0);
  const[autresReductions,setAutresReductions]=useState(0);
  const[autresCredits,setAutresCredits]=useState(0);
  const[tauxPASL,setTauxPASL]=useState(0);
  const[tauxPASO,setTauxPASO]=useState(0);
  const[editPAS,setEditPAS]=useState(false);
  const[result,setResult]=useState(null);

  const calculate=()=>{
    const revTotal=revL+revO;
    const isCouple=situation==="couple";
    const partsBase=isCouple?2:1;
    const partsEnfants=enfants<=2?enfants*0.5:1+((enfants-2)*1);
    const nbParts=partsBase+partsEnfants;
    const impotBrut=calculerIR(revTotal,nbParts,isCouple);
    const redDons=Math.min(donsAssoc*0.66,revTotal*0.20);
    const redEmploi=Math.min(emploiDomicile*0.50,isCouple?12000:6000);
    const redGarde=Math.min(gardeEnfants*0.50,enfants*1150);
    const redDeficit=Math.min(deficitFoncier,10700);
    const totalReductions=redDons+redEmploi+redGarde+redDeficit+autresReductions;
    const totalCredits=autresCredits;
    const impotNet=Math.max(0,impotBrut-totalReductions);
    const solde=Math.max(0,impotNet)-totalCredits;
    const pasL=revL*(tauxPASL/100);
    const pasO=revO*(tauxPASO/100);
    const totalPAS=pasL+pasO;
    const soldeAPayerOuRestituer=Math.round(solde-totalPAS);
    const qf=revTotal/nbParts;
    let tmi=0;
    for(const t of IR_TRANCHES){if(qf>t.min)tmi=t.taux*100;}
    const detail=[];
    for(const t of IR_TRANCHES){
      if(qf<=t.min)break;
      const montant=((Math.min(qf,t.max)-t.min)*t.taux)*nbParts;
      detail.push({tranche:`${fmt(t.min)} — ${t.max===Infinity?"∞":fmt(t.max)}`,taux:`${(t.taux*100).toFixed(0)}%`,montant:Math.round(montant)});
    }
    const tauxMoyen=revTotal>0?((impotNet/revTotal)*100):0;
    const tauxPASSugL=revL>0&&revTotal>0?((impotNet*(revL/revTotal))/revL*100):0;
    const tauxPASSugO=revO>0&&revTotal>0?((impotNet*(revO/revTotal))/revO*100):0;
    setResult({impotBrut,totalReductions,impotNet,totalCredits,solde,totalPAS,pasL,pasO,soldeAPayerOuRestituer,tauxMoyen:tauxMoyen.toFixed(1),tmi:tmi.toFixed(0),nbParts,revTotal,detail,mensuel:Math.round(impotNet/12),tauxPASSugL:tauxPASSugL.toFixed(1),tauxPASSugO:tauxPASSugO.toFixed(1),redDons,redEmploi,redGarde,redDeficit});
  };
  useEffect(()=>{calculate();},[revL,revO,situation,enfants,donsAssoc,emploiDomicile,gardeEnfants,deficitFoncier,autresReductions,autresCredits,tauxPASL,tauxPASO]);

  const ls={fontSize:11,fontWeight:600,color:"#8a8578",marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:"0.05em"};
  const is={padding:"10px 14px",border:"1px solid #ddd8d0",borderRadius:10,fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",background:"#faf9f7",fontFamily:"'DM Sans',sans-serif",textAlign:"right"};
  const inputRow=(label,value,setter,hint)=>(
    <div key={label}>
      <label style={ls}>{label}</label>
      <input style={is} type="number" value={value} onChange={e=>setter(+e.target.value)} placeholder="0"/>
      {hint&&<div style={{fontSize:10,color:"#b8b4ac",marginTop:3}}>{hint}</div>}
    </div>
  );

  const soldePositif=(result?.soldeAPayerOuRestituer||0)>0;
  const soldeNeutre=(result?.soldeAPayerOuRestituer||0)===0;

  return(<div>
    <style dangerouslySetInnerHTML={{__html:`.tax-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;}@media(max-width:768px){.tax-grid{grid-template-columns:1fr!important;}}`}}/>
    <div className="tax-grid">
    {/* COLONNE GAUCHE */}
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      <div style={{background:"#fff",borderRadius:16,padding:24,border:"1px solid rgba(26,26,46,0.06)"}}>
        <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:18,marginBottom:16}}>📊 Paramètres fiscaux</h3>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {inputRow("Revenu net imposable — Lionel",revL,setRevL)}
          {inputRow("Revenu net imposable — Ophélie",revO,setRevO)}
          <div><label style={ls}>Situation</label><div style={{display:"flex",gap:8}}>{[["couple","Marié / Pacsé"],["solo","Célibataire"]].map(([v,l])=><button key={v} className="btn-press" onClick={()=>setSituation(v)} style={{flex:1,padding:"10px",border:situation===v?"2px solid #1a1a2e":"1px solid #ddd8d0",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:situation===v?700:400,background:situation===v?"rgba(26,26,46,0.04)":"#fff",color:situation===v?"#1a1a2e":"#8a8578"}}>{l}</button>)}</div></div>
          <div><label style={ls}>Enfants à charge</label><div style={{display:"flex",gap:6}}>{[0,1,2,3,4,5].map(n=><button key={n} className="btn-press" onClick={()=>setEnfants(n)} style={{width:42,height:42,border:enfants===n?"2px solid #1a1a2e":"1px solid #ddd8d0",borderRadius:10,cursor:"pointer",fontSize:15,fontWeight:enfants===n?700:400,background:enfants===n?"rgba(26,26,46,0.04)":"#fff",color:enfants===n?"#1a1a2e":"#8a8578"}}>{n}</button>)}</div></div>
          <div style={{padding:"10px 14px",background:"#f2efeb",borderRadius:10,fontSize:12,color:"#8a8578"}}>Barème IR 2026 (revenus 2025) — <strong style={{color:"#1a1a2e"}}>{result?.nbParts} parts fiscales</strong></div>
        </div>
      </div>

      <div style={{background:"#fff",borderRadius:16,padding:24,border:"1px solid rgba(26,26,46,0.06)"}}>
        <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:16,marginBottom:16}}>💚 Réductions & Crédits d&apos;impôt</h3>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {inputRow("Dons aux associations (€ versés)",donsAssoc,setDonsAssoc,"Réduction = 66% dans la limite de 20% du RNI"+(result?.redDons>0?` → ${fmt(result.redDons)}`:""))}
          {inputRow("Emploi à domicile (€ dépensés)",emploiDomicile,setEmploiDomicile,"Réduction = 50%, plafond 6 000€ (12 000€ couple)"+(result?.redEmploi>0?` → ${fmt(result.redEmploi)}`:""))}
          {inputRow("Garde enfants hors domicile (€)",gardeEnfants,setGardeEnfants,"Crédit = 50%, plafond 1 150€/enfant"+(result?.redGarde>0?` → ${fmt(result.redGarde)}`:""))}
          {inputRow("Déficit foncier (€)",deficitFoncier,setDeficitFoncier,"Réduction directe, plafond 10 700€/an"+(result?.redDeficit>0?` → ${fmt(result.redDeficit)}`:""))}
          {inputRow("Autres réductions (€)",autresReductions,setAutresReductions)}
          {inputRow("Autres crédits d'impôt (€)",autresCredits,setAutresCredits,"Remboursables si supérieur à l'impôt")}
          {(result?.totalReductions||0)>0&&<div style={{padding:"10px 14px",background:"#f0fdf4",borderRadius:10,fontSize:12,color:"#15803d",fontWeight:600}}>✓ Total réductions : {fmt(result.totalReductions)} → économie réelle sur l&apos;impôt</div>}
        </div>
      </div>

      <div style={{background:"#fff",borderRadius:16,padding:24,border:"1px solid rgba(26,26,46,0.06)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:16,margin:0}}>🏦 Prélèvement à la source (PAS)</h3>
          <button className="btn-press" onClick={()=>setEditPAS(p=>!p)} style={{padding:"6px 14px",background:editPAS?"#1a1a2e":"transparent",color:editPAS?"#faf9f7":"#8a8578",border:"1px solid #ddd8d0",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600}}>{editPAS?"Fermer":"Modifier"}</button>
        </div>
        {editPAS?(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={ls}>Taux PAS Lionel (%)</label>
              <input style={is} type="number" step="0.1" value={tauxPASL} onChange={e=>setTauxPASL(+e.target.value)}/>
              <div style={{fontSize:10,color:"#b8b4ac",marginTop:3}}>Taux suggéré selon votre impôt : {result?.tauxPASSugL}%</div>
            </div>
            <div>
              <label style={ls}>Taux PAS Ophélie (%)</label>
              <input style={is} type="number" step="0.1" value={tauxPASO} onChange={e=>setTauxPASO(+e.target.value)}/>
              <div style={{fontSize:10,color:"#b8b4ac",marginTop:3}}>Taux suggéré selon votre impôt : {result?.tauxPASSugO}%</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn-press" onClick={()=>{setTauxPASL(+parseFloat(result?.tauxPASSugL||0).toFixed(1));setTauxPASO(+parseFloat(result?.tauxPASSugO||0).toFixed(1));}} style={{padding:"8px 14px",background:"#1a1a2e",color:"#faf9f7",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>Utiliser les taux calculés</button>
              <button className="btn-press" onClick={()=>{setTauxPASL(0);setTauxPASO(0);}} style={{padding:"8px 14px",background:"transparent",color:"#8a8578",border:"1px solid #ddd8d0",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>Remettre à 0</button>
            </div>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{background:"#f2efeb",borderRadius:10,padding:"12px 14px"}}><div style={{fontSize:10,color:"#8a8578",marginBottom:4,textTransform:"uppercase",fontWeight:600}}>PAS Lionel</div><div style={{fontSize:20,fontWeight:700}}>{tauxPASL}%</div><div style={{fontSize:11,color:"#8a8578"}}>{fmt(result?.pasL||0)}/an</div></div>
            <div style={{background:"#f2efeb",borderRadius:10,padding:"12px 14px"}}><div style={{fontSize:10,color:"#8a8578",marginBottom:4,textTransform:"uppercase",fontWeight:600}}>PAS Ophélie</div><div style={{fontSize:20,fontWeight:700}}>{tauxPASO}%</div><div style={{fontSize:11,color:"#8a8578"}}>{fmt(result?.pasO||0)}/an</div></div>
          </div>
        )}
      </div>
    </div>

    {/* COLONNE DROITE — Résultats */}
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      <div style={{background:"linear-gradient(135deg,#1a1a2e,#2d2b55)",borderRadius:16,padding:28,color:"#faf9f7"}}>
        <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em",color:"#7a7890",marginBottom:8}}>Impôt net estimé</div>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:42,lineHeight:1}}>{fmt(result?.impotNet||0)}</div>
        <div style={{fontSize:14,color:"#7a7890",marginTop:8}}>soit {fmt(result?.mensuel||0)} / mois</div>
        {(result?.totalReductions||0)>0&&<div style={{marginTop:12,fontSize:12,color:"#4ade80"}}>✓ Économie : {fmt(result?.totalReductions)} de réductions appliquées</div>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        <div style={{background:"#fff",borderRadius:12,padding:14,border:"1px solid rgba(26,26,46,0.06)",textAlign:"center"}}><div style={{fontSize:10,color:"#8a8578",textTransform:"uppercase",marginBottom:4}}>Taux moyen</div><div style={{fontSize:20,fontWeight:800,color:"#1a1a2e"}}>{result?.tauxMoyen}%</div></div>
        <div style={{background:"#fff",borderRadius:12,padding:14,border:"1px solid rgba(26,26,46,0.06)",textAlign:"center"}}><div style={{fontSize:10,color:"#8a8578",textTransform:"uppercase",marginBottom:4}}>TMI</div><div style={{fontSize:20,fontWeight:800,color:"#1a1a2e"}}>{result?.tmi}%</div></div>
        <div style={{background:"#fff",borderRadius:12,padding:14,border:"1px solid rgba(26,26,46,0.06)",textAlign:"center"}}><div style={{fontSize:10,color:"#8a8578",textTransform:"uppercase",marginBottom:4}}>Parts</div><div style={{fontSize:20,fontWeight:800,color:"#1a1a2e"}}>{result?.nbParts}</div></div>
      </div>

      <div style={{background:soldePositif?"#fef2f2":soldeNeutre?"#f9f9f9":"#f0fdf4",borderRadius:14,padding:20,border:`2px solid ${soldePositif?"#fca5a5":"#86efac"}`}}>
        <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",color:soldePositif?"#b91c1c":"#15803d",marginBottom:8}}>{soldePositif?"💳 Reste à payer à la régularisation":"💰 Remboursement estimé"}</div>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:36,color:soldePositif?"#b91c1c":"#15803d"}}>{soldePositif?"+":""}{fmt(Math.abs(result?.soldeAPayerOuRestituer||0))}</div>
        <div style={{fontSize:12,color:soldePositif?"#dc2626":"#15803d",marginTop:8,display:"flex",flexDirection:"column",gap:3}}>
          <span>Impôt net : {fmt(result?.impotNet||0)}</span>
          {(result?.totalCredits||0)>0&&<span>Crédits d&apos;impôt : −{fmt(result?.totalCredits||0)}</span>}
          <span>PAS prélevé sur l&apos;année : −{fmt(result?.totalPAS||0)}</span>
        </div>
        {tauxPASL===0&&tauxPASO===0&&<div style={{marginTop:10,fontSize:11,color:"#8a8578",fontStyle:"italic"}}>Renseignez vos taux PAS ci-contre pour calculer le solde réel</div>}
      </div>

      <div style={{background:"#fff",borderRadius:12,padding:16,border:"1px solid rgba(26,26,46,0.06)"}}>
        <div style={{fontSize:12,fontWeight:600,color:"#8a8578",textTransform:"uppercase",marginBottom:12}}>Décomposition du calcul</div>
        {[
          {l:"Impôt brut (barème IR)",v:result?.impotBrut,c:""},
          {l:"− Réductions d'impôt",v:-(result?.totalReductions||0),c:"#15803d"},
          {l:"= Impôt net",v:result?.impotNet,c:"",bold:true,sep:true},
          {l:"− Crédits d'impôt",v:-(result?.totalCredits||0),c:"#15803d"},
          {l:"− PAS déjà prélevé",v:-(result?.totalPAS||0),c:"#6d28d9",sep:true},
          {l:soldePositif?"➕ Reste à payer":"💰 Remboursement",v:result?.soldeAPayerOuRestituer,c:soldePositif?"#b91c1c":"#15803d",bold:true},
        ].map((row,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:row.sep?"2px solid #e8e4dd":"none",marginBottom:row.sep?4:0,fontSize:13}}>
            <span style={{color:"#8a8578",fontWeight:row.bold?600:400}}>{row.l}</span>
            <span style={{fontWeight:row.bold?700:500,color:row.c||"#1a1a2e"}}>{fmt(row.v||0)}</span>
          </div>
        ))}
      </div>

      <div style={{background:"#fff",borderRadius:12,padding:16,border:"1px solid rgba(26,26,46,0.06)"}}>
        <div style={{fontSize:12,fontWeight:600,color:"#8a8578",textTransform:"uppercase",marginBottom:12}}>Détail par tranche d&apos;imposition</div>
        {result?.detail?.map((d,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<result.detail.length-1?"1px solid #f2efeb":"none",fontSize:13}}>
          <span style={{color:"#8a8578"}}>{d.tranche}</span>
          <span style={{display:"flex",gap:16}}><span style={{color:"#8a8578",minWidth:36,textAlign:"right"}}>{d.taux}</span><span style={{fontWeight:600,minWidth:80,textAlign:"right"}}>{fmt(d.montant)}</span></span>
        </div>)}
      </div>

      <div style={{padding:"12px 14px",background:"#f2efeb",borderRadius:10,fontSize:11,color:"#8a8578",lineHeight:1.6}}>
        ⚠️ Simulation indicative basée sur le barème IR 2026 (revenus 2025). Les plafonds et taux de réduction sont approximatifs. Consultez votre avis d&apos;imposition ou un conseiller fiscal pour une estimation précise.
      </div>
    </div>
    </div>
  </div>);
}

export default function BudgetApp(){
  const[user,setUser]=useState(null);const[authChecked,setAuthChecked]=useState(false);const[tab,setTab]=useState("patrimoine");
  useEffect(()=>{try{localStorage.removeItem("budget_user");}catch{}fetch("/api/auth/me",{credentials:"same-origin",cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(d?.user)setUser(d.user);}).catch(()=>{}).finally(()=>setAuthChecked(true));},[]);
  useEffect(()=>{const onUnauth=()=>setUser(null);window.addEventListener("bf-unauth",onUnauth);return()=>window.removeEventListener("bf-unauth",onUnauth);},[]);
  const finary=useFinary(!!user);
  const logout=async()=>{try{await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin"});}catch{}try{window.google?.accounts.id.disableAutoSelect();}catch{}setUser(null);};
  if(!authChecked)return null;
  if(!user)return<LoginPage onLogin={setUser}/>;
  const CS={background:"#fff",borderRadius:16,padding:24,border:"1px solid rgba(26,26,46,0.06)",boxShadow:"0 2px 12px rgba(26,26,46,0.04)"};
  const tabs=[["patrimoine","Patrimoine"],["budget_reel","Budget réel"],["placements","Comptes"],["impots","Simulateur IR"],["assistant","Assistant IA"],["immobilier","🏠 Immobilier"]];
  return(<><GlobalStyles/><div className="grain"/><div style={{minHeight:"100vh",background:"#faf9f7"}}>
    <div style={{background:"#1a1a2e",padding:"0 max(16px,calc((100% - 1320px)/2 + 36px))",position:"sticky",top:0,zIndex:100}}><div className="header-inner">
      <div style={{display:"flex",alignItems:"center",gap:16}}><div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#2d2b55,#44427a)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#faf9f7" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div><div style={{fontFamily:"'DM Serif Display',serif",color:"#faf9f7",fontSize:18}}>Budget Familial</div><div style={{color:"#7a7890",fontSize:11,fontWeight:500}}>Tchamfong</div></div></div>
      <div className="header-right" style={{display:"flex",alignItems:"center",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>{user.picture&&<img src={user.picture} style={{width:30,height:30,borderRadius:8,objectFit:"cover",border:"2px solid rgba(255,255,255,0.1)"}} alt="" referrerPolicy="no-referrer"/>}<div><div style={{color:"#faf9f7",fontSize:12,fontWeight:600}}>{user.name?.split(" ")[0]}</div><button onClick={logout} style={{background:"none",border:"none",color:"#7a7890",fontSize:10,cursor:"pointer",padding:0,fontFamily:"'DM Sans',sans-serif"}}>Déconnexion</button></div></div></div>
    </div></div>
    <div style={{background:"#fff",borderBottom:"1px solid #e8e4dd",position:"sticky",top:68,zIndex:99}}><div className="nav-wrap">{tabs.map(([k,l])=><button key={k} className="btn-press" onClick={()=>setTab(k)} style={{padding:"8px 14px",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:600,background:tab===k?"#1a1a2e":"transparent",color:tab===k?"#faf9f7":"#8a8578",whiteSpace:"nowrap",position:"relative"}}>{l}</button>)}</div></div>
    <div className="content-wrap">
    {tab==="patrimoine"&&<PatrimoineTab finary={finary}/>}
    {tab==="budget_reel"&&<BudgetReelTab finary={finary}/>}
    {tab==="placements"&&<ComptesTab finary={finary}/>}
    {tab==="impots"&&<div className="fade-up"><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,marginBottom:20}}>Simulateur Impôt sur le Revenu</h3><TaxSimulator/></div>}
    {tab==="assistant"&&<div className="fade-up" style={CS}><h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,marginBottom:16}}>Assistant budgétaire IA</h3><AIAssistant finaryData={finary.data}/></div>}
    
    {tab==="immobilier"&&<div className="fade-up">
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28,paddingBottom:20,borderBottom:"1px solid #e8e4dd"}}>
        <div style={{width:48,height:48,background:"linear-gradient(135deg,#1a3a5c,#2d5986)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🏠</div>
        <div>
          <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#1a1a2e",lineHeight:1.2}}>Simulateur Immobilier</h2>
          <p style={{fontSize:13,color:"#8a8578",marginTop:2}}>Capacité d&apos;emprunt · Annonces Val-de-Marne · Scénarios · Villes</p>
        </div>
      </div>
      <SimulateurImmobilier pret={(finary.data?.pret||[])[0]}/>
    </div>}
    </div>
    <div style={{textAlign:"center",padding:"40px 0 24px",color:"#c4c0b8",fontSize:11}}>Budget Familial Tchamfong · {new Date().getFullYear()}</div>
  </div>
  </>);
}

// ============================================================
// SIMULATEUR IMMOBILIER
// ============================================================

// Repères de taux moyens hors assurance (Pretto, novembre 2026). Le taux se saisit librement dans le simulateur.
const TAUX_REPERE = { 15: 3.56, 20: 3.76, 25: 3.85 };
const TAUX_REPERE_DATE = "novembre 2026";
const SIMU_KEY = "bf_simu_immo_v1";
const pct = (n, d = 2) => `${Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })} %`;

function loadSimu() {
  try { return JSON.parse(window.localStorage.getItem(SIMU_KEY) || "{}") || {}; } catch { return {}; }
}

const VILLES = [
  { nom: 'Saint-Mandé',           insee: '94067', prixM2: 9800, securite: 5, transport: ['Métro 1'] },
  { nom: 'Vincennes',              insee: '94080', prixM2: 8900, securite: 5, transport: ['Métro 1', 'RER A'] },
  { nom: 'Charenton-le-Pont',     insee: '94018', prixM2: 7800, securite: 4, transport: ['Métro 8'] },
  { nom: 'Nogent-sur-Marne',      insee: '94052', prixM2: 7200, securite: 5, transport: ['RER A', 'RER E'] },
  { nom: 'Le Perreux-sur-Marne',  insee: '94058', prixM2: 6500, securite: 4, transport: ['RER A', 'RER E'] },
  { nom: 'Saint-Maur-des-Fossés', insee: '94068', prixM2: 6100, securite: 5, transport: ['RER A'] },
  { nom: 'Bry-sur-Marne',         insee: '94015', prixM2: 5900, securite: 4, transport: ['RER A'] },
  { nom: 'Fontenay-sous-Bois',    insee: '94033', prixM2: 5800, securite: 4, transport: ['RER A', 'Métro 1'] },
  { nom: 'Maisons-Alfort',        insee: '94046', prixM2: 5600, securite: 4, transport: ['Métro 8', 'RER D'] },
  { nom: 'Joinville-le-Pont',     insee: '94042', prixM2: 5500, securite: 4, transport: ['RER A'] },
  { nom: 'Ormesson-sur-Marne',    insee: '94055', prixM2: 5200, securite: 5, transport: ['Bus', 'RER proche'] },
  { nom: 'Alfortville',           insee: '94002', prixM2: 4800, securite: 3, transport: ['RER D', 'Métro 8'] },
  { nom: 'Le Plessis-Trévise',    insee: '94060', prixM2: 4800, securite: 4, transport: ['Bus'] },
  { nom: 'Sucy-en-Brie',          insee: '94071', prixM2: 4600, securite: 4, transport: ['RER A'] },
  { nom: 'Villiers-sur-Marne',    insee: '94079', prixM2: 4500, securite: 3, transport: ['RER E'] },
  { nom: 'Chennevières-sur-Marne',insee: '94019', prixM2: 4400, securite: 4, transport: ['Bus'] },
  { nom: 'La Queue-en-Brie',      insee: '94038', prixM2: 4300, securite: 4, transport: ['Bus'] },
  { nom: 'Champigny-sur-Marne',   insee: '94017', prixM2: 4200, securite: 3, transport: ['RER A', 'RER E'] },
  { nom: 'Créteil',               insee: '94028', prixM2: 4100, securite: 3, transport: ['Métro 8'] },
];

const ANNONCES_BASE = [
  { ville: 'Fontenay-sous-Bois',    quartier: 'Plateau',        surface: 105, chambres: 4, prix: 580000, terrain: 150, statut: 'new' },
  { ville: 'Fontenay-sous-Bois',    quartier: 'Rigollots',      surface: 95,  chambres: 4, prix: 520000, terrain: 100, statut: null },
  { ville: 'Joinville-le-Pont',     quartier: 'Centre',         surface: 110, chambres: 4, prix: 595000, terrain: 200, statut: 'nego' },
  { ville: 'Maisons-Alfort',        quartier: 'Charentonneau',  surface: 100, chambres: 4, prix: 540000, terrain: 120, statut: null },
  { ville: 'Sucy-en-Brie',          quartier: 'Centre-ville',   surface: 115, chambres: 5, prix: 510000, terrain: 300, statut: 'new' },
  { ville: 'Le Plessis-Trévise',    quartier: 'Centre',         surface: 108, chambres: 4, prix: 490000, terrain: 250, statut: null },
  { ville: 'Champigny-sur-Marne',   quartier: 'Coteaux',        surface: 102, chambres: 4, prix: 420000, terrain: 180, statut: 'nego' },
  { ville: 'Ormesson-sur-Marne',    quartier: 'Centre',         surface: 98,  chambres: 4, prix: 510000, terrain: 150, statut: null },
  { ville: 'Saint-Maur-des-Fossés', quartier: 'Adamville',      surface: 95,  chambres: 4, prix: 620000, terrain: 100, statut: 'new' },
  { ville: 'Bry-sur-Marne',         quartier: 'Centre',         surface: 100, chambres: 4, prix: 570000, terrain: 120, statut: null },
  { ville: 'Chennevières-sur-Marne',quartier: 'Centre',         surface: 110, chambres: 4, prix: 480000, terrain: 200, statut: null },
  { ville: 'La Queue-en-Brie',      quartier: 'Centre',         surface: 120, chambres: 5, prix: 500000, terrain: 400, statut: 'nego' },
];

function calcMensualite(capital, tauxAnnuel, dureeAns) {
  if (capital <= 0) return 0;
  const tm = tauxAnnuel / 100 / 12;
  const n  = dureeAns * 12;
  if (tm <= 0) return capital / n;
  return capital * (tm * Math.pow(1 + tm, n)) / (Math.pow(1 + tm, n) - 1);
}

// Capital empruntable pour une mensualité donnée. Si tauxAssurance > 0, la mensualité
// inclut l'assurance (calculée chaque mois sur le capital emprunté), comme le veut la règle HCSF.
function calcCapacite(mensualite, tauxAnnuel, dureeAns, tauxAssurance = 0) {
  if (mensualite <= 0) return 0;
  const tm = tauxAnnuel / 100 / 12;
  const n  = dureeAns * 12;
  const facteur = tm > 0 ? tm / (1 - Math.pow(1 + tm, -n)) : 1 / n;
  return mensualite / (facteur + tauxAssurance / 100 / 12);
}

function SimulateurImmobilier({ pret }) {
  const saved = useMemo(() => loadSimu(), []);
  const [activeTab, setActiveTab] = useState('simulation');
  const [revLionel,   setRevLionel]   = useState(saved.revLionel ?? 3900);
  const [revOphelie,  setRevOphelie]  = useState(saved.revOphelie ?? 4200);
  const [tauxPAS,     setTauxPAS]     = useState(saved.tauxPAS ?? 13.4);
  const [chargesFixes,setChargesFixes]= useState(saved.chargesFixes ?? 3614);
  const [apportPerso, setApportPerso] = useState(saved.apportPerso ?? 30000);
  const [mensActuelle,setMensActuelle]= useState(1692);
  const [crd,         setCrd]         = useState(312000);
  const [tauxActuel,  setTauxActuel]  = useState(1.6);
  const [prixVente,   setPrixVente]   = useState(saved.prixVente ?? 510000);
  const [duree,       setDuree]       = useState(saved.duree ?? 25);
  const [taux,        setTaux]        = useState(saved.taux ?? TAUX_REPERE[saved.duree ?? 25]);
  const [tauxManuel,  setTauxManuel]  = useState(saved.tauxManuel ?? false);
  const [tauxAssurance, setTauxAssurance] = useState(saved.tauxAssurance ?? 0.2);
  const [surfaceMin,  setSurfaceMin]  = useState(saved.surfaceMin ?? 100);
  const [nbChambres,  setNbChambres]  = useState(saved.nbChambres ?? 4);
  const [vendMaison,          setVendMaison]          = useState(saved.vendMaison ?? true);
  const [mensualiteSouhaitee, setMensualiteSouhaitee] = useState(saved.mensualiteSouhaitee ?? 2500);

  // Prêt actuel : repris de Finary (mis à jour chaque dimanche), modifiable ensuite.
  const pretApplique = useRef(false);
  useEffect(() => {
    if (!pret || pretApplique.current) return;
    pretApplique.current = true;
    if (pret.capital_restant > 0) setCrd(Math.round(pret.capital_restant));
    if (pret.mensualite > 0) setMensActuelle(Math.round(pret.mensualite));
    if (pret.taux > 0) setTauxActuel(pret.taux);
  }, [pret]);

  // Les saisies sont gardées dans ce navigateur. Le prêt actuel vient de Finary, il n'est pas gardé.
  useEffect(() => {
    try {
      window.localStorage.setItem(SIMU_KEY, JSON.stringify({ revLionel, revOphelie, tauxPAS, chargesFixes, apportPerso, prixVente, duree, taux, tauxManuel, tauxAssurance, surfaceMin, nbChambres, vendMaison, mensualiteSouhaitee }));
    } catch {}
  }, [revLionel, revOphelie, tauxPAS, chargesFixes, apportPerso, prixVente, duree, taux, tauxManuel, tauxAssurance, surfaceMin, nbChambres, vendMaison, mensualiteSouhaitee]);

  const changeDuree = (d) => {
    setDuree(d);
    if (!tauxManuel) setTaux(TAUX_REPERE[d]);
  };
  const tauxRepere = TAUX_REPERE[duree];

  const calc = useCallback(() => {
    const revTotal    = revLionel + revOphelie;
    const revAvantPAS = revTotal / (1 - tauxPAS / 100);
    const mensMaxHCSF = revAvantPAS * 0.35;
    const fraisAgence = prixVente * 0.04;
    // IRA légales : au plus 6 mois d'intérêts sur le capital remboursé, et au plus 3 % du capital restant dû.
    const ira = Math.min(crd * 0.03, crd * (tauxActuel / 100) / 2);
    const soldeVentePotentiel = Math.max(0, prixVente - crd - fraisAgence - ira);
    const soldeVente = vendMaison ? soldeVentePotentiel : 0;
    const apportTotal = apportPerso + soldeVente;
    let mensDisponible = mensMaxHCSF;
    if (!vendMaison) mensDisponible = mensMaxHCSF - mensActuelle;
    const mensualiteUtilisee = Math.max(0, Math.min(mensualiteSouhaitee, mensDisponible));
    const capacite = calcCapacite(mensualiteUtilisee, taux, duree, tauxAssurance);
    const budgetTotal = capacite + apportTotal;
    const budgetNet   = budgetTotal / 1.08;
    const emprunt  = capacite;
    const mensCredit    = calcMensualite(emprunt, taux, duree);
    const mensAssurance = emprunt * tauxAssurance / 100 / 12;
    const mensFinal     = mensCredit + mensAssurance;
    const endett   = revAvantPAS > 0 ? (mensFinal + (vendMaison ? 0 : mensActuelle)) / revAvantPAS * 100 : 0;
    const coutCredit    = mensCredit * duree * 12 - emprunt;
    const coutAssurance = mensAssurance * duree * 12;
    const resteAVivre = revTotal - mensFinal - (vendMaison ? 0 : mensActuelle) - chargesFixes;
    return { revTotal, revAvantPAS, mensMaxHCSF, soldeVente, soldeVentePotentiel, fraisAgence, ira, apportTotal, mensualiteUtilisee, mensDisponible, taux, tauxAssurance, capacite, budgetTotal, budgetNet, emprunt, mensCredit, mensAssurance, mensFinal, endett, coutCredit, coutAssurance, resteAVivre };
  }, [revLionel, revOphelie, tauxPAS, chargesFixes, apportPerso, mensActuelle, crd, tauxActuel, prixVente, duree, taux, tauxAssurance, vendMaison, mensualiteSouhaitee]);

  const r = calc();

  return (
    <div style={styles.root}>
      <div style={styles.headerBadges}>
        <span style={styles.badge('#d4af37', '#7a5c00')}>🏦 Taux {pct(taux)} + assurance {pct(tauxAssurance)}</span>
        <span style={styles.badge(r.endett <= 25 ? '#d1fae5' : r.endett <= 35 ? '#fef3c7' : '#fee2e2', r.endett <= 25 ? '#065f46' : r.endett <= 35 ? '#92400e' : '#991b1b')}>Endettement {r.endett.toFixed(1)}%</span>
      </div>
      <div style={styles.tabs}>
        {[{ id: 'simulation', label: '📊 Simulation' }, { id: 'scenarios', label: '⚖️ Scénarios' }, { id: 'transactions', label: '🔍 Transactions DVF' }, { id: 'marche', label: '🔍 Marché & Annonces' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={activeTab === t.id ? styles.tabActive : styles.tab}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'simulation' && (
        <div style={styles.simGrid} className="sim-grid">
          <div>
            <Card title="⚙️ Mensualité souhaitée, assurance comprise">
              {/* En-tête : valeur actuelle + badge max */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#c9a84c', fontFamily: "'DM Serif Display',serif" }}>{fmt(mensualiteSouhaitee)}</span>
                  <span style={{ fontSize: 14, color: '#8a9ab0', marginLeft: 6 }}>/mois</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#8a9ab0', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Max HCSF (35%)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1a3a5c' }}>{fmt(r.mensMaxHCSF)}/mois</span>
                    <button
                      onClick={() => setMensualiteSouhaitee(Math.round(r.mensMaxHCSF))}
                      style={{ padding: '5px 12px', background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      Utiliser le max
                    </button>
                  </div>
                </div>
              </div>
              {/* Slider */}
              <input
                type="range"
                min={500}
                max={Math.round(r.mensMaxHCSF)}
                step={1}
                value={Math.min(mensualiteSouhaitee, Math.round(r.mensMaxHCSF))}
                onChange={e => setMensualiteSouhaitee(+e.target.value)}
                style={styles.slider}
              />
              <div style={styles.sliderLabels}>
                <span>500 €</span>
                <span style={{ color: mensualiteSouhaitee >= r.mensMaxHCSF * 0.95 ? '#16a34a' : '#8a9ab0' }}>
                  {Math.round(mensualiteSouhaitee / r.mensMaxHCSF * 100)}% du max
                </span>
                <span>{fmt(r.mensMaxHCSF)}</span>
              </div>
              <p style={{ fontSize: 11, color: '#8a9ab0', marginTop: 10 }}>
                Règle HCSF : mensualités et assurance au plus à 35 % du revenu net avant impôt • Revenu net avant impôt estimé : {fmt(r.revAvantPAS)}/mois
              </p>
            </Card>
            <Card title="💰 Revenus du foyer">
              <div style={styles.formGrid}>
                <FormField label="Revenu net Lionel (après PAS)" hint="Freelance portage salarial HIWAY" suffix="€/mois"><NumInput value={revLionel} onChange={setRevLionel}/></FormField>
                <FormField label="Revenu net Ophélie (après PAS)" hint="CDI" suffix="€/mois"><NumInput value={revOphelie} onChange={setRevOphelie}/></FormField>
                <FormField label="Taux PAS" suffix="%"><NumInput value={tauxPAS} onChange={setTauxPAS} step={0.1}/></FormField>
                <FormField label="Charges fixes mensuelles" hint="Hors crédit immobilier" suffix="€/mois"><NumInput value={chargesFixes} onChange={setChargesFixes}/></FormField>
              </div>
            </Card>
            <Card title="🏠 Maison actuelle (83 rue É. Maury)">
              <div style={styles.toggleRow}>
                <div onClick={() => setVendMaison(v => !v)} style={{ ...styles.toggle, background: vendMaison ? '#c9a84c' : '#c8d5e3', cursor: 'pointer' }}>
                  <div style={{ ...styles.toggleDot, transform: vendMaison ? 'translateX(22px)' : 'none' }}/>
                </div>
                <span style={{ fontSize: 14, color: '#2d4a6d' }}>Je vends ma maison avant d&apos;acheter</span>
              </div>
              <div style={styles.formGrid}>
                <FormField label="Mensualité crédit actuel" hint={pret ? "Finary, hors assurance. Ajoute l'assurance si tu gardes la maison" : "Assurance comprise si tu gardes la maison"} suffix="€/mois"><NumInput value={mensActuelle} onChange={setMensActuelle}/></FormField>
                <FormField label="Capital restant dû" hint={pret ? "Repris de Finary, mis à jour chaque dimanche" : "Voir le tableau d'amortissement"} suffix="€"><NumInput value={crd} onChange={setCrd}/></FormField>
                <FormField label="Taux du prêt actuel" hint="Sert au calcul des indemnités de remboursement anticipé" suffix="%"><NumInput value={tauxActuel} onChange={setTauxActuel} step={0.01}/></FormField>
                {vendMaison && <FormField label="Prix de vente estimé" hint="72m² Carrez + 35m² niv.0 • Plateau Fontenay" suffix="€"><NumInput value={prixVente} onChange={setPrixVente}/></FormField>}
              </div>
            </Card>
            {vendMaison && <EstimationBienDVF prixVente={prixVente} onPrixChange={setPrixVente}/>}
            <Card title="📈 Paramètres du prêt">
              <div style={styles.formGrid}>
                <FormField label="Apport personnel (hors vente)" hint="PEE Ophélie, épargne…" suffix="€"><NumInput value={apportPerso} onChange={setApportPerso}/></FormField>
                <FormField label="Durée du prêt" hint="25 ans maximum selon la règle HCSF"><select value={duree} onChange={e => changeDuree(+e.target.value)} style={styles.select}><option value={15}>15 ans</option><option value={20}>20 ans</option><option value={25}>25 ans</option></select></FormField>
                <div>
                  <FormField label="Taux du prêt, hors assurance" suffix="%">
                    <NumInput value={taux} step={0.01} onChange={v => { setTaux(v); setTauxManuel(true); }}/>
                  </FormField>
                  <p style={styles.hint}>
                    Repère {TAUX_REPERE_DATE} sur {duree} ans : {pct(tauxRepere)}
                    {Math.abs(taux - tauxRepere) > 0.0001 && (
                      <button type="button" onClick={() => { setTaux(tauxRepere); setTauxManuel(false); }} style={{ marginLeft: 6, padding: 0, border: 'none', background: 'none', color: '#c9a84c', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Appliquer</button>
                    )}
                  </p>
                </div>
                <FormField label="Assurance emprunteur" hint="Par an, du capital emprunté, pour vous deux. Mets le taux de ton devis" suffix="%/an"><NumInput value={tauxAssurance} onChange={setTauxAssurance} step={0.01}/></FormField>
                <FormField label="Surface recherchée" suffix="m²"><NumInput value={surfaceMin} onChange={setSurfaceMin}/></FormField>
                <FormField label="Nombre de chambres"><select value={nbChambres} onChange={e => setNbChambres(+e.target.value)} style={styles.select}><option value={3}>3 chambres</option><option value={4}>4 chambres</option><option value={5}>5 chambres</option></select></FormField>
              </div>
            </Card>
          </div>
          <div>
            <div style={styles.budgetHero}>
              <div style={styles.budgetHeroGrid}>
                <div><p style={styles.budgetLabel}>Budget net (hors notaire)</p><p style={styles.budgetValueLarge}>{fmt(r.budgetNet)}</p><p style={styles.budgetNote}>Prix d&apos;achat maximum</p></div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }}/>
                <div><p style={styles.budgetLabel}>Budget tout compris</p><p style={{ ...styles.budgetValueLarge, fontSize: 22 }}>{fmt(r.budgetTotal)}</p><p style={styles.budgetNote}>Frais notaire inclus (~8%)</p></div>
              </div>
            </div>
            <Card title="💎 Décomposition de l'apport">
              {vendMaison && (<>
                <ApportRow label="Prix de vente maison" value={fmt(prixVente)}/>
                <ApportRow label="− Capital restant dû" value={'−' + fmt(crd)} indent color="#dc2626"/>
                <ApportRow label="− Frais agence (4%)" value={'−' + fmt(r.fraisAgence)} indent color="#dc2626"/>
                <ApportRow label="− IRA (remb. anticipé)" value={'−' + fmt(r.ira)} indent color="#dc2626"/>
                <div style={styles.soldeVenteRow}><span style={{ fontWeight: 600 }}>= Solde net vente</span><span style={{ fontWeight: 700, color: '#16a34a', fontSize: 15 }}>{fmt(r.soldeVente)}</span></div>
              </>)}
              <ApportRow label="Apport personnel" value={fmt(apportPerso)}/>
              <ApportRow label="APPORT TOTAL" value={fmt(r.apportTotal)} total color="#16a34a"/>
            </Card>
            <Card>
              <ApportRow label="Revenu net avant impôt" value={fmt(r.revAvantPAS) + '/mois'}/>
              <ApportRow label="Mensualité max HCSF (35 %)" value={fmt(r.mensMaxHCSF) + '/mois'}/>
              <ApportRow label="Capacité d'emprunt" value={fmt(r.capacite)}/>
              <div style={{ borderTop: '1px solid #e8dcc8', marginTop: 8, paddingTop: 8 }}>
                <ApportRow label={`Mensualité crédit (${pct(r.taux)})`} value={fmt(r.mensCredit) + '/mois'} indent/>
                <ApportRow label={`Assurance (${pct(r.tauxAssurance)}/an)`} value={fmt(r.mensAssurance) + '/mois'} indent/>
                <ApportRow label="Mensualité totale" value={fmt(r.mensFinal) + '/mois'} bold color="#c9a84c"/>
              </div>
              <ApportRow label="Coût des intérêts" value={fmt(r.coutCredit)} color="#d97706"/>
              <ApportRow label="Coût de l'assurance" value={fmt(r.coutAssurance)} color="#d97706"/>
              <ApportRow label="Reste à vivre" value={fmt(r.resteAVivre) + '/mois'} color={r.resteAVivre >= 2000 ? '#16a34a' : r.resteAVivre >= 1500 ? '#d97706' : '#dc2626'}/>
            </Card>
            <Card>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#5a7a9a' }}>Taux d&apos;endettement</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: r.endett <= 25 ? '#16a34a' : r.endett <= 35 ? '#d97706' : '#dc2626' }}>{r.endett.toFixed(1)}%</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: Math.min(r.endett / 45 * 100, 100) + '%', background: r.endett <= 25 ? '#16a34a' : r.endett <= 35 ? '#f59e0b' : '#ef4444' }}/>
                  <div style={{ ...styles.progressMarker, left: (35 / 45 * 100) + '%' }}/>
                </div>
                <div style={styles.progressLabels}><span>0%</span><span>Confort : 25%</span><span style={{ color: '#ef4444' }}>Max : 35%</span><span>45%</span></div>
              </div>
              <div style={{ ...styles.statusBadge, background: r.endett <= 35 ? '#d1fae5' : '#fee2e2', color: r.endett <= 35 ? '#065f46' : '#991b1b' }}>
                {r.endett <= 35 ? '✓ Dans la limite HCSF de 35 %' : '✗ Au-dessus de 35 % : hors règle HCSF, sauf dérogation de la banque'}
              </div>
            </Card>
          </div>
        </div>
      )}


      {activeTab === 'scenarios' && (
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a3a5c', marginBottom: 20 }}>Comparaison des scénarios</h3>
          <ScenariosGrid r={r} duree={duree} chargesFixes={chargesFixes} apportPerso={apportPerso} mensActuelle={mensActuelle}/>
          <div style={{ ...styles.infoBox, marginTop: 20 }}><span>💡</span><span><strong>À savoir :</strong> &quot;Vente puis achat&quot; te donne l&apos;apport de la vente et un seul crédit. En vendant, tu rembourses ton prêt actuel à {pct(tauxActuel)} et tu empruntes à {pct(taux)}. &quot;Garder + investir&quot; ne compte pas les loyers : la banque en retient en général une partie dans tes revenus.</span></div>
        </div>
      )}

      {activeTab === 'transactions' && <RechercheRueDVF styles={styles}/>}

      {activeTab === 'marche' && <MarcheImmobilier r={r} surfaceMin={surfaceMin} nbChambres={nbChambres} styles={styles}/>}

      <div style={styles.footer}>Simulation indicative • Taux saisi par toi, repères {TAUX_REPERE_DATE} (moyennes hors assurance) • Règles HCSF : 35 % assurance comprise, 25 ans max • Frais de notaire estimés à 8 %, hors frais de garantie et de dossier</div>
    </div>
  );
}

function ScenariosGrid({ r, duree, chargesFixes, apportPerso, mensActuelle }) {
  const { taux, tauxAssurance } = r;
  // Solde de la vente calculé dans le simulateur (frais d'agence et IRA déduits), même si l'option "je vends" est coupée.
  const apportTotal = apportPerso + r.soldeVentePotentiel;
  const mensMax1 = r.revAvantPAS * 0.35;
  const cap1 = calcCapacite(mensMax1, taux, duree, tauxAssurance);
  const budget1 = (cap1 + apportTotal) / 1.08;
  const mensConfort = r.revAvantPAS * 0.25;
  const cap3 = calcCapacite(mensConfort, taux, duree, tauxAssurance);
  const budget3 = (cap3 + apportTotal) / 1.08;
  const rav3 = r.revTotal - mensConfort - chargesFixes;
  const mensMax2 = r.revAvantPAS * 0.35 - mensActuelle;
  const cap2 = mensMax2 > 0 ? calcCapacite(mensMax2, taux, duree, tauxAssurance) : 0;
  const budget2 = (cap2 + apportPerso) / 1.08;
  const endett2 = mensMax2 > 0 ? ((mensMax2 + mensActuelle) / r.revAvantPAS * 100) : 100;
  const scenarios = [
    { title: 'Vente puis achat', desc: 'Vendre votre maison, puis acheter plus grand', budget: budget1, mensualite: mensMax1, endett: r.revAvantPAS > 0 ? 35 : 0, apport: apportTotal, recommended: true, verdict: '✓ Conforme HCSF' },
    { title: 'Mensualité confort', desc: 'Endettement à 25% pour plus de sérénité', budget: budget3, mensualite: mensConfort, endett: 25, apport: apportTotal, recommended: false, verdict: `Reste à vivre : ${fmt(rav3)}` },
    { title: 'Garder + investir', desc: 'Conserver votre maison et acheter pour louer', budget: budget2, mensualite: mensMax2, endett: endett2, apport: apportPerso, recommended: false, verdict: endett2 <= 35 ? '✓ Possible' : '✗ Endettement trop élevé' },
  ];
  return (
    <div style={styles.scenariosGrid}>
      {scenarios.map((s, i) => (
        <div key={i} style={{ ...styles.scenarioCard, border: s.recommended ? '2px solid #22c55e' : '2px solid #e8dcc8' }}>
          {s.recommended && <span style={styles.scenarioBadge}>Recommandé</span>}
          <h4 style={{ fontWeight: 700, color: '#1a3a5c', marginBottom: 4 }}>{s.title}</h4>
          <p style={{ fontSize: 13, color: '#8a9ab0', marginBottom: 14 }}>{s.desc}</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#c9a84c', marginBottom: 10 }}>{fmt(s.budget)}</p>
          <div style={{ fontSize: 13, color: '#5a7a9a' }}>
            {[['Mensualité', `${fmt(s.mensualite)}/mois`], ['Endettement', `${s.endett.toFixed(1)}%`], ['Apport', fmt(s.apport)]].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>{label}</span><span style={{ fontWeight: 600 }}>{val}</span></div>
            ))}
            <div style={{ borderTop: '1px solid #e8dcc8', marginTop: 8, paddingTop: 8, fontWeight: 700, color: '#1a3a5c' }}>{s.verdict}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }) {
  return (<div style={styles.card}>{title && <h3 style={styles.cardTitle}>{title}</h3>}{children}</div>);
}

function FormField({ label, hint, suffix, children, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <label style={styles.label}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>{children}{suffix && <span style={styles.suffix}>{suffix}</span>}</div>
      {hint && <p style={styles.hint}>{hint}</p>}
    </div>
  );
}

function NumInput({ value, onChange, step = 1 }) {
  return (<input type="number" value={value} step={step} onChange={e => onChange(+e.target.value)} style={styles.input}/>);
}

function ApportRow({ label, value, indent, total, bold, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: total ? '10px 0 0' : '5px 0', paddingLeft: indent ? 14 : 0, borderTop: total ? '1px dashed #e8dcc8' : undefined, marginTop: total ? 6 : undefined, fontSize: indent ? 12 : 13, color: indent ? '#8a9ab0' : '#2d4a6d' }}>
      <span style={{ fontWeight: bold || total ? 700 : 400 }}>{label}</span>
      <span style={{ fontWeight: bold || total ? 700 : 500, color: color || '#1a3a5c' }}>{value}</span>
    </div>
  );
}

// ─── COMPOSANT VILLES DVF ────────────────────────────────────────────────────

function VillesDVF({ villes, filterSecurite, setFilterSecurite, filterBudget, setFilterBudget, surfaceMin, fmtFn, styles, FormField, NumInput, Card }) {
  const [dvfData, setDvfData] = useState({});
  const [loaded, setLoaded] = useState(false);
  const villesFiltrees = villes.filter(v => v.securite >= filterSecurite);
  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    const fetchAll = async () => {
      const init = {};
      villesFiltrees.forEach(v => { init[v.insee] = { loading: true, prixM2: null, nb: 0, date: null, error: false }; });
      setDvfData(init);
      const batchSize = 5;
      for (let i = 0; i < villesFiltrees.length; i += batchSize) {
        const batch = villesFiltrees.slice(i, i + batchSize);
        await Promise.all(batch.map(async (v) => {
          try {
            const res = await fetch(`/api/dvf?mode=historique&commune=${v.insee}`);
            const data = await res.json();
            setDvfData(prev => ({ ...prev, [v.insee]: { loading: false, prixM2: data.prix_m2_median, nb: data.nb_transactions, annee: data.annee, source: data.source, error: !data.prix_m2_median } }));
          } catch {
            setDvfData(prev => ({ ...prev, [v.insee]: { loading: false, prixM2: null, nb: 0, date: null, error: true } }));
          }
        }));
      }
    };
    fetchAll();
  }, [filterSecurite]);
  useEffect(() => { setLoaded(false); }, [filterSecurite]);
  return (
    <div>
      <Card title="🎯 Filtres">
        <div style={styles.formGrid}>
          <FormField label="Budget max" suffix="€"><NumInput value={filterBudget} onChange={setFilterBudget}/></FormField>
          <FormField label="Sécurité minimum"><select value={filterSecurite} onChange={e => setFilterSecurite(+e.target.value)} style={styles.select}><option value={3}>3+ étoiles</option><option value={4}>4+ étoiles</option><option value={5}>5 étoiles</option></select></FormField>
        </div>
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontSize: 11, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>📊</span><span><strong>Prix réels DVF</strong> — Transactions maisons 2022-2025 · Source DGFiP / data.gouv.fr · Médiane sur 3 ans</span>
        </div>
      </Card>
      <div style={styles.villesGrid}>
        {villesFiltrees.map((v, i) => {
          const dvf = dvfData[v.insee];
          const prixM2 = dvf?.prixM2 || v.prixM2;
          const prix = prixM2 * surfaceMin;
          const inBudget = prix <= filterBudget;
          const isLoading = dvf?.loading;
          const isReal = dvf?.prixM2 && !dvf?.error;
          const diff = dvf?.prixM2 ? Math.round(((dvf.prixM2 - v.prixM2) / v.prixM2) * 100) : null;
          return (
            <div key={i} style={{ ...styles.villeCard, borderLeft: `3px solid ${inBudget ? '#22c55e' : '#f59e0b'}`, opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.3s' }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#1a3a5c', marginBottom: 4 }}>{v.nom}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                {isLoading ? <span style={{ fontSize: 11, color: '#8a9ab0' }}>Chargement DVF…</span> : (
                  <><span style={{ fontSize: 13, fontWeight: 700, color: isReal ? '#1a3a5c' : '#8a9ab0' }}>{prixM2.toLocaleString('fr-FR')} €/m²</span>{isReal && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: '#dcfce7', color: '#166534' }}>DVF</span>}</>
                )}
              </div>
              {diff !== null && !isLoading && <p style={{ fontSize: 10, color: diff > 0 ? '#dc2626' : '#16a34a', marginBottom: 2, fontWeight: 600 }}>{diff > 0 ? '▲' : '▼'} {Math.abs(diff)}% vs estimation</p>}
              <p style={{ fontSize: 13, fontWeight: 700, color: inBudget ? '#16a34a' : '#d97706', marginBottom: 4 }}>{fmtFn(prix)}</p>
              <p style={{ fontSize: 10, color: '#8a9ab0' }}>{'⭐'.repeat(v.securite)} · {v.transport[0]}</p>
              {dvf?.nb > 0 && !isLoading && <p style={{ fontSize: 10, color: '#8a9ab0', marginTop: 2 }}>{dvf.nb} ventes · données {dvf.annee || 2023}</p>}
              {dvf?.error && !isLoading && <p style={{ fontSize: 10, color: '#f59e0b', marginTop: 2 }}>⚠ Données DVF indisponibles</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RECHERCHE DVF PAR RUE ───────────────────────────────────────────────────

const DEFAULT_MAP_CENTER = { lat: 48.8566, lng: 2.3522, zoom: 11 };

function RechercheRueDVF({ styles }) {
  const [communeInput, setCommuneInput] = useState('');
  const [communeSuggestions, setCommuneSuggestions] = useState([]);
  const [communeSelectee, setCommuneSelectee] = useState(null);
  const [rue, setRue]           = useState('');
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError]       = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [viewMode, setViewMode] = useState('split');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeYear, setActiveYear] = useState('all'); // filtre année sur résultats
  const [filterTexte, setFilterTexte] = useState(''); // filtre texte local sur résultats

  const leafletMap   = useRef(null);
  const markersLayer = useRef(null);
  const mapContainer = useRef(null);
  const communeRef   = useRef(null);
  const suggestTimer = useRef(null);

  useEffect(() => { communeRef.current = communeSelectee; }, [communeSelectee]);

  // ── FIX 1 : invalidateSize quand la carte redevient visible ──
  useEffect(() => {
    if (viewMode !== 'table' && leafletMap.current) {
      setTimeout(() => leafletMap.current.invalidateSize(), 100);
    }
  }, [viewMode]);

  // Autocomplétion commune
  const rechercherCommunes = (val) => {
    setCommuneInput(val);
    setCommuneSelectee(null);
    clearTimeout(suggestTimer.current);
    if (val.length < 2) { setCommuneSuggestions([]); setShowSuggestions(false); return; }
    suggestTimer.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(val)}&fields=code,nom,codesPostaux,departement&limit=8&boost=population`);
        const data = await res.json();
        setCommuneSuggestions(data || []);
        setShowSuggestions(true);
      } catch { setCommuneSuggestions([]); }
      setLoadingSuggestions(false);
    }, 250);
  };

  const choisirCommune = (commune) => {
    const c = { code: commune.code, nom: commune.nom, cp: commune.codesPostaux?.[0] || '' };
    setCommuneSelectee(c);
    setCommuneInput(`${commune.nom} (${commune.departement?.nom || commune.codesPostaux?.[0] || ''})`);
    setCommuneSuggestions([]);
    setShowSuggestions(false);
    if (leafletMap.current) {
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(commune.nom)}&countrycodes=fr&limit=1&format=json`, { headers: { 'User-Agent': 'BudgetFamilialTchamfong/1.0' } })
        .then(r => r.json()).then(data => { if (data[0]) leafletMap.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 14); }).catch(() => {});
    }
    // Pas de recherche automatique — l'utilisateur doit cliquer sur le bouton de recherche
  };

  // Charger Leaflet
  useEffect(() => {
    if (window.L) { setMapReady(true); return; }
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
    const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload = () => setMapReady(true); document.head.appendChild(script);
  }, []);

  // ── FIX 2 : Initialiser la carte (div toujours dans le DOM) ──
  useEffect(() => {
    if (!mapReady || !mapContainer.current || leafletMap.current) return;
    const map = window.L.map(mapContainer.current, { zoomControl: true }).setView([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng], DEFAULT_MAP_CENTER.zoom);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }).addTo(map);
    markersLayer.current = window.L.layerGroup().addTo(map);

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`, { headers: { 'User-Agent': 'BudgetFamilialTchamfong/1.0' } });
        const data = await res.json();
        const road = data.address?.road || data.address?.pedestrian || data.address?.street;
        if (!road) return;
        const nomRue = road.replace(/^(rue|avenue|av\.?|boulevard|bd\.?|impasse|allée|all\.?|chemin|place|pl\.?|villa|clos|résidence|rés\.?|res\.?|square|sq\.?|passage|voie)\s+/i, '').toUpperCase();
        const villeNom = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || '';
        const cp = data.address?.postcode || '';
        if (villeNom) {
          try {
            const geoRes = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(villeNom)}&codePostal=${cp}&fields=code,nom,codesPostaux,departement&limit=1`);
            const geoData = await geoRes.json();
            if (geoData[0]) {
              const c = geoData[0];
              const nouvelleCommune = { code: c.code, nom: c.nom, cp: c.codesPostaux?.[0] || cp };
              setCommuneSelectee(nouvelleCommune);
              setCommuneInput(`${c.nom} (${c.departement?.nom || cp})`);
              setRue(nomRue);
              await lancerRecherche(nomRue, nouvelleCommune);
              return;
            }
          } catch {}
        }
        setRue(nomRue);
        if (communeRef.current) await lancerRecherche(nomRue, communeRef.current);
      } catch (err) { console.error('Nominatim error:', err); }
    });

    leafletMap.current = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, [mapReady]);

  // Marqueurs
  useEffect(() => {
    if (!leafletMap.current || !markersLayer.current || !results) return;
    markersLayer.current.clearLayers();
    const filtered = activeYear === 'all' ? results.transactions : results.transactions.filter(t => t.date?.startsWith(activeYear));
    filtered.forEach(t => {
      if (!t.lat || !t.lng) return;
      const icon = window.L.divIcon({ className: '', html: `<div style="background:#c9a84c;color:#fff;padding:3px 7px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${Math.round(t.prix / 1000)}k</div>`, iconAnchor: [20, 10] });
      const marker = window.L.marker([t.lat, t.lng], { icon });
      marker.bindPopup(`<div style="font-family:DM Sans,sans-serif;min-width:180px"><div style="font-weight:700;font-size:14px;color:#1a3a5c;margin-bottom:4px">${t.adresse}</div><div style="font-size:16px;font-weight:800;color:#c9a84c">${t.prix.toLocaleString('fr-FR')} \u20ac</div><div style="font-size:12px;color:#5a7a9a;margin-top:2px">${t.surface ? t.surface + ' m\u00b2' : ''}${t.prixM2 ? ' \u00b7 ' + t.prixM2.toLocaleString('fr-FR') + ' \u20ac/m\u00b2' : ''}</div><div style="font-size:11px;color:#8a9ab0;margin-top:4px">${t.pieces ? t.pieces + ' pi\u00e8ces \u00b7 ' : ''}${new Date(t.date).toLocaleDateString('fr-FR')}</div></div>`);
      markersLayer.current.addLayer(marker);
    });
    const latlngs = filtered.filter(t => t.lat).map(t => [t.lat, t.lng]);
    if (latlngs.length > 0) leafletMap.current.fitBounds(latlngs, { padding: [30, 30], maxZoom: 16 });
  }, [results, activeYear]);

  const lancerRecherche = async (nomRue, commune) => {
    const r = nomRue !== undefined ? nomRue : rue;
    const c = commune !== undefined ? commune : communeRef.current;
    if (!c) return;
    setLoading(true); setError(null); setResults(null); setActiveYear('all'); setFilterTexte('');
    try {
      // Si rue renseignée → mode rue (2020-2025 avec adresses)
      // Si commune seule → mode historique (2014-2025 via Supabase + data.gouv.fr)
      const url = r.trim()
        ? `/api/dvf?mode=rue&commune=${c.code}&rue=${encodeURIComponent(r.trim())}`
        : `/api/dvf?mode=historique&commune=${c.code}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const fmtLocal   = (n) => n ? Math.round(n).toLocaleString('fr-FR') + '\u00a0\u20ac' : '\u2014';
  const fmtM2Local = (n) => n ? Math.round(n).toLocaleString('fr-FR') + '\u00a0\u20ac/m\u00b2' : '\u2014';

  // Données filtrées par année + texte libre
  const transactionsFiltrees = results
    ? (activeYear === 'all' ? results.transactions : results.transactions.filter(t => t.date?.startsWith(activeYear)))
        .filter(t => {
          if (!filterTexte.trim()) return true;
          const q = filterTexte.trim().toLowerCase();
          // Cherche dans adresse, commune, surface, prix, pièces
          return (
            (t.adresse?.toLowerCase().includes(q)) ||
            (t.commune?.toLowerCase().includes(q)) ||
            (t.surface?.toString().includes(q)) ||
            (t.pieces?.toString().includes(q)) ||
            (t.prix?.toString().includes(q))
          );
        })
    : [];

  const mediane = (() => {
    if (!transactionsFiltrees.length) return null;
    const prix = transactionsFiltrees.map(t => t.prixM2).filter(Boolean).sort((a, b) => a - b);
    if (!prix.length) return null;
    const mid = Math.floor(prix.length / 2);
    return prix.length % 2 === 0 ? Math.round((prix[mid - 1] + prix[mid]) / 2) : prix[mid];
  })();

  // ── GRAPHIQUE : prix médian par année (données déjà chargées) ──
  const chartDataAnnees = useMemo(() => {
    if (!results?.transactions?.length) return [];
    const byYear = {};
    results.transactions.forEach(t => {
      const y = t.date?.substring(0, 4);
      if (!y || !t.prixM2 || t.prixM2 < 1000) return;
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push(t.prixM2);
    });
    return Object.entries(byYear).sort(([a], [b]) => a.localeCompare(b)).map(([annee, prix]) => {
      const sorted = [...prix].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const mediane = sorted.length % 2 === 0 ? Math.round((sorted[mid-1]+sorted[mid])/2) : sorted[mid];
      return { annee, mediane, nb: prix.length };
    });
  }, [results]);

  // Années disponibles
  const anneesDisponibles = useMemo(() => {
    if (!results?.transactions?.length) return [];
    return [...new Set(results.transactions.map(t => t.date?.substring(0, 4)).filter(Boolean))].sort();
  }, [results]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Barre de contrôle */}
      <div style={{ background: '#fffdf8', border: '1px solid #e8dcc8', borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a3a5c' }}>🗺️ Recherche DVF — France entière · cliquez sur la carte ou saisissez</h3>
          <div style={{ display: 'flex', background: '#f0ead8', borderRadius: 8, padding: 3, gap: 2 }}>
            {[['split', '⬛⬛ Mixte'], ['map', '🗺️ Carte'], ['table', '📋 Tableau']].map(([v, l]) => (
              <button key={v} onClick={() => setViewMode(v)} style={{ padding: '5px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: viewMode === v ? 700 : 400, background: viewMode === v ? '#fff' : 'transparent', color: viewMode === v ? '#c9a84c' : '#8a9ab0' }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
          {/* Commune */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5a7a9a', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              Commune {loadingSuggestions && <span style={{ color: '#c9a84c' }}>⏳</span>}
              {communeSelectee && <span style={{ color: '#16a34a', marginLeft: 4 }}>✓</span>}
            </label>
            <input type="text" value={communeInput} onChange={e => rechercherCommunes(e.target.value)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} onFocus={() => communeSuggestions.length > 0 && setShowSuggestions(true)} placeholder="Fontenay-sous-Bois, Lyon…" style={{ ...styles.input, width: '100%', paddingRight: 12, borderColor: communeSelectee ? '#16a34a' : undefined }}/>
            {showSuggestions && communeSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: '#fff', border: '1px solid #e8dcc8', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden' }}>
                {communeSuggestions.map((c, i) => (
                  <div key={c.code} onMouseDown={() => choisirCommune(c)} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, borderBottom: i < communeSuggestions.length - 1 ? '1px solid #f0ead8' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.background = '#fef9f0'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <span style={{ fontWeight: 600, color: '#1a3a5c' }}>{c.nom}</span>
                    <span style={{ fontSize: 11, color: '#8a9ab0' }}>{c.departement?.nom || ''} · {c.codesPostaux?.[0] || c.code}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Rue */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5a7a9a', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Nom de rue <span style={{ color: '#c4b898', fontWeight: 400 }}>(ou clic carte)</span></label>
            <input type="text" value={rue} onChange={e => setRue(e.target.value)} onKeyDown={e => e.key === 'Enter' && lancerRecherche()} placeholder="ex: BEAUMONTS, GAMBETTA…" style={{ ...styles.input, width: '100%', paddingRight: 12 }}/>
          </div>
          <button onClick={() => lancerRecherche()} disabled={loading || !rue.trim() || !communeSelectee} style={{ padding: '10px 20px', background: loading ? '#8a9ab0' : !communeSelectee ? '#d4c5a0' : '#c9a84c', color: '#fff', border: 'none', borderRadius: 8, cursor: loading || !communeSelectee ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}>
            {loading ? '⏳' : '🔍'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#8a9ab0', marginTop: 8 }}>DVF DGFiP · Maisons · 2020 → 2025 · 200 ventes les plus récentes</p>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#991b1b' }}>⚠ {error}</div>}

      {/* ── GRAPHIQUE ÉVOLUTION PRIX/M² PAR ANNÉE ── */}
      {chartDataAnnees.length >= 2 && (
        <div style={{ background: '#fffdf8', border: '1px solid #e8dcc8', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a3a5c' }}>📈 Évolution du prix médian/m²</h3>
              <p style={{ fontSize: 11, color: '#8a9ab0', marginTop: 2 }}>{results?.rue} — {results?.commune} · maisons</p>
            </div>
            {/* Filtre années */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button onClick={() => setActiveYear('all')} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: activeYear === 'all' ? 700 : 400, background: activeYear === 'all' ? '#c9a84c' : '#f0ead8', color: activeYear === 'all' ? '#fff' : '#8a9ab0' }}>Toutes</button>
              {anneesDisponibles.map(y => (
                <button key={y} onClick={() => setActiveYear(y)} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: activeYear === y ? 700 : 400, background: activeYear === y ? '#1a3a5c' : '#f0ead8', color: activeYear === y ? '#fff' : '#8a9ab0' }}>{y}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartDataAnnees} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ead8" vertical={false}/>
              <XAxis dataKey="annee" tick={{ fontSize: 12, fill: '#8a9ab0' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: '#8a9ab0' }} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString('fr-FR')}/>
              <Tooltip formatter={(v, name) => [v.toLocaleString('fr-FR') + ' €/m²', 'Prix médian']} contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 13 }} labelStyle={{ fontWeight: 700, color: '#1a3a5c' }}/>
              <Bar dataKey="mediane" radius={[6, 6, 0, 0]} fill="#c9a84c" name="Prix médian/m²">
                {chartDataAnnees.map((entry, i) => (
                  <Cell key={i} fill={entry.annee === activeYear ? '#1a3a5c' : '#c9a84c'} opacity={activeYear === 'all' || entry.annee === activeYear ? 1 : 0.35}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Tendance */}
          {chartDataAnnees.length >= 2 && (() => {
            const first = chartDataAnnees[0].mediane;
            const last = chartDataAnnees[chartDataAnnees.length - 1].mediane;
            const pct = Math.round(((last - first) / first) * 100);
            const color = pct >= 0 ? '#16a34a' : '#dc2626';
            return (
              <div style={{ display: 'flex', gap: 20, marginTop: 12, padding: '10px 14px', background: '#f9f5ee', borderRadius: 10 }}>
                <div><span style={{ fontSize: 11, color: '#8a9ab0' }}>Première vente</span><div style={{ fontSize: 14, fontWeight: 700, color: '#1a3a5c' }}>{chartDataAnnees[0].mediane.toLocaleString('fr-FR')} €/m² ({chartDataAnnees[0].annee})</div></div>
                <div><span style={{ fontSize: 11, color: '#8a9ab0' }}>Dernière vente</span><div style={{ fontSize: 14, fontWeight: 700, color: '#1a3a5c' }}>{last.toLocaleString('fr-FR')} €/m² ({chartDataAnnees[chartDataAnnees.length-1].annee})</div></div>
                <div><span style={{ fontSize: 11, color: '#8a9ab0' }}>Évolution</span><div style={{ fontSize: 14, fontWeight: 700, color }}>{pct > 0 ? '+' : ''}{pct}%</div></div>
                {mediane && <div><span style={{ fontSize: 11, color: '#8a9ab0' }}>Médiane actuelle</span><div style={{ fontSize: 14, fontWeight: 700, color: '#c9a84c' }}>{mediane.toLocaleString('fr-FR')} €/m²</div></div>}
              </div>
            );
          })()}
        </div>
      )}

      {/* Layout carte + tableau */}
      <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'map' ? '1fr' : viewMode === 'table' ? '1fr' : '1fr 1fr', gap: 16 }}>

        {/* ── FIX LEAFLET : div toujours dans le DOM, juste cachée ── */}
        <div style={{ display: viewMode === 'table' ? 'none' : 'block', background: '#fffdf8', border: '1px solid #e8dcc8', borderRadius: 16, overflow: 'hidden', height: 480, position: 'relative' }}>
          {!mapReady && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0ead8', zIndex: 10 }}><span style={{ color: '#8a9ab0', fontSize: 13 }}>Chargement de la carte…</span></div>}
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }}/>
          {!results && mapReady && <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(26,58,92,0.85)', color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500, zIndex: 500, whiteSpace: 'nowrap' }}>👆 Cliquez sur une rue pour voir les ventes</div>}
          {loading && <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: '#c9a84c', color: '#fff', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, zIndex: 500 }}>Recherche…</div>}
        </div>

        {/* Tableau */}
        {viewMode !== 'map' && (
          <div style={{ background: '#fffdf8', border: '1px solid #e8dcc8', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e8dcc8' }}>
              {results ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a3a5c' }}>{results.rue || results.commune} — {results.commune}</div>
                      <div style={{ fontSize: 11, color: '#8a9ab0', marginTop: 2 }}>
                        {transactionsFiltrees.length} vente{transactionsFiltrees.length > 1 ? 's' : ''}
                        {activeYear !== 'all' ? ` en ${activeYear}` : ` (${results.nb} total)`}
                        {filterTexte.trim() && <span style={{ color: '#c9a84c', marginLeft: 6 }}>· filtre : "{filterTexte}"</span>}
                      </div>
                    </div>
                    {mediane && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: '#8a9ab0', textTransform: 'uppercase', fontWeight: 600 }}>Prix médian</div><div style={{ fontSize: 18, fontWeight: 700, color: '#c9a84c' }}>{fmtM2Local(mediane)}</div></div>}
                  </div>
                  {/* Filtre texte local — utile surtout pour les données 2014-2019 sans adresse */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={filterTexte}
                      onChange={e => setFilterTexte(e.target.value)}
                      placeholder="Filtrer par adresse, surface, prix, nb pièces…"
                      style={{ flex: 1, padding: '7px 12px', border: '1px solid #e8dcc8', borderRadius: 8, fontSize: 12, outline: 'none', background: '#faf9f7', color: '#1a3a5c' }}
                    />
                    {filterTexte && (
                      <button onClick={() => setFilterTexte('')} style={{ padding: '6px 10px', border: 'none', borderRadius: 8, background: '#f0ead8', cursor: 'pointer', fontSize: 12, color: '#8a9ab0', fontWeight: 600 }}>✕</button>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ color: '#8a9ab0', fontSize: 13 }}>{loading ? 'Chargement…' : 'Sélectionnez une commune et cherchez une rue'}</div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 420 }}>
              {results?.nb === 0 && <div style={{ textAlign: 'center', padding: '32px 16px', color: '#8a9ab0', fontSize: 13 }}>Aucune vente trouvée.<br/><span style={{ fontSize: 11 }}>Essayez avec un nom partiel</span></div>}
              {transactionsFiltrees.map((t, i) => (
                <div key={i} onClick={() => { if (t.lat && leafletMap.current) { leafletMap.current.setView([t.lat, t.lng], 17); setViewMode('split'); }}} style={{ padding: '11px 18px', borderBottom: '1px solid #f0ead8', cursor: t.lat ? 'pointer' : 'default', background: i % 2 === 0 ? 'transparent' : '#faf7f2' }} onMouseEnter={e => e.currentTarget.style.background = '#fef9f0'} onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : '#faf7f2'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a3a5c' }}>{t.adresse}</div>
                      <div style={{ fontSize: 11, color: '#8a9ab0', marginTop: 2 }}>
                        {new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {t.pieces ? ` · ${t.pieces} pièces` : ''}{t.terrain ? ` · terrain ${t.terrain} m²` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a3a5c' }}>{fmtLocal(t.prix)}</div>
                      <div style={{ fontSize: 11, color: '#c9a84c', fontWeight: 600 }}>{t.surface ? t.surface + ' m² · ' : ''}{fmtM2Local(t.prixM2)}</div>
                    </div>
                  </div>
                  {t.lat && <div style={{ fontSize: 10, color: '#c4b898', marginTop: 3 }}>📍 Cliquer pour localiser</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Source des données */}
      {results && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: '#15803d', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <span>
            <strong>Historique complet 2014-2025</strong> —{' '}
            {results.nb_historiques > 0
              ? `${results.nb_historiques} ventes 2014-2019 (Cerema/Supabase) + ${results.nb_recents} ventes 2020-2025 (DGFiP)`
              : `Données DVF data.gouv.fr 2020-2025`
            }
          </span>
        </div>
      )}
    </div>
  );
}



// ─── COMPOSANT MARCHÉ IMMOBILIER (onglet principal) ────────────────────────
// Wrapper simple qui affiche le simulateur en mode marché
function MarcheImmobilierPage() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #e8e4dd" }}>
        <div style={{ width: 48, height: 48, background: "linear-gradient(135deg,#1a3a5c,#2d5986)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔍</div>
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: "#1a1a2e", lineHeight: 1.2 }}>Marché immobilier</h2>
          <p style={{ fontSize: 13, color: "#8a8578", marginTop: 2 }}>Annonces en vente · Vérifiez la correspondance avec votre budget depuis l&apos;onglet 🏠 Immobilier</p>
        </div>
      </div>
      <MarcheAnnonces/>
    </div>
  );
}

// ─── COMPOSANT MARCHÉ ANNONCES ────────────────────────────────────────────
function MarcheAnnonces() {
  const [communeInput, setCommuneInput] = useState('Fontenay-sous-Bois');
  const [communeSuggestions, setCommuneSuggestions] = useState([]);
  const [communeSelectee, setCommuneSelectee] = useState({ code: '94033', nom: 'Fontenay-sous-Bois', cp: '94120', dept: '94' });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [budgetMax, setBudgetMax] = useState(580000);
  const [budgetMin, setBudgetMin] = useState(400000);
  const [surfaceMin, setSurfaceMin] = useState(100);
  const [pieces, setPieces] = useState(4);
  const [dvfData, setDvfData] = useState(null);
  const [dvfLoading, setDvfLoading] = useState(false);
  const suggestTimer = useRef(null);

  const rechercherCommunes = (val) => {
    setCommuneInput(val);
    setCommuneSelectee(null);
    clearTimeout(suggestTimer.current);
    if (val.length < 2) { setCommuneSuggestions([]); setShowSuggestions(false); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(val)}&fields=code,nom,codesPostaux,departement&limit=6&boost=population`);
        const data = await res.json();
        setCommuneSuggestions(data || []);
        setShowSuggestions(true);
      } catch {}
    }, 250);
  };

  const choisirCommune = (c) => {
    setCommuneSelectee({ code: c.code, nom: c.nom, cp: c.codesPostaux?.[0] || '', dept: c.departement?.code || c.code.slice(0, 2) });
    setCommuneInput(`${c.nom} (${c.departement?.nom || c.codesPostaux?.[0] || ''})`);
    setCommuneSuggestions([]);
    setShowSuggestions(false);
  };

  // Charger le prix DVF de la commune pour comparaison
  useEffect(() => {
    if (!communeSelectee?.code) return;
    setDvfLoading(true);
    setDvfData(null);
    fetch(`/api/dvf?mode=historique&commune=${communeSelectee.code}`)
      .then(r => r.json())
      .then(d => { setDvfData(d); setDvfLoading(false); })
      .catch(() => setDvfLoading(false));
  }, [communeSelectee?.code]);

  // Fonction de génération d'URL pour chaque site
  const buildUrls = () => {
    if (!communeSelectee) return null;
    const { nom, cp, dept, code } = communeSelectee;
    const slug = nom.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const deptNum = dept || cp?.slice(0, 2) || '94';

    return {
      bienici: `https://www.bienici.com/recherche/achat/${slug}-${cp}/maisonvilla?prix-max=${budgetMax}&surface-min=${surfaceMin}&nb-pieces-min=${pieces}`,
      lbc:     `https://www.leboncoin.fr/recherche?category=9&real_estate_type=1&locations=${cp}&price=min-${budgetMax}&square=${surfaceMin}-max&rooms=${pieces}-max`,
      pap:     `https://www.pap.fr/annonce/vente-maisons-${slug}-g${code}?prix-max=${budgetMax}&surface-min=${surfaceMin}&nb-pieces-min=${pieces}`,
      seloger: `https://www.seloger.com/list.htm?idtt=2&naturebien=1&zi=${cp}&pxmax=${budgetMax}&surfacemin=${surfaceMin}&nb_pieces_min=${pieces}`,
      ma: `https://www.meilleursagents.com/prix-immobilier/${slug}-${cp}/`,
    };
  };

  const urls = buildUrls();
  const prixM2Estime = dvfData?.prix_m2_median;
  const surfaceEstimee = prixM2Estime ? Math.round(budgetMax / prixM2Estime) : null;

  const iS = { padding: '9px 14px', border: '1px solid #ddd8d0', borderRadius: 10, fontSize: 14, width: '100%', outline: 'none', background: '#faf9f7', fontFamily: "'DM Sans',sans-serif" };
  const nS = { padding: '9px 14px', border: '1px solid #ddd8d0', borderRadius: 10, fontSize: 14, width: '100%', outline: 'none', background: '#faf9f7', fontFamily: "'DM Sans',sans-serif", textAlign: 'right' };

  const SITES = [
    { key: 'bienici', label: "Bien'ici",  emoji: '🏠', color: '#2563eb', desc: 'Carte 3D · Agences + particuliers' },
    { key: 'lbc',     label: 'LeBonCoin', emoji: '🟠', color: '#f97316', desc: 'Particuliers · Sans frais agence' },
    { key: 'pap',     label: 'PAP',       emoji: '📋', color: '#16a34a', desc: 'Particulier à particulier · 0 frais' },
    { key: 'seloger', label: 'SeLoger',   emoji: '🔵', color: '#0ea5e9', desc: 'Agences · Offre la plus complète' },
    { key: 'ma',      label: 'Prix du marché', emoji: '📊', color: '#7c3aed', desc: 'MeilleursAgents · Prix/m² actuels' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Formulaire paramètres ── */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid rgba(26,26,46,0.06)', boxShadow: '0 2px 12px rgba(26,26,46,0.04)' }}>
        <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, marginBottom: 18, color: '#1a1a2e' }}>🎯 Vos critères de recherche</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, alignItems: 'end' }}>

          {/* Commune avec autocomplétion */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8a8578', marginBottom: 6, textTransform: 'uppercase' }}>
              Commune {communeSelectee && <span style={{ color: '#16a34a' }}>✓</span>}
            </label>
            <input type="text" value={communeInput} onChange={e => rechercherCommunes(e.target.value)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} onFocus={() => communeSuggestions.length > 0 && setShowSuggestions(true)} placeholder="Ville…" style={{ ...iS, borderColor: communeSelectee ? '#16a34a' : undefined }}/>
            {showSuggestions && communeSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: '#fff', border: '1px solid #e8e4dd', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden' }}>
                {communeSuggestions.map((c, i) => (
                  <div key={c.code} onMouseDown={() => choisirCommune(c)} style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, borderBottom: i < communeSuggestions.length - 1 ? '1px solid #f2efeb' : 'none', display: 'flex', justifyContent: 'space-between' }} onMouseEnter={e => e.currentTarget.style.background = '#fef9f0'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <span style={{ fontWeight: 600 }}>{c.nom}</span>
                    <span style={{ fontSize: 11, color: '#8a8578' }}>{c.codesPostaux?.[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Budget */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8a8578', marginBottom: 6, textTransform: 'uppercase' }}>Budget max (€)</label>
            <input type="number" value={budgetMax} onChange={e => setBudgetMax(+e.target.value)} step={10000} style={nS}/>
          </div>

          {/* Surface */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8a8578', marginBottom: 6, textTransform: 'uppercase' }}>Surface min (m²)</label>
            <input type="number" value={surfaceMin} onChange={e => setSurfaceMin(+e.target.value)} style={nS}/>
          </div>

          {/* Pièces */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8a8578', marginBottom: 6, textTransform: 'uppercase' }}>Pièces min</label>
            <select value={pieces} onChange={e => setPieces(+e.target.value)} style={{ ...iS, cursor: 'pointer' }}>
              {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} pièces</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Contexte marché (DVF) ── */}
      {communeSelectee && (
        <div style={{ background: 'linear-gradient(135deg,#1a3a5c,#2d5986)', borderRadius: 16, padding: 20, color: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Commune</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#d4af37' }}>{communeSelectee.nom}</div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{communeSelectee.cp}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Prix DVF médian/m²</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#d4af37' }}>
              {dvfLoading ? '...' : prixM2Estime ? `${prixM2Estime.toLocaleString('fr-FR')} €/m²` : 'N/A'}
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>Maisons vendues 2022-2025</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Surface estimée</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: surfaceEstimee && surfaceEstimee >= surfaceMin ? '#4ade80' : '#f87171' }}>
              {surfaceEstimee ? `~${surfaceEstimee} m²` : 'N/A'}
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>Pour {budgetMax.toLocaleString('fr-FR')} €</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Faisabilité</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {!prixM2Estime ? '—' :
               surfaceEstimee >= surfaceMin ? '✅ Réaliste' :
               surfaceEstimee >= surfaceMin * 0.8 ? '⚠️ Limite' : '❌ Sous critères'}
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
              {prixM2Estime && surfaceEstimee < surfaceMin
                ? `Manque ~${Math.round((surfaceMin - surfaceEstimee) * prixM2Estime / 1000)}k€`
                : ''}
            </div>
          </div>
        </div>
      )}

      {/* ── Grille des sites ── */}
      {urls && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: '#1a1a2e' }}>🔗 Voir les annonces maintenant</h3>
            <span style={{ fontSize: 12, color: '#8a8578' }}>Filtres pré-remplis avec vos critères</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {SITES.map(site => (
              <a key={site.key} href={urls[site.key]} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: '#fff', border: `1px solid ${site.color}22`, borderLeft: `4px solid ${site.color}`, borderRadius: 12, textDecoration: 'none', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${site.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{site.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: site.color }}>{site.label}</div>
                  <div style={{ fontSize: 11, color: '#8a8578', marginTop: 2 }}>{site.desc}</div>
                  <div style={{ fontSize: 10, color: '#c4c0b8', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {budgetMax.toLocaleString('fr-FR')} € · {surfaceMin}m²+ · {pieces}p+
                  </div>
                </div>
                <div style={{ fontSize: 16, color: site.color, flexShrink: 0 }}>→</div>
              </a>
            ))}
          </div>

          <div style={{ marginTop: 14, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, fontSize: 12, color: '#92400e', display: 'flex', gap: 10 }}>
            <span>💡</span>
            <span>
              <strong>Conseil :</strong> LeBonCoin et PAP proposent des biens de particuliers à particuliers (sans frais d'agence). 
              Bien'ici et SeLoger agrègent agences + particuliers. Multipliez les sources pour ne rien rater.
              Les filtres sont pré-remplis avec vos critères — vous arrivez directement sur les résultats.
            </span>
          </div>
        </div>
      )}

      {/* ── Note budget simulateur ── */}
      <div style={{ padding: '14px 18px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, fontSize: 13, color: '#0369a1', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 16 }}>🏠</span>
        <span>
          Pour voir votre <strong>budget d'achat calculé précisément</strong> (capacité d'emprunt, apport, mensualités),
          rendez-vous dans l'onglet <strong>🏠 Immobilier → 📊 Simulation</strong>.
          Ce budget est automatiquement repris dans les filtres des sites ci-dessus si vous passez par l'onglet Marché actuel du simulateur.
        </span>
      </div>
    </div>
  );
}

// ─── COMPOSANT MARCHÉ (onglet interne simulateur) ─────────────────────────
function MarcheImmobilier({ r, surfaceMin, nbChambres, styles }) {
  const [communeInput, setCommuneInput] = useState('Fontenay-sous-Bois');
  const [communeSuggestions, setCommuneSuggestions] = useState([]);
  const [communeSelectee, setCommuneSelectee] = useState({ code: '94033', nom: 'Fontenay-sous-Bois', cp: '94120', dept: '94' });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dvfData, setDvfData] = useState(null);
  const suggestTimer = useRef(null);

  // Budget depuis le simulateur
  const budgetMax = Math.round(r.budgetNet);
  const budgetMin = Math.round(r.budgetNet * 0.7);

  const rechercherCommunes = (val) => {
    setCommuneInput(val); setCommuneSelectee(null);
    clearTimeout(suggestTimer.current);
    if (val.length < 2) { setCommuneSuggestions([]); setShowSuggestions(false); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(val)}&fields=code,nom,codesPostaux,departement&limit=6&boost=population`);
        const data = await res.json();
        setCommuneSuggestions(data || []); setShowSuggestions(true);
      } catch {}
    }, 250);
  };

  const choisirCommune = (c) => {
    setCommuneSelectee({ code: c.code, nom: c.nom, cp: c.codesPostaux?.[0] || '', dept: c.departement?.code || c.code.slice(0, 2) });
    setCommuneInput(`${c.nom} (${c.departement?.nom || c.codesPostaux?.[0] || ''})`);
    setCommuneSuggestions([]); setShowSuggestions(false);
  };

  useEffect(() => {
    if (!communeSelectee?.code) return;
    setDvfData(null);
    fetch(`/api/dvf?mode=historique&commune=${communeSelectee.code}`)
      .then(r => r.json()).then(setDvfData).catch(() => {});
  }, [communeSelectee?.code]);

  const buildUrls = () => {
    if (!communeSelectee) return null;
    const { nom, cp, dept } = communeSelectee;
    const slug = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const deptNum = dept || '94';
    return {
      bienici:   `https://www.bienici.com/recherche/achat/${slug}-${cp}/maisonvilla?prix-max=${budgetMax}&prix-min=${budgetMin}&surface-min=${surfaceMin}&nb-pieces-min=${nbChambres+1}`,
      lbc:       `https://www.leboncoin.fr/recherche?category=9&real_estate_type=1&locations=${cp}&price=min-${budgetMax}&square=${surfaceMin}-max&rooms=${nbChambres+1}-max`,
      pap:       `https://www.pap.fr/annonce/vente-maisons-${slug}-g${communeSelectee.code}?prix-max=${budgetMax}&prix-min=${budgetMin}&surface-min=${surfaceMin}&nb-pieces-min=${nbChambres+1}`,
      ma:        `https://www.meilleursagents.com/prix-immobilier/${slug}-${cp}/`,
      seloger:   `https://www.seloger.com/list.htm?idtt=2&naturebien=1&zi=${cp}&pxmax=${budgetMax}&surfacemin=${surfaceMin}&nb_pieces_min=${nbChambres+1}`,
    };
  };

  const urls = buildUrls();
  const prixM2 = dvfData?.prix_m2_median;
  const surfaceEstimee = prixM2 ? Math.round(budgetMax / prixM2) : null;

  const SITES = [
    { key: 'bienici', label: "Bien'ici",  emoji: '🏠', color: '#2563eb' },
    { key: 'lbc',     label: 'LeBonCoin', emoji: '🟠', color: '#f97316' },
    { key: 'pap',     label: 'PAP',       emoji: '📋', color: '#16a34a' },
    { key: 'seloger', label: 'SeLoger',   emoji: '🔵', color: '#0ea5e9' },
    { key: 'ma',      label: 'MeilleursAgents', emoji: '📊', color: '#7c3aed' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#fffdf8', border: '1px solid #e8dcc8', borderRadius: 14, padding: 18 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a3a5c', marginBottom: 12 }}>🏘️ Annonces correspondant à votre budget simulateur</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <input type="text" value={communeInput} onChange={e => rechercherCommunes(e.target.value)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} onFocus={() => communeSuggestions.length > 0 && setShowSuggestions(true)} placeholder="Commune…" style={{ ...styles.input, width: '100%', paddingRight: 12, borderColor: communeSelectee ? '#16a34a' : undefined }}/>
            {showSuggestions && communeSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: '#fff', border: '1px solid #e8dcc8', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden' }}>
                {communeSuggestions.map((c, i) => (
                  <div key={c.code} onMouseDown={() => choisirCommune(c)} style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, borderBottom: i < communeSuggestions.length - 1 ? '1px solid #f0ead8' : 'none', display: 'flex', justifyContent: 'space-between' }} onMouseEnter={e => e.currentTarget.style.background = '#fef9f0'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <span style={{ fontWeight: 600, color: '#1a3a5c' }}>{c.nom}</span>
                    <span style={{ fontSize: 11, color: '#8a9ab0' }}>{c.codesPostaux?.[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#5a7a9a', whiteSpace: 'nowrap' }}>
            Budget : <strong style={{ color: '#c9a84c' }}>{budgetMin.toLocaleString('fr-FR')} — {budgetMax.toLocaleString('fr-FR')} €</strong>
          </div>
          <div style={{ fontSize: 13, color: '#5a7a9a', whiteSpace: 'nowrap' }}>
            <strong>{surfaceMin} m²+</strong> · <strong>{nbChambres+1}p+</strong>
          </div>
        </div>

        {/* Indicateur DVF */}
        {prixM2 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 16, padding: '10px 14px', background: '#f9f5ee', borderRadius: 10, fontSize: 13, flexWrap: 'wrap' }}>
            <span>📊 Prix DVF médian : <strong>{prixM2.toLocaleString('fr-FR')} €/m²</strong></span>
            <span>→ Surface estimée : <strong style={{ color: surfaceEstimee >= surfaceMin ? '#16a34a' : '#dc2626' }}>{surfaceEstimee} m²</strong></span>
            <span style={{ color: surfaceEstimee >= surfaceMin ? '#16a34a' : '#dc2626' }}>
              {surfaceEstimee >= surfaceMin ? '✅ Budget cohérent' : `❌ Manque ~${Math.round((surfaceMin - surfaceEstimee) * prixM2 / 1000)}k€`}
            </span>
          </div>
        )}
      </div>

      {/* Boutons sites */}
      {urls && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {SITES.map(site => (
            <a key={site.key} href={urls[site.key]} target="_blank" rel="noreferrer"
               style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', border: `2px solid ${site.color}33`, borderLeft: `4px solid ${site.color}`, borderRadius: 12, textDecoration: 'none', transition: 'transform 0.15s' }}
               onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
               onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <span style={{ fontSize: 22 }}>{site.emoji}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: site.color }}>{site.label}</div>
                <div style={{ fontSize: 11, color: '#8a9ab0', marginTop: 1 }}>Filtres pré-remplis → cliquer pour voir</div>
              </div>
              <span style={{ marginLeft: 'auto', color: site.color, fontSize: 16 }}>→</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}



// ─── COMPOSANT ESTIMATION DVF DU BIEN ────────────────────────────────────────
function EstimationBienDVF({ prixVente, onPrixChange }) {
  const [dvfData, setDvfData]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [surfaceCarrez, setSurfaceCarrez] = useState(72);
  const [surfaceNiv0, setSurfaceNiv0]    = useState(35);
  const [terrain, setTerrain]       = useState(0);      // m² terrain
  const [travaux, setTravaux]       = useState(0);      // € travaux estimés
  const [anneeConst, setAnneeConst] = useState(1970);   // année construction
  const [etat, setEtat]             = useState('bon');  // etat du bien
  const [communeInput, setCommuneInput] = useState('Fontenay-sous-Bois');
  const [communeCode, setCommuneCode]   = useState('94033');
  const [communeSugg, setCommuneSugg]   = useState([]);
  const [showSugg, setShowSugg]         = useState(false);
  const sugTimer = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dvf?mode=historique&commune=${communeCode}`)
      .then(r => r.json())
      .then(d => { setDvfData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [communeCode]);

  const rechercherCommune = (val) => {
    setCommuneInput(val);
    clearTimeout(sugTimer.current);
    if (val.length < 2) { setCommuneSugg([]); setShowSugg(false); return; }
    sugTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(val)}&fields=code,nom,codesPostaux,departement&limit=6&boost=population`);
        const data = await res.json();
        setCommuneSugg(data || []); setShowSugg(true);
      } catch {}
    }, 250);
  };

  const choisirCommune = (c) => {
    setCommuneCode(c.code);
    setCommuneInput(`${c.nom} (${c.codesPostaux?.[0] || ''})`);
    setCommuneSugg([]); setShowSugg(false);
  };

  const surfacePonderee = surfaceCarrez + surfaceNiv0 * 0.6;
  const prixM2 = dvfData?.prix_m2_median;

  // Coefficient d'état
  const coefEtat = { 'excellent': 1.08, 'bon': 1.0, 'moyen': 0.92, 'travaux': 0.82 }[etat] || 1.0;
  // Coefficient ancienneté (légère décote pour très ancien)
  const age = new Date().getFullYear() - anneeConst;
  const coefAge = age < 10 ? 1.05 : age < 30 ? 1.0 : age < 60 ? 0.97 : 0.94;
  // Bonus terrain (si > 100m², légère plus-value ~500€/m² au-delà de 100m²)
  const bonusTerrain = terrain > 100 ? Math.round((terrain - 100) * 350) : 0;

  const coefTotal = coefEtat * coefAge;
  const estimBasse    = prixM2 ? Math.round((prixM2 * 0.90 * coefTotal * surfacePonderee + bonusTerrain - travaux) / 1000) * 1000 : null;
  const estimCentrale = prixM2 ? Math.round((prixM2 * coefTotal * surfacePonderee + bonusTerrain - travaux * 0.5) / 1000) * 1000 : null;
  const estimHaute    = prixM2 ? Math.round((prixM2 * 1.10 * coefTotal * surfacePonderee + bonusTerrain) / 1000) * 1000 : null;

  const ecart = estimCentrale && prixVente ? Math.round(((prixVente - estimCentrale) / estimCentrale) * 100) : null;
  const ecartColor = ecart === null ? '#8a9ab0' : Math.abs(ecart) <= 10 ? '#16a34a' : ecart > 10 ? '#7c3aed' : '#dc2626';
  const ecartLabel  = ecart === null ? '—' : Math.abs(ecart) <= 10 ? '✅ Cohérent' : ecart > 10 ? '⬆️ Au-dessus du marché' : '⬇️ En dessous';

  // Indicateur de liquidité (temps de vente estimé basé sur écart marché)
  const liquidite = ecart === null ? null : ecart < -5 ? { label: 'Vente rapide', color: '#16a34a', icon: '🔥' } : ecart <= 5 ? { label: 'Vente normale', color: '#0369a1', icon: '✅' } : ecart <= 15 ? { label: 'Vente lente', color: '#f59e0b', icon: '⏳' } : { label: 'Difficile à vendre', color: '#dc2626', icon: '⚠️' };

  const iS = { padding: '8px 12px', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 13, width: '100%', background: '#fff', textAlign: 'right', fontFamily: "'DM Sans',sans-serif", color: '#1e3a5f' };
  const lS = { fontSize: 10, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 };

  return (
    <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: '1.5px solid #7dd3fc', borderRadius: 18, padding: 24, marginTop: 0 }}>

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 8 }}>
            📊 Estimation DVF de votre bien
            {loading && <span style={{ fontSize: 11, background: '#bae6fd', color: '#0369a1', padding: '2px 8px', borderRadius: 6 }}>⏳ Chargement…</span>}
          </div>
          <div style={{ fontSize: 12, color: '#38bdf8', marginTop: 4 }}>Basé sur les ventes réelles DVF · Mise à jour semestrielle</div>
        </div>
        {estimCentrale && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#38bdf8', textTransform: 'uppercase', fontWeight: 600 }}>Estimation centrale</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0369a1', fontFamily: "'DM Serif Display',serif" }}>{estimCentrale.toLocaleString('fr-FR')} €</div>
          </div>
        )}
      </div>

      {/* Grille paramètres */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 1.5fr', gap: 12, marginBottom: 16 }}>

        {/* Commune */}
        <div style={{ gridColumn: 'span 2', position: 'relative' }}>
          <label style={lS}>Commune</label>
          <input type="text" value={communeInput} onChange={e => rechercherCommune(e.target.value)}
            onBlur={() => setTimeout(() => setShowSugg(false), 150)}
            onFocus={() => communeSugg.length > 0 && setShowSugg(true)}
            style={{ ...iS, textAlign: 'left' }} placeholder="Fontenay-sous-Bois…"/>
          {showSugg && communeSugg.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#fff', border: '1px solid #bae6fd', borderRadius: 10, boxShadow: '0 8px 24px rgba(3,105,161,0.12)', marginTop: 4, overflow: 'hidden' }}>
              {communeSugg.map((c, i) => (
                <div key={c.code} onMouseDown={() => choisirCommune(c)}
                  style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, borderBottom: i < communeSugg.length - 1 ? '1px solid #f0f9ff' : 'none', display: 'flex', justifyContent: 'space-between' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <span style={{ fontWeight: 600, color: '#0369a1' }}>{c.nom}</span>
                  <span style={{ fontSize: 11, color: '#7dd3fc' }}>{c.codesPostaux?.[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={lS}>Surface Carrez (m²)</label>
          <input type="number" value={surfaceCarrez} onChange={e => setSurfaceCarrez(+e.target.value)} style={iS}/>
        </div>
        <div>
          <label style={lS}>Niv.0 / sous-sol (m²)</label>
          <input type="number" value={surfaceNiv0} onChange={e => setSurfaceNiv0(+e.target.value)} style={iS}/>
        </div>
        <div>
          <label style={lS}>Surface pondérée</label>
          <div style={{ ...iS, background: '#bae6fd', color: '#0369a1', fontWeight: 700, cursor: 'default' }}>{Math.round(surfacePonderee)} m²</div>
        </div>

        <div>
          <label style={lS}>Terrain (m²)</label>
          <input type="number" value={terrain} onChange={e => setTerrain(+e.target.value)} style={iS} placeholder="0"/>
        </div>
        <div>
          <label style={lS}>Année construction</label>
          <input type="number" value={anneeConst} onChange={e => setAnneeConst(+e.target.value)} style={iS}/>
        </div>
        <div>
          <label style={lS}>État du bien</label>
          <select value={etat} onChange={e => setEtat(e.target.value)} style={{ ...iS, textAlign: 'left', cursor: 'pointer' }}>
            <option value="excellent">Excellent (+8%)</option>
            <option value="bon">Bon état (réf.)</option>
            <option value="moyen">Moyen (−8%)</option>
            <option value="travaux">Gros travaux (−18%)</option>
          </select>
        </div>
        <div>
          <label style={lS}>Travaux estimés (€)</label>
          <input type="number" value={travaux} onChange={e => setTravaux(+e.target.value)} style={iS} placeholder="0"/>
        </div>
        <div>
          <label style={lS}>Prix/m² DVF médian</label>
          <div style={{ ...iS, background: '#bae6fd', color: '#0369a1', fontWeight: 700, cursor: 'default' }}>
            {prixM2 ? `${prixM2.toLocaleString('fr-FR')} €` : '—'}
          </div>
        </div>
      </div>

      {/* Barre de fourchette visuelle */}
      {estimCentrale && estimBasse && estimHaute && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 8, marginBottom: 8 }}>
            <div style={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Basse (−10%)</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0369a1' }}>{estimBasse.toLocaleString('fr-FR')} €</div>
              <div style={{ fontSize: 11, color: '#7dd3fc', marginTop: 2 }}>{Math.round(estimBasse / surfacePonderee).toLocaleString('fr-FR')} €/m²</div>
            </div>
            <div style={{ background: '#0369a1', borderRadius: 12, padding: '12px 16px', textAlign: 'center', boxShadow: '0 4px 20px rgba(3,105,161,0.25)' }}>
              <div style={{ fontSize: 10, color: '#bae6fd', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Estimation centrale</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: "'DM Serif Display',serif" }}>{estimCentrale.toLocaleString('fr-FR')} €</div>
              <div style={{ fontSize: 12, color: '#7dd3fc', marginTop: 2 }}>{Math.round(estimCentrale / surfacePonderee).toLocaleString('fr-FR')} €/m² pondéré</div>
              {(bonusTerrain > 0 || travaux > 0) && (
                <div style={{ fontSize: 10, color: '#bae6fd', marginTop: 4 }}>
                  {bonusTerrain > 0 ? `+${bonusTerrain.toLocaleString('fr-FR')}€ terrain` : ''}
                  {bonusTerrain > 0 && travaux > 0 ? ' · ' : ''}
                  {travaux > 0 ? `−${Math.round(travaux * 0.5).toLocaleString('fr-FR')}€ travaux` : ''}
                </div>
              )}
            </div>
            <div style={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: 12, padding: '12px 16px', textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Haute (+10%)</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0369a1' }}>{estimHaute.toLocaleString('fr-FR')} €</div>
              <div style={{ fontSize: 11, color: '#7dd3fc', marginTop: 2 }}>{Math.round(estimHaute / surfacePonderee).toLocaleString('fr-FR')} €/m²</div>
            </div>
          </div>
        </div>
      )}

      {/* Ligne comparaison + actions */}
      {estimCentrale && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'center' }}>
          <div style={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>Prix saisi</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f' }}>{prixVente.toLocaleString('fr-FR')} €</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: ecartColor, marginTop: 2 }}>
              {ecart !== null ? (ecart > 0 ? `+${ecart}%` : `${ecart}%`) : ''} vs DVF
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>Positionnement</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: ecartColor }}>{ecartLabel}</div>
            <div style={{ fontSize: 11, color: '#7dd3fc', marginTop: 2 }}>Fourchette ±10% autour DVF</div>
          </div>
          {liquidite && (
            <div style={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>Liquidité estimée</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: liquidite.color }}>{liquidite.icon} {liquidite.label}</div>
              <div style={{ fontSize: 11, color: '#7dd3fc', marginTop: 2 }}>Basé sur positionnement prix</div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => onPrixChange(estimCentrale)}
              style={{ padding: '10px 16px', background: '#0369a1', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
              📌 Utiliser {estimCentrale.toLocaleString('fr-FR')} €
            </button>
            {estimBasse && (
              <button onClick={() => onPrixChange(estimBasse)}
                style={{ padding: '8px 16px', background: '#fff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                Prudent : {estimBasse.toLocaleString('fr-FR')} €
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 10, color: '#38bdf8', lineHeight: 1.5 }}>
        ⚠️ Prix nets vendeur (hors frais agence et notaire). Niv.0 pondéré à 60% du Carrez. Coefficients état et ancienneté appliqués. Pour une estimation précise, consulter 2-3 agences locales.
        {coefEtat !== 1 && <span> · Coef. état : {coefEtat >= 1 ? '+' : ''}{Math.round((coefEtat - 1) * 100)}%</span>}
        {coefAge !== 1 && <span> · Coef. ancienneté : {coefAge >= 1 ? '+' : ''}{Math.round((coefAge - 1) * 100)}%</span>}
      </div>
    </div>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────

const styles = {
  root: { fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", color: '#1a3a5c' },
  headerBadges: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  badge: (bg, color) => ({ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: bg, color }),
  tabs: { display: 'flex', gap: 4, borderBottom: '1px solid #e8dcc8', marginBottom: 24, overflowX: 'auto' },
  tab: { padding: '10px 18px', fontSize: 14, fontWeight: 500, color: '#8a9ab0', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' },
  tabActive: { padding: '10px 18px', fontSize: 14, fontWeight: 600, color: '#c9a84c', background: 'none', border: 'none', borderBottom: '2px solid #c9a84c', cursor: 'pointer', whiteSpace: 'nowrap' },
  simGrid: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 },
  card: { background: '#fffdf8', border: '1px solid #e8dcc8', borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#1a3a5c', marginBottom: 14 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#5a7a9a', marginBottom: 4 },
  input: { width: '100%', padding: '9px 42px 9px 12px', border: '1px solid #e8dcc8', borderRadius: 8, fontSize: 14, color: '#1a3a5c', background: '#fffdf8', outline: 'none' },
  select: { width: '100%', padding: '9px 12px', border: '1px solid #e8dcc8', borderRadius: 8, fontSize: 14, color: '#1a3a5c', background: '#fffdf8', outline: 'none' },
  suffix: { position: 'absolute', right: 10, fontSize: 12, color: '#c9a84c', pointerEvents: 'none' },
  hint: { fontSize: 11, color: '#8a9ab0', marginTop: 3 },
  modeToggle: { display: 'flex', background: '#f0ead8', borderRadius: 8, padding: 4, gap: 4, marginBottom: 10 },
  modeBtn: { padding: '6px 12px', border: 'none', background: 'transparent', fontSize: 12, fontWeight: 500, color: '#8a9ab0', borderRadius: 6, cursor: 'pointer' },
  modeBtnActive: { padding: '6px 12px', border: 'none', background: '#fff', fontSize: 12, fontWeight: 600, color: '#c9a84c', borderRadius: 6, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  sliderBox: { background: '#fef9f0', border: '1px solid #f0d9a0', borderRadius: 10, padding: 14, marginTop: 4 },
  sliderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  slider: { width: '100%', accentColor: '#c9a84c' },
  sliderLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#c9a84c', marginTop: 6 },
  toggleRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  toggle: { width: 46, height: 24, borderRadius: 12, position: 'relative', flexShrink: 0, transition: 'background 0.2s' },
  toggleDot: { position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s' },
  budgetHero: { background: 'linear-gradient(135deg, #1a3a5c 0%, #2d5986 100%)', borderRadius: 16, padding: 22, color: '#fff', marginBottom: 16 },
  budgetHeroGrid: { display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 16, alignItems: 'center' },
  budgetLabel: { fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  budgetValueLarge: { fontSize: 28, fontWeight: 700, color: '#d4af37' },
  budgetNote: { fontSize: 11, opacity: 0.6, marginTop: 2 },
  soldeVenteRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', margin: '6px -6px', padding: '8px 6px', borderRadius: 6 },
  progressBar: { height: 10, background: '#e8dcc8', borderRadius: 5, overflow: 'visible', position: 'relative' },
  progressFill: { height: '100%', borderRadius: 5, transition: 'width 0.3s, background 0.3s' },
  progressMarker: { position: 'absolute', top: -4, width: 2, height: 18, background: '#ef4444' },
  progressLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8a9ab0', marginTop: 5 },
  statusBadge: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  annoncesHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  infoBox: { background: '#fef9f0', border: '1px solid #f0d9a0', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#92400e', display: 'flex', gap: 10, marginBottom: 20 },
  linkBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '7px 12px', background: '#fffdf8', border: '1px solid #e8dcc8', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#2d4a6d', textDecoration: 'none' },
  annoncesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
  annonceCard: { background: '#fffdf8', border: '1px solid #e8dcc8', borderRadius: 12, overflow: 'hidden' },
  annonceImg: { height: 120, background: 'linear-gradient(135deg, #f0ead8, #e8dcc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, position: 'relative' },
  annonceBadge: { position: 'absolute', top: 10, left: 10, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#fff' },
  annonceBody: { padding: '12px 14px 14px' },
  annonceSpecs: { display: 'flex', gap: 12, fontSize: 12, color: '#5a7a9a', borderTop: '1px solid #f0ead8', paddingTop: 10, marginBottom: 10 },
  annonceStatus: { padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500 },
  scenariosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 },
  scenarioCard: { background: '#fffdf8', borderRadius: 14, padding: 20, position: 'relative' },
  scenarioBadge: { position: 'absolute', top: -10, left: 14, padding: '3px 10px', background: '#22c55e', color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: 4 },
  villesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 },
  villeCard: { background: '#fffdf8', border: '1px solid #e8dcc8', borderRadius: 10, padding: 12 },
  footer: { textAlign: 'center', marginTop: 32, paddingTop: 20, borderTop: '1px solid #e8dcc8', fontSize: 12, color: '#8a9ab0' },
};

// === ROW COMPONENTS ===
function RevEditRow({label,lionel:initL,primeLionel:initPL,ophelie:initO,primeOphelie:initPO,onSave,tdS,iS,bP,bG}){
  const[ed,setEd]=useState(false);
  const[l,setL]=useState(initL);const[pl,setPl]=useState(initPL);
  const[o,setO]=useState(initO);const[po,setPo]=useState(initPO);
  useEffect(()=>{setL(initL);setPl(initPL);setO(initO);setPo(initPO);},[initL,initPL,initO,initPO]);
  const total=(ed?l:initL)+(ed?pl:initPL)+(ed?o:initO)+(ed?po:initPO);
  return(<tr className="row-hover" style={{background:ed?"#fdfbf5":"transparent"}}>
    <td style={{...tdS,fontWeight:600}}>{label}</td>
    <td style={{...tdS,textAlign:"right"}}>{ed?<input style={{...iS,width:90}} type="number" value={l} onChange={e=>setL(+e.target.value)}/>:<span style={{fontVariantNumeric:"tabular-nums"}}>{fmt(initL)}</span>}</td>
    <td style={{...tdS,textAlign:"right"}}>{ed?<input style={{...iS,width:90,borderColor:"#c9a84c"}} type="number" value={pl} onChange={e=>setPl(+e.target.value)} placeholder="0"/>:<span style={{fontVariantNumeric:"tabular-nums",color:initPL>0?"#c9a84c":"#ddd8d0",fontWeight:initPL>0?700:400}}>{initPL>0?`+${fmt(initPL)}`:"—"}</span>}</td>
    <td style={{...tdS,textAlign:"right"}}>{ed?<input style={{...iS,width:90}} type="number" value={o} onChange={e=>setO(+e.target.value)}/>:<span style={{fontVariantNumeric:"tabular-nums"}}>{fmt(initO)}</span>}</td>
    <td style={{...tdS,textAlign:"right"}}>{ed?<input style={{...iS,width:90,borderColor:"#c9a84c"}} type="number" value={po} onChange={e=>setPo(+e.target.value)} placeholder="0"/>:<span style={{fontVariantNumeric:"tabular-nums",color:initPO>0?"#c9a84c":"#ddd8d0",fontWeight:initPO>0?700:400}}>{initPO>0?`+${fmt(initPO)}`:"—"}</span>}</td>
    <td style={{...tdS,textAlign:"right",fontWeight:700,fontFamily:"'DM Serif Display',serif"}}>{fmt(total)}</td>
    <td style={tdS}>{ed
      ?<div style={{display:"flex",gap:6}}><button className="btn-press" style={bP} onClick={()=>{onSave(l,pl,o,po);setEd(false);}}>OK</button><button className="btn-press" style={bG} onClick={()=>{setL(initL);setPl(initPL);setO(initO);setPo(initPO);setEd(false);}}>X</button></div>
      :<button className="btn-press" style={bG} onClick={()=>setEd(true)}>Modifier</button>
    }</td>
  </tr>);
}

function EditRow({label,a:initA,b:initB,onSave,tdS,iS,bP,bG}){const[ed,setEd]=useState(false);const[a,setA]=useState(initA);const[b,setB]=useState(initB);useEffect(()=>{setA(initA);setB(initB);},[initA,initB]);return(<tr className="row-hover" style={{background:ed?"#fdfbf5":"transparent"}}><td style={{...tdS,fontWeight:600}}>{label}</td><td style={{...tdS,textAlign:"right"}}>{ed?<input style={iS} type="number" value={a} onChange={e=>setA(+e.target.value)}/>:<span style={{fontVariantNumeric:"tabular-nums"}}>{fmt(initA)}</span>}</td><td style={{...tdS,textAlign:"right"}}>{ed?<input style={iS} type="number" value={b} onChange={e=>setB(+e.target.value)}/>:<span style={{fontVariantNumeric:"tabular-nums"}}>{fmt(initB)}</span>}</td><td style={{...tdS,textAlign:"right",fontWeight:700}}>{fmt((ed?a:initA)+(ed?b:initB))}</td><td style={tdS}>{ed?<div style={{display:"flex",gap:6}}><button className="btn-press" style={bP} onClick={()=>{onSave(a,b);setEd(false);}}>OK</button><button className="btn-press" style={bG} onClick={()=>{setA(initA);setB(initB);setEd(false);}}>X</button></div>:<button className="btn-press" style={bG} onClick={()=>setEd(true)}>Modifier</button>}</td></tr>);}
function ChgRow({charge,l:initL,o:initO,onSave,onDelete,tdS,iS,bP,bG,bD}){const[ed,setEd]=useState(false);const[l,setL]=useState(initL);const[o,setO]=useState(initO);const[compte,setCompte]=useState(charge.fields?.compte||"Commun");useEffect(()=>{setL(initL);setO(initO);setCompte(charge.fields?.compte||"Commun");},[initL,initO,charge.fields?.compte]);return(<tr className="row-hover" style={{background:ed?"#fdfbf5":"transparent"}}><td style={tdS}>{charge.fields?.description}</td><td style={tdS}>{ed?<div style={{display:"flex",gap:4}}>{["Commun","Perso"].map(c=><button key={c} className="btn-press" onClick={()=>setCompte(c)} style={{padding:"3px 8px",border:compte===c?"2px solid #1a1a2e":"1px solid #ddd8d0",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:compte===c?700:400,background:compte===c?"rgba(26,26,46,0.04)":"#fff",color:compte===c?"#1a1a2e":"#8a8578"}}>{c}</button>)}</div>:<span style={{display:"inline-block",padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,letterSpacing:"0.04em",background:charge.fields?.compte==="Perso"?"#fef2f2":"#eff6ff",color:charge.fields?.compte==="Perso"?"#b91c1c":"#1e40af",textTransform:"uppercase"}}>{charge.fields?.compte||"Commun"}</span>}</td><td style={{...tdS,textAlign:"right"}}>{ed?<input style={iS} type="number" value={l} onChange={e=>setL(+e.target.value)}/>:<span style={{fontVariantNumeric:"tabular-nums"}}>{fmt(initL)}</span>}</td><td style={{...tdS,textAlign:"right"}}>{ed?<input style={iS} type="number" value={o} onChange={e=>setO(+e.target.value)}/>:<span style={{fontVariantNumeric:"tabular-nums"}}>{fmt(initO)}</span>}</td><td style={{...tdS,textAlign:"right",fontWeight:700}}>{fmt((ed?l:initL)+(ed?o:initO))}</td><td style={tdS}><div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>{ed?<><button className="btn-press" style={bP} onClick={()=>{onSave(l,o,compte);setEd(false);}}>OK</button><button className="btn-press" style={bG} onClick={()=>{setL(initL);setO(initO);setCompte(charge.fields?.compte||"Commun");setEd(false);}}>X</button></>:<><button className="btn-press" style={{...bG,padding:"6px 12px",fontSize:11}} onClick={()=>setEd(true)}>Modifier</button><button className="btn-press" style={bD} onClick={onDelete}>Suppr.</button></>}</div></td></tr>);}
function EpRow({ep,montant,cumul,onSave,onDelete,tdS,iS,bP,bG,bD}){const[ed,setEd]=useState(false);const[v,setV]=useState(montant);useEffect(()=>{setV(montant);},[montant]);return(<tr className="row-hover" style={{background:ed?"#fdfbf5":"transparent"}}><td style={{...tdS,fontWeight:600}}>{ep.fields?.type}</td><td style={tdS}>{ep.fields?.beneficiaire}</td><td style={{...tdS,textAlign:"right"}}>{ed?<input style={iS} type="number" value={v} onChange={e=>setV(+e.target.value)}/>:<span style={{fontVariantNumeric:"tabular-nums"}}>{fmt(montant)}</span>}</td><td style={{...tdS,textAlign:"right",color:"#8a8578"}}>{fmt(cumul)}</td><td style={tdS}><div style={{display:"flex",gap:6}}>{ed?<><button className="btn-press" style={bP} onClick={()=>{onSave(v);setEd(false);}}>OK</button><button className="btn-press" style={bG} onClick={()=>{setV(montant);setEd(false);}}>X</button></>:<><button className="btn-press" style={bG} onClick={()=>setEd(true)}>Modifier</button><button className="btn-press" style={bD} onClick={onDelete}>Suppr.</button></>}</div></td></tr>);}
function ObjRow({obj,epargne,emByYear,onSave,onDelete,tdS,iS,bP,bG,bD}){const[ed,setEd]=useState(false);const[v,setV]=useState(obj.fields?.objectif_annuel||0);const type=obj.fields?.type||"";const actual=emByYear.reduce((s,em)=>{const e=epargne.find(e=>{const l=em.fields?.epargne_id;return(Array.isArray(l)?l[0]:l)===e.id;});if(!e)return s;if(type.includes(e.fields.type)&&(type.includes(e.fields.beneficiaire)||type.includes("Commun")))return s+(em.fields.montant||0);return s;},0);const pct=v>0?(actual/v)*100:0;return(<tr className="row-hover" style={{background:ed?"#fdfbf5":"transparent"}}><td style={{...tdS,fontWeight:600}}>{type}</td><td style={{...tdS,textAlign:"right"}}>{ed?<input style={iS} type="number" value={v} onChange={e=>setV(+e.target.value)}/>:fmt(obj.fields?.objectif_annuel)}</td><td style={{...tdS,textAlign:"right"}}>{fmt(actual)}</td><td style={tdS}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,height:6,borderRadius:3,background:"#f2efeb",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:pct>=100?"linear-gradient(90deg,#15803d,#22c55e)":"linear-gradient(90deg,#1a1a2e,#44427a)",borderRadius:3,transition:"width .6s cubic-bezier(.4,0,.2,1)"}}/></div><span style={{fontSize:11,fontWeight:700,color:pct>=100?"#15803d":"#1a1a2e",minWidth:36,textAlign:"right"}}>{pct.toFixed(0)}%</span></div></td><td style={tdS}><div style={{display:"flex",gap:6}}>{ed?<><button className="btn-press" style={bP} onClick={()=>{onSave(v);setEd(false);}}>OK</button><button className="btn-press" style={bG} onClick={()=>{setV(obj.fields?.objectif_annuel||0);setEd(false);}}>X</button></>:<><button className="btn-press" style={bG} onClick={()=>setEd(true)}>Modifier</button><button className="btn-press" style={bD} onClick={onDelete}>Suppr.</button></>}</div></td></tr>);}
