"use client";
// Onglet Opérations : chaque opération des 4 dernières semaines, qui dépense, où part l'argent,
// et qui verse à qui entre les comptes de la famille.
import { useMemo, useState } from "react";
import { analyser, mouvements, totaux, libelleNoeud, FILLES, PERSONNES } from "../lib/flux";
import { posteCourt, posteIcone, catLabel } from "../lib/postes";
import { T, PERS, persOf, NOM_PERS, eur0, eur2, signedEur, Card, CardHead, Note, Segmented, PersonChips, Track, Donut, Legend, Tile, Sphere, Tag, Icon, HeroActions, HeroExtra, useHeroText, ReloadButton } from "./ui";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const d12 = (iso) => new Date(`${iso}T12:00:00`);
const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const jourMois = (iso) => {
  const d = d12(iso);
  return `${d.getDate() === 1 ? "1er" : d.getDate()} ${MOIS[d.getMonth()]}`;
};
const semaineCourte = (w) => {
  const f = addDays(w, 6);
  return d12(w).getMonth() === d12(f).getMonth() ? `${jourMois(w).replace(/ \S+$/, "")} au ${jourMois(f)}` : `${jourMois(w)} au ${jourMois(f)}`;
};
const jourCourt = (iso) => {
  const d = d12(iso);
  return `${JOURS[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const pctTxt = (x) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))} %`;
const sum = (a, f) => a.reduce((s, x) => s + (f(x) || 0), 0);
const niceCeil = (v) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
};
const DONUT = [T.navy, T.navy2, T.navy3, T.navy4, T.signal, T.navy5];
const NATURE_LBL = { quotidien: "Quotidien", charges: "Charges", epargne: "Mis de côté", entrees: "Entrée", interne: "Entre vos comptes" };
const VUES = [
  ["sorties", "Sorties", ["quotidien", "charges"]],
  ["quotidien", "Quotidien", ["quotidien"]],
  ["charges", "Charges", ["charges"]],
  ["epargne", "Mis de côté", ["epargne"]],
  ["entrees", "Entrées", ["entrees"]],
  ["interne", "Entre vos comptes", ["interne"]],
  ["tout", "Tout", ["quotidien", "charges", "epargne", "entrees", "interne"]],
];

// Nom lisible d'un compte, avec son titulaire quand deux comptes portent le même nom.
function nomCompte(t) {
  const n = (t.compte || "").replace(/^Compte Courant /i, "Courant ").replace(/^Compte commun /i, "Commun ");
  return t.fiche?.ambigu && t.personne ? `${n} ${t.personne}` : n;
}
function genreCompte(nom) {
  const n = (nom || "").toUpperCase();
  if (/LIVRET/.test(n)) return "livret A";
  if (/LINXEA|ASSURANCE VIE|SPIRICA/.test(n)) return "assurance vie";
  if (/CTO/.test(n)) return "CTO";
  return "compte";
}

// Une seule ligne par virement apparié : celle qui porte le « mis de côté », sinon la sortie.
const visible = (t) => !t.paire || (t.nature === "epargne" ? true : t.paire.nature === "epargne" ? false : t.montant < 0);

