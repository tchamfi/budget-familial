"use client";
// Onglet Comptes : patrimoine net sur 12 mois, état de synchro, répartition, établissements,
// prêt, épargne des filles et tous les comptes.
import { useMemo, useState } from "react";
import { filleDans, FILLES } from "../lib/flux";
import { T, PERS, NOM_PERS, eur0, eur2, signedEur, Card, CardHead, Note, Segmented, PersonChips, Track, Donut, Legend, Tile, Sphere, Tag, Fresh, Gauge, Icon, HeroActions, HeroExtra, useHeroText, ReloadButton, useEtroit } from "./ui";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS_L = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const dd = (iso) => new Date(String(iso).length <= 10 ? `${iso}T12:00:00` : iso);
const jourMois = (iso) => {
  const d = dd(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${d.getDate() === 1 ? "1er" : d.getDate()} ${MOIS[d.getMonth()]}`;
};
const moisAn = (iso) => {
  const d = dd(iso);
  return `${MOIS[d.getMonth()]} ${d.getFullYear()}`;
};
const joursEntre = (a, b) => Math.floor((dd(b) - dd(a)) / 86400000);
const sum = (a, f) => a.reduce((s, x) => s + (f(x) || 0), 0);
const titulaires = (s) => {
  try {
    const a = JSON.parse(s || "[]");
    return Array.isArray(a) ? a.map((o) => ({ name: String(o.name || "").trim(), share: +o.share || 0 })) : [];
  } catch {
    return [];
  }
};
const personneCompte = (c) => {
  const n = c.owners.map((o) => o.name);
  if (n.includes("Lionel") && n.includes("Ophélie")) return "Commun";
  return n[0] || null;
};
const ERREUR = (e) => e && e !== "ok" && e !== "manuel";
const REP_COUL = { Immobilier: "#9db0cf", "Actions & Fonds": T.navy, Livrets: T.navy2, "Comptes bancaires": T.navy3, Crypto: T.signal, "Fonds euros": T.navy4 };
const REP_NOM = { "Comptes bancaires": "Comptes courants", "Actions & Fonds": "Actions et fonds" };
const GROUPES = [
  ["checking", "Comptes courants"],
  ["saving", "Livrets"],
  ["investment", "Placements"],
  ["crypto", "Crypto"],
  ["real-estate|loan|credit", "Maison et prêt"],
  ["startup|other", "Autres"],
];
const TYPE_COURT = { checking: "courants", saving: "livrets", investment: "placements", crypto: "crypto" };
const ETAB_COURT = { "Caisse d'Épargne Particuliers": "Caisse d'Épargne" };
const genreF = (c) => {
  const n = (c.nom || "").toUpperCase();
  if (/LIVRET/.test(n)) return "Livret A";
  if (/CTO/.test(n)) return "CTO";
  if (/LINXEA/.test(n)) return "Linxea";
  if (/ASSURANCE VIE/.test(n)) return "Assurance vie";
  if (c.type === "crypto") return "Crypto";
  if (c.type === "checking") return "Compte";
  return c.nom;
};

function fraicheur(c, syncIso) {
  if (ERREUR(c.etat_synchro)) return ["warn", `Erreur · ${jourMois(c.synchro_ok || c.maj)}`];
  const age = c.maj && syncIso ? joursEntre(c.maj, syncIso) : null;
  if (c.type === "real-estate") return age != null && age > 365 ? ["old", `À réévaluer · ${moisAn(c.maj)}`] : ["ok", moisAn(c.maj)];
  if (c.etat_synchro === "manuel" || !c.etablissement) return ["manual", `Manuel · ${jourMois(c.maj)}`];
  if (age == null) return ["ok", "—"];
  if (age <= 2) return ["ok", "À jour"];
  if (age > 7) return ["warn", `À vérifier · ${jourMois(c.maj)}`];
  return ["ok", jourMois(c.maj)];
}

// Courbe du patrimoine net, dans le bandeau.
function Courbe({ points, compact = false }) {
  if (points.length < 2) return <p style={{ margin: 0, color: "#c9d5e8", fontSize: 14 }}>Historique en cours de chargement : il arrive avec la prochaine synchro.</p>;
  // Sur téléphone, un repère plus étroit garde des textes lisibles.
  const W = compact ? 300 : 720;
  const H = compact ? 150 : 200;
  const vals = points.map((p) => p.net);
  const lo = Math.floor(Math.min(...vals) / 20000) * 20000;
  const hi = Math.ceil(Math.max(...vals) / 20000) * 20000 || lo + 20000;
  const t0 = dd(points[0].date).getTime();
  const t1 = dd(points[points.length - 1].date).getTime();
  const X = (p) => ((dd(p.date).getTime() - t0) / Math.max(1, t1 - t0)) * W;
  const Y = (v) => H - ((v - lo) / (hi - lo)) * H;
  const line = points.map((p, i) => `${i ? "L" : "M"}${X(p).toFixed(1)},${Y(p.net).toFixed(1)}`).join(" ");
  const iHi = vals.indexOf(Math.max(...vals));
  const iLo = vals.indexOf(Math.min(...vals));
  const grid = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const mois = [];
  const d = dd(points[0].date);
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  while (d.getTime() <= t1) {
    mois.push(new Date(d));
    d.setMonth(d.getMonth() + (t1 - t0 > 200 * 86400000 ? (compact ? 3 : 2) : compact && t1 - t0 > 100 * 86400000 ? 2 : 1));
  }
  const ph = points[iHi];
  const pl = points[iLo];
  const last = points[points.length - 1];
  const ancre = (x) => (x > W * 0.7 ? "end" : x < W * 0.3 ? "start" : "middle");
  return (
    <svg role="img" aria-label={`Patrimoine net du foyer : ${eur0(points[0].net)} le ${jourMois(points[0].date)} ${dd(points[0].date).getFullYear()}, plus bas ${eur0(pl.net)} le ${jourMois(pl.date)}, plus haut ${eur0(ph.net)} le ${jourMois(ph.date)}, ${eur0(last.net)} au dernier point.`} viewBox={compact ? "-60 -30 368 214" : "-64 -34 816 270"} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="heroArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7fe0ec" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#1fb5c9" stopOpacity="0.15" />
          <stop offset="1" stopColor="#1fb5c9" stopOpacity="0" />
        </linearGradient>
        <filter id="heroGlow" x="-10%" y="-30%" width="120%" height="160%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="dotHi" cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#bff1f7" />
          <stop offset="1" stopColor="#1fb5c9" />
        </radialGradient>
      </defs>
      <g fontFamily="JetBrains Mono, monospace" fontSize={compact ? 11 : 12} fill="#c9d5e8">
        {grid.map((g, k) => (
          <g key={k}>
            <line x1="0" y1={Y(g)} x2={W} y2={Y(g)} stroke={k === 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.14)"} />
            <text x="-12" y={Y(g) + 4} textAnchor="end">{Math.round(g / 1000)} k€</text>
          </g>
        ))}
        {mois.map((m) => (
          <text key={m.toISOString()} x={((m.getTime() - t0) / Math.max(1, t1 - t0)) * W} y={H + 24} textAnchor="middle">{MOIS[m.getMonth()]}</text>
        ))}
      </g>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#heroArea)" />
      <path d={line} fill="none" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" filter="url(#heroGlow)" />
      <circle cx={X(ph)} cy={Y(ph.net)} r="6" fill="url(#dotHi)" stroke="#12305c" strokeWidth="2" />
      <circle cx={X(pl)} cy={Y(pl.net)} r="6" fill="url(#dotHi)" stroke="#12305c" strokeWidth="2" />
      <circle cx={X(last)} cy={Y(last.net)} r="8" fill="url(#dotHi)" stroke="#ffffff" strokeWidth="3" />
      <g fontFamily="Manrope, system-ui, sans-serif" fontSize={compact ? 12 : 13} fill="#ffffff" fontWeight="800">
        <text x={X(ph) + (ancre(X(ph)) === "end" ? -10 : 0)} y={Math.max(-16, Y(ph.net) - 14)} textAnchor={ancre(X(ph))}>
          Plus haut {eur0(ph.net)} {!compact && <tspan fill="#c9d5e8" fontWeight="600">{jourMois(ph.date)}</tspan>}
        </text>
        <text x={X(pl)} y={Math.min(H - 4, Y(pl.net) + 24)} textAnchor={ancre(X(pl))}>
          Plus bas {eur0(pl.net)} {!compact && <tspan fill="#c9d5e8" fontWeight="600">{jourMois(pl.date)}</tspan>}
        </text>
      </g>
    </svg>
  );
}

export function ComptesTab({ finary }) {
  const d = finary.data;
  const [periode, setPeriode] = useState("1y");
  const [maison, setMaison] = useState(false);
  const [qui, setQui] = useState("Tous");
  const [q, setQ] = useState("");
  const [ouverts, setOuverts] = useState(() => new Set());
  const [lignes, setLignes] = useState(false);
  const etroit = useEtroit();
  const syncIso = (d?.synthese || []).find((r) => r.cle === "derniere_synchro")?.texte;

  const v = useMemo(() => {
    if (!d) return null;
    const comptes = (d.comptes || []).map((c) => ({ ...c, owners: titulaires(c.titulaires) })).map((c) => ({ ...c, personne: personneCompte(c), fille: filleDans(c.nom) }));
    const dates = [...new Set((d.patrimoine || []).map((r) => r.date).filter(Boolean))].sort();
    const last = dates[dates.length - 1];
    const prev = dates[dates.length - 2];
    const snap = (d.patrimoine || []).filter((r) => r.date === last);
    const foyer = snap.find((r) => r.personne === "Foyer") || {};
    const foyerPrev = (d.patrimoine || []).find((r) => r.date === prev && r.personne === "Foyer");
    const histo = (d.historique || []).filter((p) => p.date && p.net != null).sort((a, b) => a.date.localeCompare(b.date));
    const histoOk = histo.length >= 2;
    const points = histoOk ? histo : dates.map((dt) => ({ date: dt, net: (d.patrimoine || []).find((r) => r.date === dt && r.personne === "Foyer")?.net })).filter((p) => p.net != null);
    const repDate = [...new Set((d.repartition || []).map((r) => r.date))].sort().pop();
    const rep = (d.repartition || []).filter((r) => r.date === repDate && r.montant > 0).sort((a, b) => b.montant - a.montant);
    const enErreur = comptes.filter((c) => ERREUR(c.etat_synchro));
    const etabs = new Map();
    for (const c of comptes) {
      if (["real-estate", "loan", "credit"].includes(c.type)) continue;
      const k = c.etablissement ? ETAB_COURT[c.etablissement] || c.etablissement : "Saisis à la main";
      if (!etabs.has(k)) etabs.set(k, { k, rows: [], total: 0 });
      const e = etabs.get(k);
      e.rows.push(c);
      e.total += c.solde_eur || 0;
    }
    const maisonC = comptes.find((c) => c.type === "real-estate");
    const pret = (d.pret || [])[0];
    const filles = FILLES.map((f) => {
      const rows = comptes.filter((c) => c.owners.some((o) => o.name === f) || (c.fille === f && !c.owners.some((o) => FILLES.includes(o.name))));
      return { f, rows, total: sum(rows, (c) => c.solde_eur), autre: rows.filter((c) => !c.owners.some((o) => o.name === f)) };
    });
    return { comptes, last, prev, snap, foyer, foyerPrev, points, histoOk, rep, enErreur, etabs: [...etabs.values()].sort((a, b) => b.total - a.total), maisonC, pret, filles };
  }, [d]);

  useHeroText({ eyebrow: "Comptes et patrimoine", title: "Ce que possède la famille", sub: v ? `${v.comptes.length} comptes dans ${v.etabs.filter((e) => e.k !== "Saisis à la main").length} établissements${syncIso ? `, relus de Finary le ${new Date(syncIso).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).replace(":", " h ")}` : ""}.` : undefined });

  if (!v) return null;
  const { foyer } = v;
  const lastP = v.points[v.points.length - 1];
  const debut = { "3m": 92, "6m": 183, "1y": 400 }[periode];
  const pts = v.points.filter((p) => !lastP || joursEntre(p.date, lastP.date) <= debut);
  const variation = pts.length >= 2 ? pts[pts.length - 1].net - pts[0].net : null;
  const bond = (() => {
    // Saut de plus de 15 % entre deux points voisins : souvent des comptes ajoutés à Finary.
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].net - pts[i - 1].net) > 0.15 * Math.abs(pts[i - 1].net)) return pts[i];
    return null;
  })();
  const repParts = v.rep.filter((r) => maison || r.categorie !== "Immobilier");
  const repTotal = sum(repParts, (r) => r.montant);
  const immo = v.rep.find((r) => r.categorie === "Immobilier");
  const pret = v.pret;
  const rembourse = pret && pret.montant_initial ? 1 - pret.capital_restant / pret.montant_initial : null;
  const now = new Date();
  const duree = pret?.debut && pret?.fin ? (now - dd(pret.debut)) / (dd(pret.fin) - dd(pret.debut)) : null;
  const moisRestants = pret?.fin ? Math.max(0, (dd(pret.fin).getFullYear() - now.getFullYear()) * 12 + dd(pret.fin).getMonth() - now.getMonth()) : null;
  const interets = pret ? (pret.capital_restant * (pret.taux || 0)) / 100 / 12 : null;
  const maxEtab = Math.max(1, ...v.etabs.map((e) => e.total));
  const maxFille = Math.max(1, ...v.filles.map((f) => f.total));
  const parents = ["Ophélie", "Lionel"].map((p) => v.snap.find((r) => r.personne === p)).filter(Boolean).sort((a, b) => (b.net || 0) - (a.net || 0));
  const maxNet = Math.max(1, ...parents.map((r) => r.net || 0));
  const fillesSnap = FILLES.map((f) => v.snap.find((r) => r.personne === f) || { personne: f, net: 0 });
  const autresNoms = v.filles.flatMap((f) => f.autre.map((c) => ({ f: f.f, c })));
  const segF = (rows) => {
    const g = (re, types) => sum(rows.filter((c) => (re ? re.test(c.nom.toUpperCase()) : true) && (!types || types.includes(c.type))), (c) => c.solde_eur);
    const livret = g(/LIVRET/, ["saving"]);
    const cto = g(/CTO/, ["investment"]);
    const linxea = g(/LINXEA/, ["investment"]);
    const av = g(/ASSURANCE VIE/, ["investment"]);
    const reste = sum(rows, (c) => c.solde_eur) - livret - cto - linxea - av;
    return [
      { key: "l", value: livret, color: T.navy, label: "Livret A" },
      { key: "c", value: cto, color: T.navy3, label: "CTO" },
      { key: "x", value: linxea, color: T.signal, label: "Linxea" },
      { key: "a", value: av, color: T.navy4, label: "Assurance vie" },
      { key: "r", value: reste, color: T.navy5, label: "Crypto et compte" },
    ];
  };
  const needle = q.trim().toLowerCase();
  const filtre = (c) => {
    if (qui !== "Tous") {
      if (qui === "Commun" ? c.personne !== "Commun" : !c.owners.some((o) => o.name === qui) && c.fille !== qui) return false;
    }
    return !needle || `${c.nom} ${c.etablissement || ""}`.toLowerCase().includes(needle);
  };
  const positions = d.positions || [];

  return (
    <div className="stack">
      <HeroActions><ReloadButton finary={finary} /></HeroActions>
      <HeroExtra>
        <section aria-label="Patrimoine net" className="hero-panel">
          <div className="hero-panel-side">
            <span className="hero-kicker">Patrimoine net</span>
            <span className="hero-big">{eur0(foyer.net)}</span>
            {v.foyerPrev && foyer.net != null && (
              <span className="hero-delta">
                <span aria-hidden="true" className="hero-delta-dot"><Icon name={foyer.net >= v.foyerPrev.net ? "up" : "down"} size={12} color="#0a1f40" stroke={3} /></span>
                {signedEur(foyer.net - v.foyerPrev.net)} depuis le {jourMois(v.prev)}
              </span>
            )}
            <p className="hero-note">
              {variation != null ? `${signedEur(variation)} sur la période affichée, versements et comptes ajoutés compris. ` : ""}
              {bond ? `Le saut du ${jourMois(bond.date)} vient en partie de comptes ajoutés à Finary, pas seulement de gains.` : ""}
              {!v.histoOk ? " Historique de 12 mois disponible après la prochaine synchro." : ""}
            </p>
            {v.histoOk && <Segmented dark label="Période" value={periode} onChange={setPeriode} options={[["3m", "3 mois"], ["6m", "6 mois"], ["1y", "1 an"]]} />}
          </div>
          <Courbe points={pts} compact={etroit} />
        </section>
      </HeroExtra>

      <section aria-label="Chiffres clés" className="grid-kpi">
        <article className="card lift kpi">
          <Tile icon="home" tone="navy" />
          <span className="kpi-label">Actifs bruts</span>
          <span className="kpi-value">{eur0(foyer.actifs)}</span>
          {v.maisonC && <span className="kpi-sub">dont la maison, {eur0(v.maisonC.solde_eur)}</span>}
        </article>
        <article className="card lift kpi">
          <Tile icon="bank" tone="periwinkle" />
          <span className="kpi-label">Dettes</span>
          <span className="kpi-value">{eur0(foyer.dettes)}</span>
          {rembourse != null && <span className="kpi-sub">prêt immobilier, {Math.round(rembourse * 100)} % remboursé</span>}
        </article>
        <article className="card lift kpi">
          <Tile icon="trend" tone="teal" />
          <span className="kpi-label">Épargne financière</span>
          <span className="kpi-value">{eur0(foyer.actifs_financiers)}</span>
          <span className="kpi-sub">placements, livrets, crypto, hors comptes courants</span>
        </article>
        {v.enErreur.length ? (
          <article role="status" className="card lift kpi kpi-warn">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Tile icon="warn" tone="orange" />
              <span className="badge badge-white">{v.enErreur.length} compte{v.enErreur.length > 1 ? "s" : ""} figé{v.enErreur.length > 1 ? "s" : ""}</span>
            </div>
            <span className="kpi-label" style={{ color: T.orangeInk }}>Synchro en erreur</span>
            <span className="kpi-alert-title">
              {[...new Set(v.enErreur.map((c) => c.etablissement || c.nom))].join(", ")}, depuis le {jourMois(v.enErreur.map((c) => c.synchro_ok || c.maj).sort()[0])}
            </span>
            <span className="kpi-sub" style={{ color: T.ink }}>{eur0(sum(v.enErreur, (c) => c.solde_eur))} affichés au dernier solde connu. Reconnecte {[...new Set(v.enErreur.map((c) => c.etablissement))].join(", ")} dans l'app Finary.</span>
          </article>
        ) : (
          <article className="card lift kpi">
            <Tile icon="reload" tone="blue" />
            <span className="kpi-label">Synchro bancaire</span>
            <span className="kpi-value" style={{ fontSize: 24 }}>{v.comptes.some((c) => c.etat_synchro) ? "Tout est à jour" : "État inconnu"}</span>
            <span className="kpi-sub">{v.comptes.some((c) => c.etat_synchro) ? "aucun compte en erreur dans Finary" : "l'état de chaque compte arrive avec la prochaine synchro"}</span>
          </article>
        )}
      </section>

      <div className="grid-auto-2">
        <Card>
          <CardHead title="Par personne" sub="Patrimoine net de chacun. La maison et le prêt sont partagés à 50 %." />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {parents.map((r) => (
              <div key={r.personne} className="person-row">
                <Sphere p={r.personne} size={52} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{r.personne}</span>
                    <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{eur0(r.net)}</span>
                  </div>
                  <Track max={maxNet} parts={[{ value: Math.max(0, r.net || 0), grad: PERS[r.personne].bar }]} />
                  <span className="hint">{eur0(r.actifs)} d'actifs · {eur0(r.dettes)} de dettes</span>
                </div>
              </div>
            ))}
            <div className="filles-mini">
              {fillesSnap.map((r) => (
                <div key={r.personne} className="fille-mini">
                  <Sphere p={r.personne} size={36} />
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <b style={{ fontSize: 13 }}>{r.personne}</b>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{eur0(r.net)}</span>
                  </span>
                </div>
              ))}
            </div>
            {autresNoms.length > 0 && (
              <Note>
                {autresNoms.map(({ f, c }) => `${c.nom} (${eur0(c.solde_eur)}) est au nom ${/^[AEIOUÉ]/.test(c.owners[0]?.name || "") ? "d'" : "de "}${c.owners.map((o) => o.name).join(" et ")} dans Finary.`).join(" ")} L'épargne des filles est détaillée plus bas.
              </Note>
            )}
          </div>
        </Card>

        <Card>
          <CardHead title="Répartition des actifs" sub={`${eur0(repTotal)} ${maison ? "avec la maison" : "hors maison"}.`} right={<Segmented small label="Inclure la maison" value={maison ? "avec" : "hors"} onChange={(k) => setMaison(k === "avec")} options={[["avec", "Avec la maison"], ["hors", "Hors maison"]]} />} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
            <Donut label={`Répartition : ${repParts.map((r) => `${REP_NOM[r.categorie] || r.categorie} ${Math.round((r.montant / repTotal) * 1000) / 10} %`).join(", ")}.`} parts={repParts.map((r) => ({ value: r.montant, color: REP_COUL[r.categorie] || T.navy5 }))} center={eur0(repTotal)} sub={maison ? "avec la maison" : "hors maison"} />
            <Legend items={repParts.map((r) => ({ color: REP_COUL[r.categorie] || T.navy5, label: REP_NOM[r.categorie] || r.categorie, value: eur0(r.montant), pct: `${(Math.round((r.montant / repTotal) * 1000) / 10).toLocaleString("fr-FR")} %` }))} />
          </div>
          {immo && !maison && <Note tone="box">Avec la maison ({eur0(immo.montant)}), l'immobilier pèse {Math.round((immo.montant / sum(v.rep, (r) => r.montant)) * 100)} % des actifs.</Note>}
        </Card>
      </div>

      <div className="grid-auto-2">
        <Card>
          <CardHead title="Par établissement" sub="Solde des comptes, hors maison et prêt." />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {v.etabs.map((e) => {
              const err = e.rows.some((c) => ERREUR(c.etat_synchro));
              const types = [...new Set(e.rows.map((c) => TYPE_COURT[c.type]).filter(Boolean))].slice(0, 3).join(", ");
              return (
                <div key={e.k} className={`etab-row ${err ? "warn" : ""}`}>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800 }}>
                      {e.k}
                      {err && <Fresh etat="warn">Synchro en erreur</Fresh>}
                    </span>
                    <span className="hint">{e.rows.length} compte{e.rows.length > 1 ? "s" : ""} · {types}</span>
                  </span>
                  <Track max={maxEtab} parts={[{ value: Math.max(0, e.total), grad: [T.navy3, T.navy] }]} />
                  <span className="mono" style={{ textAlign: "right", fontSize: 14, fontWeight: 600 }}>{eur0(e.total)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {pret && (
          <Card>
            <CardHead title="Prêt immobilier" sub={pret.nom} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
              <Gauge value={rembourse} label={`${Math.round(rembourse * 100)} % du capital remboursé`} />
              <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 30, lineHeight: "34px", fontWeight: 800, color: T.navy, fontVariantNumeric: "tabular-nums" }}>
                  {eur0(pret.capital_restant)} <span style={{ fontSize: 14, fontWeight: 600, color: T.muted }}>restants</span>
                </span>
                <span className="card-sub" style={{ margin: 0 }}>sur {eur0(pret.montant_initial)} empruntés</span>
              </div>
            </div>
            <dl className="facts">
              <div><dt>Taux</dt><dd className="mono">{String(pret.taux).replace(".", ",")} %</dd></div>
              <div><dt>Mensualité</dt><dd><span className="mono">{eur2(pret.mensualite)}</span> <span className="hint">hors assurance</span></dd></div>
              <div><dt>Début</dt><dd>{MOIS_L[dd(pret.debut).getMonth()]} {dd(pret.debut).getFullYear()}</dd></div>
              <div><dt>Fin</dt><dd>{MOIS_L[dd(pret.fin).getMonth()]} {dd(pret.fin).getFullYear()} <span className="hint">· {Math.floor(moisRestants / 12)} ans et {moisRestants % 12} mois</span></dd></div>
            </dl>
            {duree != null && (
              <div className="note-panel">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800 }}><span>Durée écoulée</span><span className="mono" style={{ fontWeight: 600 }}>{Math.round(duree * 100)} %</span></div>
                <div role="img" aria-label={`${Math.round(duree * 100)} % de la durée du prêt écoulée`}><Track max={1} parts={[{ value: Math.max(0.01, duree), grad: [T.navy3, T.navy] }]} /></div>
                <div style={{ display: "flex", justifyContent: "space-between" }} className="hint"><span>{moisAn(pret.debut)}</span><span>{moisAn(pret.fin)}</span></div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: "18px" }}>
                  {Math.round(duree * 100)} % de la durée est passée et {Math.round(rembourse * 100)} % du capital est remboursé, soit {eur0(pret.montant_initial - pret.capital_restant)}. Ce mois-ci, environ {eur0(interets)} de la mensualité paient les intérêts et {eur0(pret.mensualite - interets)} le capital.
                </p>
              </div>
            )}
          </Card>
        )}
      </div>

      <Card>
        <CardHead title="Épargne des filles" sub={`${eur0(sum(v.filles, (f) => f.total))} au total. Barres à la même échelle.`}
          right={<div className="legend-inline" style={{ marginTop: 0 }}>{segF([])
            .map((s) => <span key={s.key}><span aria-hidden="true" className="sw" style={{ background: s.color }} />{s.label}</span>)}</div>} />
        <div className="filles-grid">
          {v.filles.map(({ f, rows, total, autre }) => {
            const parts = segF(rows);
            return (
              <div key={f} className="fille-card lift">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Sphere p={f} size={44} />
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{f}</span>
                    <span style={{ fontSize: 24, lineHeight: "28px", fontWeight: 800, color: T.navy, fontVariantNumeric: "tabular-nums" }}>{eur0(total)}</span>
                  </span>
                </div>
                <div role="img" aria-label={`${f} : ${rows.map((c) => `${c.nom} ${eur0(c.solde_eur)}`).join(", ")}.`}>
                  <Track max={maxFille} height={16} parts={parts.map((p) => ({ ...p, title: `${p.label} ${eur0(p.value)}` }))} />
                </div>
                <span className="hint" style={{ lineHeight: "17px" }}>
                  {rows.sort((a, b) => b.solde_eur - a.solde_eur).map((c) => `${genreF(c)} ${eur0(c.solde_eur)}`).join(" · ") || "Aucun compte"}
                  {autre.length > 0 && ` · au nom ${/^[AEIOUÉ]/.test(autre[0].owners[0]?.name || "") ? "d'" : "de "}${autre[0].owners[0]?.name} dans Finary`}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHead title="Tous les comptes" sub="Solde complet de chaque compte, avec sa dernière mise à jour."
          right={
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <div className="seg-scroll"><PersonChips dark={false} options={["Tous", "Lionel", "Ophélie", "Commun", ...FILLES]} value={qui} onChange={setQui} /></div>
              <label className="pill-field pill-field-light">
                <Icon name="search" size={16} color={T.muted} stroke={2.2} />
                <span className="sr-only">Chercher un compte</span>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un compte" />
              </label>
            </div>
          } />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {GROUPES.map(([types, label]) => {
            const rows = v.comptes.filter((c) => types.split("|").includes(c.type) && filtre(c)).sort((a, b) => Math.abs(b.solde_eur) - Math.abs(a.solde_eur));
            if (!rows.length) return null;
            const total = sum(rows, (c) => (c.type === "loan" || c.type === "credit" ? -Math.abs(c.solde_eur) : c.solde_eur));
            const open = ouverts.has(label) || needle;
            const shown = open ? rows : rows.slice(0, 5);
            return (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="grp-head"><span>{label} · {rows.length}</span><span className="mono">{eur0(total)}</span></div>
                {shown.map((c) => {
                  const [etat, txt] = fraicheur(c, syncIso);
                  const dette = c.type === "loan" || c.type === "credit";
                  const p = c.fille || c.personne;
                  const share = qui !== "Tous" && qui !== "Commun" ? c.owners.find((o) => o.name === qui)?.share : null;
                  return (
                    <div key={c.cle} className={`acc-row ${etat === "warn" || etat === "old" ? "warn" : ""}`}>
                      <span className="acc-name" title={c.nom}>{c.type === "real-estate" ? `Maison, ${c.nom.split(",")[0]}` : c.nom}{c.rendement ? <span className="hint"> · {String(c.rendement).replace(".", ",")} % par an</span> : null}</span>
                      <span className="acc-who"><Sphere p={p} size={20} label="" />{c.owners.length > 1 ? c.owners.map((o) => o.name).join(" et ") : c.fille && c.fille !== c.personne ? `${c.fille}, au nom ${/^[AEIOUÉ]/.test(c.personne || "") ? "d'" : "de "}${c.personne}` : c.personne}</span>
                      <span className="acc-etab">{c.etablissement ? ETAB_COURT[c.etablissement] || c.etablissement : c.type === "real-estate" ? "Estimation Finary" : "Saisi à la main"}</span>
                      <span className="acc-fresh"><Fresh etat={etat}>{txt}</Fresh></span>
                      <span className="mono acc-amount">
                        {dette ? eur2(-Math.abs(c.solde_eur)) : c.devise && c.devise !== "EUR" ? `${eur2(c.solde)} ${c.devise}`.replace(" € ", " ") : eur2(c.solde_eur)}
                        {c.devise && c.devise !== "EUR" && <span className="hint" style={{ display: "block", fontWeight: 400 }}>{eur2(c.solde_eur)}</span>}
                        {share != null && share < 1 && <span className="hint" style={{ display: "block", fontWeight: 400 }}>part de {qui} {eur2(c.solde_eur * share)}</span>}
                      </span>
                    </div>
                  );
                })}
                {!open && rows.length > 5 && (
                  <button type="button" className="more-btn left" onClick={() => setOuverts((s) => new Set([...s, label]))}>Afficher les {rows.length - 5} autres</button>
                )}
              </div>
            );
          })}
        </div>
        <Note>Soldes à 100 % de chaque compte. Le total officiel Finary, part de chacun comprise, est dans l'onglet Patrimoine.</Note>
      </Card>

      {positions.length > 0 && (
        <Card>
          <button type="button" className="poste-head" aria-expanded={lignes} onClick={() => setLignes((x) => !x)} style={{ padding: 0, background: "none" }}>
            <span>
              <h2 className="card-title">Lignes détenues</h2>
              <p className="card-sub">Comptes de Lionel uniquement : Finary ne donne pas le détail des comptes d'Ophélie et des filles. {lignes ? "Touche pour replier." : "Touche pour afficher."}</p>
            </span>
            <span className="mono">{positions.length} lignes</span>
          </button>
          {lignes &&
            [...new Set(positions.map((p) => p.compte))].map((compte) => {
              const rows = positions.filter((p) => p.compte === compte).sort((a, b) => (b.valeur || 0) - (a.valeur || 0));
              return (
                <div key={compte} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="grp-head"><span>{compte}</span><span className="mono">{rows.every((r) => (r.devise || "EUR") === "EUR") ? eur0(sum(rows, (r) => r.valeur)) : ""}</span></div>
                  {rows.map((p) => {
                    const cost = p.pru != null ? p.quantite * p.pru : null;
                    const lat = cost != null ? p.valeur - cost : null;
                    return (
                      <div key={p.cle} className="acc-row">
                        <span className="acc-name">{p.nom}<span className="hint" style={{ display: "block" }}>{[p.symbole, p.isin].filter(Boolean).join(" · ")}</span></span>
                        <span className="acc-who mono">{p.quantite != null ? p.quantite.toLocaleString("fr-FR", { maximumFractionDigits: 6 }) : "—"}</span>
                        <span className="acc-etab">{p.frais != null ? `${(p.frais * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} % de frais` : ""}</span>
                        <span className="acc-fresh">{lat != null && <Tag tone={lat >= 0 ? "navy" : "orange"}>{lat >= 0 ? "+" : "−"}{eur2(Math.abs(lat)).replace("−", "")}</Tag>}</span>
                        <span className="mono acc-amount">{p.devise && p.devise !== "EUR" ? `${(p.valeur || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${p.devise}` : eur2(p.valeur)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </Card>
      )}
    </div>
  );
}