function MiniBars({ values, cur, neg = false }) {
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));
  const posH = neg ? 31 : 40;
  return (
    <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", height: 40, width: 136 }}>
      <div style={{ height: posH, display: "flex", alignItems: "flex-end", gap: 8 }}>
        {values.map((v, i) => (
          <span key={i} style={{ flex: 1, height: v > 0 ? Math.max(4, (v / max) * posH) : 2, borderRadius: 999, background: i === cur ? "linear-gradient(180deg,#6fdbe8,#1fb5c9 70%,#0e8fa1)" : v > 0 ? "linear-gradient(180deg,#c9d6ea,#a9bcd9)" : "#d5dde8", boxShadow: i === cur && v > 0 ? "0 6px 12px -4px rgba(31,181,201,.7)" : "none" }} />
        ))}
      </div>
      {neg && (
        <div style={{ height: 9, display: "flex", gap: 8 }}>
          {values.map((v, i) => (
            <span key={i} style={{ flex: 1, height: v < 0 ? Math.max(3, (-v / max) * 9) : 0, borderRadius: "4px 4px 999px 999px", background: "linear-gradient(180deg,#e1a24e,#b0660f)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ tile, tone, badge, label, value, bars, cur, neg, sub }) {
  return (
    <article className="card lift kpi">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Tile icon={tile} tone={tone} />
        {badge && <span className="badge">{badge}</span>}
      </div>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {bars && <MiniBars values={bars} cur={cur} neg={neg} />}
      {sub && <span className="kpi-sub">{sub}</span>}
    </article>
  );
}

// ─── Schéma des flux (bureau) ──────────────────────────────────────────────
const ORDRE_G = ["Lionel|courant", "Ophélie|courant", "Commun|courant", "Lionel|epargne", "Ophélie|epargne", "Commun|epargne"];
const ORDRE_D = ["Commun|courant", "Lionel|courant", "Ophélie|courant", "Lionel|epargne", "Ophélie|epargne", "Commun|epargne", "Alizée", "Noémie", "Camille", "Extérieur"];
const couleurNoeud = (n) => (n === "Extérieur" ? PERS.Extérieur.c : persOf(n.split("|")[0]).c);

function Sankey({ flux }) {
  const total = sum(flux, (f) => f.v);
  if (!total) return null;
  const S = 340 / total;
  const place = (keys, side, gap) => {
    const out = {};
    let y = 0;
    for (const k of keys) {
      const v = sum(flux.filter((f) => f[side] === k), (f) => f.v);
      out[k] = { y, h: Math.max(v * S, 3), v };
      y += out[k].h + gap;
    }
    return [out, y - gap];
  };
  const gauche = ORDRE_G.filter((k) => flux.some((f) => f.de === k));
  const droite = ORDRE_D.filter((k) => flux.some((f) => f.vers === k));
  const [LP, lh] = place(gauche, "de", 16);
  const [RP, rh] = place(droite, "vers", 16);
  const H = Math.max(lh, rh);
  const rIn = {};
  for (const d of droite) {
    let y = RP[d].y;
    for (const f of flux.filter((f) => f.vers === d).sort((a, b) => gauche.indexOf(a.de) - gauche.indexOf(b.de))) {
      rIn[`${f.de}>${f.vers}`] = y;
      y += f.v * S;
    }
  }
  const paths = [];
  for (const s of gauche) {
    let y = LP[s].y;
    for (const f of flux.filter((f) => f.de === s).sort((a, b) => droite.indexOf(a.vers) - droite.indexOf(b.vers))) {
      const h = f.v * S;
      const d0 = rIn[`${f.de}>${f.vers}`];
      paths.push({ id: `g${paths.length}`, d: `M14,${y.toFixed(1)} C280,${y.toFixed(1)} 280,${d0.toFixed(1)} 546,${d0.toFixed(1)} L546,${(d0 + h).toFixed(1)} C280,${(d0 + h).toFixed(1)} 280,${(y + h).toFixed(1)} 14,${(y + h).toFixed(1)} Z`, a: couleurNoeud(f.de), b: couleurNoeud(f.vers) });
      y += h;
    }
  }
  const label = (k, pos, x, anchor) => {
    const cy = pos.y + pos.h / 2 + 8;
    const name = libelleNoeud(k);
    if (pos.h > 60)
      return (
        <g key={`${anchor}${k}`}>
          <text x={x} y={cy - 4} textAnchor={anchor} fontWeight="800">{name}</text>
          <text x={x} y={cy + 14} textAnchor={anchor} fill={T.muted} fontFamily="JetBrains Mono, monospace" fontSize="13">{eur0(pos.v)}</text>
        </g>
      );
    return (
      <text key={`${anchor}${k}`} x={x} y={cy + 5} textAnchor={anchor} fontWeight="800">
        {name} <tspan fill={T.muted} fontWeight="500" fontFamily="JetBrains Mono, monospace" fontSize="13">{eur0(pos.v)}</tspan>
      </text>
    );
  };
  const aria = `Flux : ${gauche.map((k) => `${libelleNoeud(k)} verse ${eur0(LP[k].v)}`).join(", ")}. Arrivées : ${droite.map((k) => `${libelleNoeud(k)} ${eur0(RP[k].v)}`).join(", ")}.`;
  return (
    <svg role="img" aria-label={aria} viewBox={`0 0 970 ${Math.ceil(H + 20)}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        {paths.map((p) => (
          <linearGradient key={p.id} id={`sk${p.id}`} x1="0" x2="1">
            <stop offset="0" stopColor={p.a} stopOpacity="0.55" />
            <stop offset="1" stopColor={p.b} stopOpacity="0.42" />
          </linearGradient>
        ))}
        <filter id="skNode" x="-60%" y="-20%" width="220%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#12305c" floodOpacity="0.35" />
        </filter>
      </defs>
      <g transform="translate(196,8)">
        {paths.map((p) => (
          <path key={p.id} d={p.d} fill={`url(#sk${p.id})`} />
        ))}
        <g filter="url(#skNode)">
          {gauche.map((k) => (
            <rect key={`l${k}`} x="0" y={LP[k].y} width="14" height={LP[k].h} rx={Math.min(7, LP[k].h / 2)} fill={couleurNoeud(k)} />
          ))}
          {droite.map((k) => (
            <rect key={`r${k}`} x="546" y={RP[k].y} width="14" height={RP[k].h} rx={Math.min(7, RP[k].h / 2)} fill={couleurNoeud(k)} />
          ))}
        </g>
      </g>
      <g fontFamily="Manrope, system-ui, sans-serif" fontSize="14" fill={T.ink}>
        {gauche.map((k) => label(k, LP[k], 184, "end"))}
        {droite.map((k) => label(k, RP[k], 770, "start"))}
      </g>
    </svg>
  );
}

// ─── Liste « qui verse à qui » (mobile) ─────────────────────────────────────
function FluxListe({ flux }) {
  const sources = ORDRE_G.filter((k) => flux.some((f) => f.de === k));
  const echelle = niceCeil(Math.max(...sources.map((s) => sum(flux.filter((f) => f.de === s), (f) => f.v))));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sources.map((s) => {
        const p = s.split("|")[0];
        const rows = flux.filter((f) => f.de === s).sort((a, b) => b.v - a.v);
        return (
          <div key={s} className="flow-box">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Sphere p={s.endsWith("epargne") ? "Épargne" : p} label={s.endsWith("epargne") ? "É" : undefined} size={34} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>{libelleNoeud(s)}</span>
              <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{eur0(sum(rows, (r) => r.v))}</span>
            </div>
            {rows.map((r) => {
              const c = r.vers === "Extérieur" ? PERS.Extérieur : persOf(r.vers.split("|")[0]);
              return (
                <div key={r.vers} className="flow-row">
                  <Icon name="arrow" size={16} color={T.muted} stroke={2.4} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    <span style={{ fontWeight: 700 }}>
                      {libelleNoeud(r.vers)} {r.detail && <span className="hint">{r.detail}</span>}
                      {r.retrait && <Tag tone="orange">retrait d'épargne</Tag>}
                    </span>
                    <Track parts={[{ value: r.v, grad: c.bar }]} max={echelle} height={8} />
                  </span>
                  <span className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{eur0(r.v)}</span>
                </div>
              );
            })}
          </div>
        );
      })}
      <Note>Barres à la même échelle : une barre pleine vaut {eur0(echelle)}.</Note>
    </div>
  );
}

export function OperationsTab({ finary }) {
  const d = finary.data;
  const A = useMemo(() => (d ? analyser(d.transactions || [], d.comptes || []) : null), [d]);
  const weeks = useMemo(() => (A ? [...new Set(A.rows.map((t) => t.semaine).filter(Boolean))].sort().reverse().slice(0, 4) : []), [A]);
  const [periode, setPeriode] = useState(null);
  const [qui, setQui] = useState("Famille");
  const [compte, setCompte] = useState("");
  const [q, setQ] = useState("");
  const [vue, setVue] = useState("sorties");
  const [fluxPer, setFluxPer] = useState("tout");
  const [ouvert, setOuvert] = useState(null);
  const [nb, setNb] = useState(12);

  const week = periode === "tout" || weeks.includes(periode) ? periode : weeks[0];
  const tout = week === "tout";
  const rows4 = useMemo(() => (A ? A.rows.filter((t) => weeks.includes(t.semaine)) : []), [A, weeks]);
  const match = (t) => (qui === "Famille" || t.personne === qui) && (!compte || t.compte === compte);
  const cur = rows4.filter((t) => (tout || t.semaine === week) && match(t));
  const prevWeek = !tout && week ? weeks[weeks.indexOf(week) + 1] : null;
  const prev = prevWeek ? rows4.filter((t) => t.semaine === prevWeek && match(t)) : null;
  const tot = totaux(cur);
  const totP = prev ? totaux(prev) : null;
  const chrono = [...weeks].reverse();
  const parSem = chrono.map((w) => ({ w, ...totaux(rows4.filter((t) => t.semaine === w && match(t))) }));
  const curIdx = tout ? -1 : chrono.indexOf(week);
  const comptes = useMemo(() => [...new Set(rows4.map((t) => t.compte).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")), [rows4]);

  const sync = (d?.synthese || []).find((r) => r.cle === "derniere_synchro")?.texte;
  const syncTxt = sync ? new Date(sync).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).replace(":", " h ") : null;
  useHeroText({
    eyebrow: week ? `Opérations bancaires · ${tout ? `4 semaines, du ${jourMois(chrono[0])} au ${jourMois(addDays(weeks[0], 6))}` : `semaine du ${semaineCourte(week)}`}` : "Opérations bancaires",
    title: "Où est parti l'argent",
    sub: syncTxt ? `Chaque opération de vos comptes, relue de Finary le ${syncTxt}.` : "Chaque opération de vos comptes, relue de Finary chaque dimanche.",
  });

  // Postes de sortie
  const sorties = cur.filter((t) => t.nature === "quotidien" || t.nature === "charges");
  const totalSorties = tot.quotidien + tot.charges;
  const postes = (() => {
    const m = new Map();
    for (const t of sorties) {
      const k = `${t.categorie}|${t.sous_categorie || ""}`;
      if (!m.has(k)) m.set(k, { k, label: posteCourt(t), cat: catLabel(t), charge: t.nature === "charges", rows: [], total: 0, sans: !t.sous_categorie });
      const g = m.get(k);
      g.rows.push(t);
      g.total -= t.montant;
    }
    return [...m.values()].filter((g) => g.total > 0.005).sort((a, b) => b.total - a.total);
  })();
  const top = postes.slice(0, 5);
  const autres = postes.slice(5);
  const sansSc = sorties.filter((t) => !t.sous_categorie).length;
  const topDe = (rows) => {
    const m = new Map();
    for (const t of rows) m.set(posteCourt(t), (m.get(posteCourt(t)) || 0) - t.montant);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  // Qui dépense
  const parPersonne = PERSONNES.map((p) => {
    const r = sorties.filter((t) => t.personne === p);
    return { p, q: -sum(r.filter((t) => t.nature === "quotidien"), (t) => t.montant), c: -sum(r.filter((t) => t.nature === "charges"), (t) => t.montant), top: topDe(r.filter((t) => t.nature === "quotidien"))[0] };
  });
  const actifs = parPersonne.filter((x) => x.q + x.c > 0.005).sort((a, b) => b.q + b.c - (a.q + a.c));
  const muets = parPersonne.filter((x) => x.q + x.c <= 0.005).map((x) => NOM_PERS[x.p] || x.p);
  const maxP = Math.max(1, ...actifs.map((x) => x.q + x.c));

  // Mouvements entre comptes
  const fluxRows = rows4.filter((t) => fluxPer === "tout" || tout || t.semaine === week);
  const mv = mouvements(fluxRows).filter((m) => {
    const pers = (n) => (n || "").split("|")[0];
    if (qui !== "Famille" && pers(m.de) !== qui && pers(m.vers) !== qui) return false;
    if (compte && m.t.compte !== compte && m.t.paire?.compte !== compte) return false;
    return true;
  });
  const flux = (() => {
    const m = new Map();
    for (const x of mv) {
      const k = `${x.de}>${x.vers}`;
      if (!m.has(k)) m.set(k, { de: x.de, vers: x.vers, v: 0, dest: new Map() });
      const f = m.get(k);
      f.v += x.montant;
      const g = x.t.paire ? genreCompte(x.t.paire.compte) : x.t.fille ? "CTO" : null;
      if (g) f.dest.set(g, (f.dest.get(g) || 0) + x.montant);
    }
    return [...m.values()].map((f) => ({ ...f, retrait: f.de.endsWith("|epargne") && f.vers.endsWith("|courant"), detail: FILLES.includes(f.vers) ? [...f.dest.entries()].map(([g, v]) => `${g} ${eur0(v)}`).join(", ") : null }));
  })();
  const principaux = (() => {
    const m = new Map();
    for (const x of mv) {
      if (FILLES.includes(x.vers) || x.vers === "Extérieur") continue;
      const k = `${nomCompte(x.t)}>${nomCompte(x.t.paire)}`;
      if (!m.has(k)) m.set(k, { de: nomCompte(x.t), vers: nomCompte(x.t.paire), v: 0, retrait: x.de.endsWith("|epargne") && x.vers.endsWith("|courant") });
      m.get(k).v += x.montant;
    }
    const filles = FILLES.map((f) => {
      const r = mv.filter((x) => x.vers === f);
      if (!r.length) return null;
      const de = [...new Set(r.map((x) => x.t.personne))];
      const dest = new Map();
      for (const x of r) {
        const g = x.t.paire ? genreCompte(x.t.paire.compte) : "CTO";
        dest.set(g, (dest.get(g) || 0) + x.montant);
      }
      return { de: de.length > 1 ? de.map((p) => NOM_PERS[p] || p).join(" et ") : nomCompte(r[0].t), vers: f, v: sum(r, (x) => x.montant), sub: [...dest.entries()].map(([g, v]) => `${g} ${eur0(v)}`).join(" · ") };
    }).filter(Boolean);
    return [...[...m.values()].sort((a, b) => b.v - a.v).slice(0, 4), ...filles];
  })();
  const exterieur = mv.filter((x) => x.vers === "Extérieur");

  // Liste
  const needle = q.trim().toLowerCase();
  const natures = VUES.find(([k]) => k === vue)[2];
  const vis = cur.filter(visible);
  const liste = vis
    .filter((t) => natures.includes(t.nature))
    .filter((t) => !needle || `${t.libelle} ${posteCourt(t)} ${t.compte} ${t.paire?.compte || ""} ${Math.abs(t.montant).toFixed(2).replace(".", ",")}`.toLowerCase().includes(needle))
    .sort((a, b) => b.date.localeCompare(a.date) || a.montant - b.montant);
  const doublons = (A?.doublons || []).filter((t) => weeks.includes(t.semaine) && (tout || t.semaine === week));

  const sem4 = sum(parSem, (s) => s.epargne);
  const refunds = sum(cur.filter((t) => t.nature === "entrees" && t.categorie === "refunds"), (t) => t.montant);
  const topQ = topDe(cur.filter((t) => t.nature === "quotidien"))[0];
  const topC = topDe(cur.filter((t) => t.nature === "charges")).slice(0, 3).map(([l]) => l.toLowerCase());
  const moyQ = parSem.length ? sum(parSem, (s) => s.quotidien) / parSem.length : 0;
  const maxQ = Math.max(1, ...parSem.map((s) => s.quotidien));
  const chargesMax = [...parSem].sort((a, b) => b.charges - a.charges)[0];

  const filtres = (
    <HeroExtra>
      <section aria-label="Filtres" className="hero-filters">
        <Segmented dark label="Période" value={week} onChange={setPeriode} options={[...weeks.map((w) => [w, semaineCourte(w)]), ["tout", "4 semaines"]]} />
        <PersonChips options={["Famille", ...PERSONNES]} value={qui} onChange={setQui} />
        <div className="hero-inputs">
          <label className="pill-field">
            <span className="pill-label">Compte</span>
            <select value={compte} onChange={(e) => setCompte(e.target.value)}>
              <option value="">Tous les comptes ({comptes.length})</option>
              {comptes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="pill-field">
            <Icon name="search" size={16} color={T.muted} stroke={2.2} />
            <span className="sr-only">Chercher</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Libellé ou montant" />
          </label>
        </div>
      </section>
    </HeroExtra>
  );

  if (!d) return null;
  if (!weeks.length)
    return (
      <>
        <HeroActions><ReloadButton finary={finary} /></HeroActions>
        <Card><p className="card-sub">Aucune opération pour l'instant. Elles arrivent avec la prochaine synchro du dimanche.</p></Card>
      </>
    );

  return (
    <div className="stack">
      <HeroActions><ReloadButton finary={finary} /></HeroActions>
      {filtres}

      <section aria-label="Chiffres clés" className="grid-kpi">
        <Kpi tile="cart" tone="navy" label="Dépenses du quotidien" value={eur0(tot.quotidien)} badge={totP && totP.quotidien > 0 ? pctTxt(tot.quotidien / totP.quotidien - 1) : `${tot.n.quotidien} op.`} bars={parSem.map((s) => s.quotidien)} cur={curIdx}
          sub={[totP ? `${eur0(totP.quotidien)} la semaine d'avant` : `${tot.n.quotidien} opérations`, topQ && topQ[1] > 0.3 * tot.quotidien ? `dont ${eur0(topQ[1])} ${topQ[0].toLowerCase()}` : null].filter(Boolean).join(" · ")} />
        <Kpi tile="box" tone="orange" label="Charges" value={eur0(tot.charges)} badge={totP ? signedEur(tot.charges - totP.charges) : `${tot.n.charges} op.`} bars={parSem.map((s) => s.charges)} cur={curIdx} sub={topC.length ? topC.join(", ") : "aucune cette période"} />
        <Kpi tile="down" tone="teal" label="Mis de côté" value={tot.epargne < 0 ? `−${eur0(-tot.epargne)}` : eur0(tot.epargne)} badge={tout ? null : `${eur0(sem4)} en 4 sem.`} bars={parSem.map((s) => s.epargne)} cur={curIdx} neg
          sub={tot.epargne < 0 ? `plus repris que versé : ${eur0(-tot.epargne)} revenus sur les comptes courants` : "vers les livrets, les placements et l'épargne des filles"} />
        <Kpi tile="up" tone="periwinkle" label="Entrées" value={eur0(tot.entrees)} badge={`${tot.n.entrees} opération${tot.n.entrees > 1 ? "s" : ""}`} bars={parSem.map((s) => s.entrees)} cur={curIdx} sub={refunds > 0 ? `dont ${eur0(refunds)} de remboursements` : "salaires et virements reçus"} />
      </section>

      <div className="grid-auto-2">
        <Card>
          <CardHead title="Les 4 dernières semaines" sub="Dépenses du quotidien, du dimanche au samedi. Touche une semaine pour la voir." right={<span className="pill-soft"><span aria-hidden="true" style={{ width: 18, borderTop: `2px dashed ${T.muted}` }} />moyenne {eur0(moyQ)}</span>} />
          <div role="img" aria-label={`Dépenses du quotidien : ${parSem.map((s) => `${eur0(s.quotidien)} la semaine du ${jourMois(s.w)}`).join(", ")}.`} className="bars-box">
            <div aria-hidden="true" className="bars-avg" style={{ bottom: Math.round((moyQ / maxQ) * 170) }} />
            {parSem.map((s, i) => (
              <button key={s.w} type="button" className="bar-col" onClick={() => setPeriode(s.w)} aria-label={`Voir la semaine du ${jourMois(s.w)}`}>
                <span className={`mono bar-val ${i === curIdx ? "on" : ""}`}>{eur0(s.quotidien)}</span>
                <span className={`bar ${i === curIdx ? "on" : ""}`} style={{ height: Math.max(6, Math.round((s.quotidien / maxQ) * 170)) }} />
              </button>
            ))}
          </div>
          <div className="bars-legend">
            {parSem.map((s) => (
              <span key={s.w}>
                <b>{jourMois(s.w)}</b>
                <span>+ {eur0(s.charges)} de charges</span>
              </span>
            ))}
          </div>
          {chargesMax && chargesMax.charges > 0 && (
            <Note>Semaine du {jourMois(chargesMax.w)}, la plus chargée : {topDe(rows4.filter((t) => t.semaine === chargesMax.w && t.nature === "charges" && match(t))).slice(0, 3).map(([l, v]) => `${l.toLowerCase()} ${eur0(v)}`).join(", ")}.</Note>
          )}
        </Card>

        <Card>
          <CardHead title="Qui dépense" sub={`Sorties ${tout ? "des 4 semaines" : "de la semaine"}, par titulaire du compte débité.`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {actifs.map((x) => {
              const c = persOf(x.p);
              return (
                <div key={x.p} className="person-row">
                  <Sphere p={x.p} size={52} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>{NOM_PERS[x.p] || x.p}</span>
                      <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{eur0(x.q + x.c)}</span>
                    </div>
                    <Track max={maxP} parts={[{ value: x.q, grad: c.bar, title: `Quotidien ${eur0(x.q)}` }, { value: x.c, color: c.c, stripes: c.soft, title: `Charges ${eur0(x.c)}` }]} />
                    <span className="hint">
                      {eur0(x.q)} de quotidien{x.top && x.top[1] > 0.3 * x.q && x.q > 0 ? `, dont ${eur0(x.top[1])} ${x.top[0].toLowerCase()}` : ""} · {eur0(x.c)} de charges
                    </span>
                  </div>
                </div>
              );
            })}
            {!actifs.length && <p className="card-sub">Aucune sortie pour ce filtre.</p>}
          </div>
          <div className="legend-inline">
            <span><span aria-hidden="true" className="sw" style={{ background: T.muted }} />Quotidien</span>
            <span><span aria-hidden="true" className="sw" style={{ background: `repeating-linear-gradient(135deg, ${T.muted} 0 2px, #fff 2px 5px)`, border: `1px solid ${T.muted}` }} />Charges</span>
            {qui === "Famille" && muets.length > 0 && <span>{muets.join(", ")} : aucune sortie</span>}
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Par poste" sub={`${eur0(totalSorties)} de sorties ${tout ? "sur 4 semaines" : "cette semaine"}. Touche un poste pour voir ses opérations.`} />
        <div className="grid-auto-2" style={{ alignItems: "start", gap: 28 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
            <Donut label={`Répartition des sorties : ${top.map((p) => `${p.label} ${Math.round((p.total / totalSorties) * 100)} %`).join(", ")}${autres.length ? `, autres ${Math.round((sum(autres, (p) => p.total) / totalSorties) * 100)} %` : ""}.`}
              parts={[...top.map((p, i) => ({ value: p.total, color: DONUT[i] })), ...(autres.length ? [{ value: sum(autres, (p) => p.total), color: DONUT[5] }] : [])]}
              center={eur0(totalSorties)} sub={`${sorties.length} sortie${sorties.length > 1 ? "s" : ""}`} />
            <Legend items={[...top.map((p, i) => ({ color: DONUT[i], label: p.label, hint: p.charge ? "charge" : null, value: eur0(p.total) })), ...(autres.length ? [{ color: DONUT[5], label: `${autres.length} autre${autres.length > 1 ? "s" : ""} poste${autres.length > 1 ? "s" : ""}`, value: eur0(sum(autres, (p) => p.total)) }] : [])]} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {postes.map((p) => {
              const open = ouvert === p.k;
              return (
                <div key={p.k} className="poste">
                  <button type="button" aria-expanded={open} onClick={() => setOuvert(open ? null : p.k)} className="poste-head">
                    <span style={{ fontSize: 14, fontWeight: 800 }}>
                      {p.label} <span className="hint">· {p.label !== p.cat ? `${p.cat} · ` : ""}{p.rows.length} op.{p.charge ? " · charge" : ""}</span>
                    </span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{eur0(p.total)}</span>
                  </button>
                  {open && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 12px 12px" }}>
                      {p.rows.sort((a, b) => b.date.localeCompare(a.date)).map((t) => (
                        <div key={t.cle} className="poste-op">
                          <span className="hint">{jourCourt(t.date)}</span>
                          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{t.libelle} <span className="hint">· {nomCompte(t)}</span></span>
                          <span className="mono" style={{ fontWeight: 600 }}>{eur2(t.montant)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {!postes.length && <p className="card-sub">Aucune sortie pour ce filtre.</p>}
            {sansSc > 0 && <Note tone="box">{sansSc} sortie{sansSc > 1 ? "s" : ""} sur {sorties.length} n'ont que la catégorie de la banque. Demande à Claude, dans le projet Organisation Famille, une règle Finary pour les ranger.</Note>}
          </div>
        </div>
      </Card>

      <Card>
        <CardHead title="Mouvements entre comptes" sub={`Qui verse à qui, ${fluxPer === "tout" || tout ? "sur 4 semaines" : `semaine du ${semaineCourte(week)}`}.`} right={tout ? null : <Segmented small label="Période des mouvements" value={fluxPer} onChange={setFluxPer} options={[["sem", "Semaine"], ["tout", "4 semaines"]]} />} />
        {flux.length === 0 ? (
          <p className="card-sub">Aucun virement entre vos comptes pour ce filtre.</p>
        ) : (
          <>
            <div className="only-desktop">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "flex-start" }}>
                <div style={{ flex: "1.8 1 600px", minWidth: 0 }}>
                  <Sankey flux={flux} />
                </div>
                <div style={{ flex: "1 1 340px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {principaux.map((r) => (
                    <div key={`${r.de}>${r.vers}`} className="vir-row">
                      <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, minWidth: 0 }}>
                        {r.de}
                        <span role="img" aria-label="vers" className="vir-arrow"><Icon name="arrow" size={14} color={T.navy} stroke={2.4} /></span>
                        {r.vers}
                        {r.retrait && <Tag tone="orange">retrait d'épargne</Tag>}
                        {r.sub && <span className="hint" style={{ fontWeight: 500 }}>{r.sub}</span>}
                      </span>
                      <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{eur0(r.v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="only-mobile">
              <FluxListe flux={flux} />
            </div>
            {exterieur.length > 0 && (
              <p className="card-sub" style={{ margin: 0 }}>
                <b style={{ color: T.ink }}>Vers l'extérieur :</b> {exterieur.map((x) => `${x.t.libelle.replace(/^(INST|SEPA|VIR\.?)\s+/i, "")} ${eur0(x.montant)}`).join(", ")}.
              </p>
            )}
          </>
        )}
      </Card>

      <Card>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 className="card-title">Toutes les opérations</h2>
          <div className="seg-scroll">
            <Segmented small label="Type d'opération" value={vue} onChange={(k) => { setVue(k); setNb(12); }}
              options={VUES.map(([k, l, ns]) => [k, `${l} ${vis.filter((t) => ns.includes(t.nature)).length}`])} />
          </div>
        </div>
        <div role="list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {liste.slice(0, nb).map((t) => {
            const paire = !!t.paire;
            const [ic, tone] = paire ? ["swap", "orange"] : t.vers && t.fille ? ["trend", "teal"] : posteIcone(t);
            const titre = paire ? `${nomCompte(t.montant < 0 ? t : t.paire)} → ${nomCompte(t.montant < 0 ? t.paire : t)}` : t.libelle;
            const sous = paire ? `${jourCourt(t.date)} · ${t.libelle}` : `${jourCourt(t.date)} · ${nomCompte(t)}${t.vers ? ` → ${t.vers}` : ""}`;
            const tag = paire ? (t.nature === "epargne" ? "Mis de côté" : "Entre vos comptes") : t.nature === "epargne" ? "Mis de côté" : t.nature === "interne" ? "Entre vos comptes" : posteCourt(t);
            return (
              <div key={t.cle} role="listitem" className={`op-row ${paire ? "op-pair" : ""}`}>
                <Tile icon={ic} tone={tone} size={46} />
                <span className="op-main">
                  <span className="op-title">{titre}</span>
                  <span className="hint">{sous}</span>
                  <span className="op-mob">
                    <Tag tone={t.nature === "charges" ? "orange" : paire ? "white" : "navy"}>{tag}</Tag>
                    <Sphere p={t.personne || "Extérieur"} size={16} label="" />
                  </span>
                </span>
                <span className="op-tag"><Tag tone={t.nature === "charges" ? "orange" : paire ? "white" : "navy"}>{tag}{t.nature === "charges" && !paire ? " · charge" : ""}</Tag></span>
                <span className="op-who">
                  <Sphere p={t.personne || "Extérieur"} size={22} label="" />
                  {t.personne ? NOM_PERS[t.personne] || t.personne : "Lionel ou Ophélie"}
                </span>
                <span className="mono op-amount">{paire ? eur2(Math.abs(t.montant)) : eur2(t.montant)}</span>
              </div>
            );
          })}
          {liste.length === 0 && <p className="card-sub" style={{ textAlign: "center" }}>Aucune opération pour ce filtre.</p>}
        </div>
        {liste.length > nb && (
          <button type="button" className="more-btn" onClick={() => setNb((n) => n + 30)}>
            {liste.length - nb <= 30
              ? `Afficher ${liste.length - nb > 1 ? `les ${liste.length - nb} autres opérations` : "l'opération restante"}`
              : `Afficher 30 opérations de plus, ${liste.length - nb} restantes`}
          </button>
        )}
        <Note>
          Un virement entre deux de vos comptes n'apparaît qu'une fois, départ et arrivée reliés. Les virements vers Alizée, Noémie et Camille comptent dans « Mis de côté » : livret A, compte, assurance vie ou CTO. Les banques transmettent certaines opérations avec un à trois jours de retard : les 4 semaines sont relues chaque dimanche.
          {doublons.length > 0 && ` ${doublons.length} opération${doublons.length > 1 ? "s" : ""} en double dans Finary ${doublons.length > 1 ? "sont ignorées" : "est ignorée"} (${[...new Set(doublons.map((t) => t.compte))].join(", ")}).`}
        </Note>
      </Card>
    </div>
  );
}
