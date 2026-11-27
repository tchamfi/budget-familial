"use client";
// Onglets alimentés par Finary : Patrimoine, Budget réel, Comptes & placements.
// Les données viennent des tables Finary_* d'Airtable (mises à jour chaque semaine par Claude),
// lues via /api/finary, en lecture seule.
import { useState, useEffect, useMemo, useCallback } from "react";
import { analyser, mouvements, totaux, libelleNoeud, HORS_QUOTIDIEN, FILLES } from "../lib/flux";
import { posteLabel } from "../lib/postes";
import { HeroActions, useHeroText, ReloadButton } from "./ui";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";

// ─── Formats ────────────────────────────────────────────────────────────────
const nf0 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur = (n) => (n == null || Number.isNaN(+n) ? "—" : nf0.format(n));
const money = (n, cur = "EUR", digits = 2) =>
  n == null || Number.isNaN(+n)
    ? "—"
    : new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur || "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
const pct = (x, digits = 0) =>
  x == null || !Number.isFinite(x) ? "—" : new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: digits, minimumFractionDigits: digits }).format(x);
const num = (n, digits = 4) => (n == null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(n));
const MOIS_C = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS_L = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const monthShort = (k) => (k ? `${MOIS_C[+k.slice(5, 7) - 1]} ${k.slice(2, 4)}` : "");
const monthLong = (k) => (k ? `${MOIS_L[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}` : "");
const frDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const frDateTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
};
const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);

// ─── Styles (mêmes codes visuels que BudgetApp) ────────────────────────────
const C = { ink: "#12305c", muted: "#4b5b72", line: "#d5dde8", soft: "#eef2f8", blue: "#3462b0", violet: "#8e5db8", green: "#0e8fa1", red: "#b42318", orange: "#b0660f", teal: "#13a1b5", pink: "#13a1b5", gold: "#cc7d1d" };
const CS = { background: "#fff", borderRadius: 32, padding: 28, boxShadow: "0 1px 2px rgba(11,27,51,.05), 0 18px 36px -16px rgba(18,48,92,.3)" };
const H3 = { fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 20, margin: 0, color: "#0b1b33" };
const LBL = { fontSize: 12, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" };
const TH = { textAlign: "left", padding: "10px 12px", borderBottom: `2px solid ${C.line}`, color: C.muted, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" };
const TD = { padding: "11px 12px", borderBottom: "1px solid #e6ebf3", fontSize: 13 };
const chip = (active) => ({ padding: "8px 14px", border: "none", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: active ? 800 : 600, background: active ? "linear-gradient(180deg,#2a5394,#12305c)" : "#eef2f8", color: active ? "#fff" : "#0b1b33", boxShadow: active ? "0 4px 10px rgba(18,48,92,.4)" : "inset 0 1px 3px rgba(11,27,51,.1)" });

const PEOPLE = ["Lionel", "Ophélie", "Noémie", "Alizée", "Camille"];
const PERSON_COLOR = { Foyer: C.ink, Lionel: "#3462b0", "Ophélie": "#13a1b5", "Noémie": "#8e5db8", "Alizée": "#a982cc", Camille: "#5c3580" };
const TYPE_LABEL = { checking: "Comptes courants", saving: "Livrets", investment: "Placements", crypto: "Crypto", "real-estate": "Immobilier", loan: "Prêts", credit: "Crédits", startup: "Startups", other: "Autres" };
const TYPE_COLOR = { "real-estate": C.blue, investment: C.violet, saving: C.green, checking: C.teal, crypto: C.orange, startup: C.gold, other: C.muted };
const MIX_ORDER = ["real-estate", "investment", "saving", "checking", "crypto", "startup", "other"];
const REP_COLOR = { Immobilier: C.blue, "Actions & Fonds": C.violet, Livrets: C.green, "Comptes bancaires": C.teal, Crypto: C.orange, "Fonds euros": C.gold };
const STATUS = { on_track: ["En bonne voie", C.green], challenging: ["Difficile à tenir", C.orange], completed: ["Atteint", C.green], overdue: ["Date dépassée", C.red], overshooting: ["En avance sur le plan", C.green], overfunded: ["Dépassé", C.green], underfunded: ["Sous-financé", C.orange] };
const INTERNAL = new Set(["investment", "transfer"]);

const parseOwners = (s) => {
  try {
    const a = JSON.parse(s || "[]");
    return Array.isArray(a) ? a.map((o) => ({ name: o.name, share: +o.share || 0 })) : [];
  } catch {
    return [];
  }
};
const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
const tooltipEur = (v) => eur(v);

// ─── Chargement ─────────────────────────────────────────────────────────────
export function useFinary(enabled) {
  const [st, setSt] = useState({ loading: false, error: null, data: null });
  const load = useCallback(async (refresh = false) => {
    setSt((s) => ({ ...s, loading: true, error: null }));
    try {
      const r = await fetch(`/api/finary${refresh ? "?refresh=1" : ""}`, { credentials: "same-origin", cache: "no-store" });
      if (r.status === 401) {
        window.dispatchEvent(new Event("bf-unauth"));
        throw new Error("Session expirée");
      }
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
      setSt({ loading: false, error: null, data: d });
    } catch (e) {
      setSt((s) => ({ loading: false, error: String(e.message || e), data: s.data }));
    }
  }, []);
  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);
  return { ...st, reload: load };
}

function synthese(data, key) {
  return (data?.synthese || []).find((r) => r.cle === key) || {};
}

// ─── Briques d'interface ────────────────────────────────────────────────────
function Kpi({ label, value, sub, color = C.ink, i = 0 }) {
  return (
    <div className={`lift fade-up stagger-${Math.min(i + 1, 4)}`} style={{ ...CS, borderRadius: 28, padding: 22 }}>
      <span aria-hidden="true" style={{ display: "block", width: 34, height: 6, borderRadius: 999, background: color, marginBottom: 12 }} />
      <div style={LBL}>{label}</div>
      <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 30, color: color === C.ink ? "#12305c" : color, marginTop: 8, lineHeight: 1.15, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}
function Note({ children, warn }) {
  return <p style={{ fontSize: 12, color: warn ? C.orange : C.muted, lineHeight: 1.6, marginTop: 12 }}>{children}</p>;
}
function Bar100({ parts, height = 10 }) {
  const total = sum(parts, (p) => Math.max(p.value, 0));
  if (total <= 0) return <div style={{ height, borderRadius: 6, background: C.soft }} />;
  return (
    <div style={{ display: "flex", height, borderRadius: 6, overflow: "hidden", background: C.soft }}>
      {parts.filter((p) => p.value > 0).map((p) => (
        <div key={p.key} title={`${p.label} : ${eur(p.value)}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
      ))}
    </div>
  );
}
function Progress({ value, color = C.green }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div style={{ height: 8, borderRadius: 6, background: C.soft, overflow: "hidden" }}>
      <div style={{ width: `${v * 100}%`, height: "100%", background: color, borderRadius: 6 }} />
    </div>
  );
}
function Toggle({ checked, onChange, label }) {
  // Affiché dans le bandeau bleu : texte clair, piste cyan quand l'option est active.
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="hero-toggle">
      <span className="hero-toggle-track" style={{ background: checked ? "linear-gradient(180deg,#7fe0ec,#1fb5c9)" : "rgba(255,255,255,.22)" }}>
        <span style={{ position: "absolute", top: 3, left: checked ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 4px rgba(11,27,51,.35)", transition: "left .2s" }} />
      </span>
      {label}
    </button>
  );
}
function TabHeader({ title, finary, children }) {
  const sync = synthese(finary.data, "derniere_synchro").texte;
  useHeroText({ title, sub: sync ? `Données Finary du ${frDateTime(sync)}. Mise à jour automatique chaque semaine.` : undefined });
  return (
    <HeroActions>
      {children}
      <ReloadButton finary={finary} />
    </HeroActions>
  );
}
function Gate({ finary, children }) {
  if (finary.data) return children;
  return (
    <div className="fade-up" style={{ ...CS, textAlign: "center", padding: 48 }}>
      {finary.error ? (
        <>
          <div style={{ ...H3, fontSize: 18 }}>Données indisponibles</div>
          <p style={{ color: C.muted, fontSize: 13, margin: "10px 0 18px" }}>{finary.error}</p>
          <button className="btn-press" onClick={() => finary.reload(true)} style={{ padding: "10px 20px", background: "linear-gradient(180deg,#2a5394,#12305c)", color: "#fff", border: "none", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 800 }}>Réessayer</button>
        </>
      ) : (
        <p style={{ color: C.muted, fontSize: 14 }}>Chargement des données…</p>
      )}
    </div>
  );
}

// ─── Calculs ────────────────────────────────────────────────────────────────
function latestDate(rows) {
  return rows.reduce((m, r) => (r.date && r.date > m ? r.date : m), "");
}
function peopleView(comptes, snap) {
  const accs = comptes.map((a) => ({ ...a, owners: parseOwners(a.titulaires) }));
  return PEOPLE.map((name) => {
    const row = snap.find((r) => r.personne === name) || {};
    const byType = {};
    let loans = 0;
    accs.forEach((a) => {
      const o = a.owners.find((x) => x.name === name);
      if (!o) return;
      const v = (a.solde_eur || 0) * o.share;
      if (a.type === "loan" || a.type === "credit") {
        if (a.type === "loan") loans += v;
        return;
      }
      byType[a.type] = (byType[a.type] || 0) + v;
    });
    const re = byType["real-estate"] || 0;
    const detailAssets = Object.values(byType).reduce((s, v) => s + v, 0);
    const net = row.net ?? null;
    return {
      name,
      actifs: row.actifs ?? null,
      dettes: row.dettes ?? null,
      net,
      re,
      loans,
      netSansImmo: net == null ? null : net - re + loans,
      byType,
      gap: row.actifs == null ? 0 : detailAssets - row.actifs,
    };
  });
}
// Lecture d'un mois Finary. Les totaux Finary comptent les virements et les placements
// comme des dépenses : on les sépare pour obtenir ce que le foyer gagne, dépense et épargne.
function monthStats(m, budgetMois, cats) {
  const rows = cats.filter((c) => c.mois === m);
  const g = (slug) => rows.find((r) => r.categorie === slug) || {};
  const b = budgetMois.find((x) => x.cle === m) || {};
  const revenusActivite = g("income").revenus || 0;
  const remboursements = g("refunds").revenus || 0;
  const placementsVerses = g("investment").depenses || 0;
  const placementsRetires = g("investment").revenus || 0;
  const virementsSortis = g("transfer").depenses || 0;
  const virementsRecus = g("transfer").revenus || 0;
  const vieBrut = (b.depenses || 0) - placementsVerses - virementsSortis;
  const vie = vieBrut - remboursements;
  const placements = placementsVerses - placementsRetires;
  const virementsNets = virementsRecus - virementsSortis;
  const autresEntrees = (b.revenus || 0) - revenusActivite - remboursements - placementsRetires - virementsRecus;
  const epargne = revenusActivite - vie;
  return {
    m,
    rows,
    b,
    revenusActivite,
    remboursements,
    placementsVerses,
    placementsRetires,
    placements,
    virementsSortis,
    virementsRecus,
    virementsNets,
    autresEntrees,
    vieBrut,
    vie,
    epargne,
    // Pas de taux pour un mois en cours : les revenus arrivent souvent en fin de mois.
    tauxEpargne: revenusActivite > 0 && !b.en_cours ? (epargne / revenusActivite) * 100 : null,
  };
}

// ─── Onglet Patrimoine ──────────────────────────────────────────────────────
export function PatrimoineTab({ finary }) {
  const [withRe, setWithRe] = useState(true);
  const d = finary.data;
  const v = useMemo(() => {
    if (!d) return null;
    const last = latestDate(d.patrimoine);
    const snap = d.patrimoine.filter((r) => r.date === last);
    const foyer = snap.find((r) => r.personne === "Foyer") || {};
    const dates = [...new Set(d.patrimoine.map((r) => r.date).filter(Boolean))].sort();
    const evo = dates.map((dt) => {
      const f = d.patrimoine.find((r) => r.date === dt && r.personne === "Foyer") || {};
      return { date: frDate(dt), net: f.net, financiers: f.actifs_financiers };
    });
    const lastRep = latestDate(d.repartition);
    const rep = d.repartition.filter((r) => r.date === lastRep).sort((a, b) => (b.montant || 0) - (a.montant || 0));
    return { last, foyer, evo, rep, people: peopleView(d.comptes, snap) };
  }, [d]);

  return (
    <Gate finary={finary}>
      {v && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <TabHeader title="Patrimoine du foyer" finary={finary}>
            <Toggle checked={!withRe} onChange={(x) => setWithRe(!x)} label="Sans la maison ni le prêt" />
          </TabHeader>

          <div className="grid-kpi">
            {withRe ? (
              <>
                <Kpi i={0} label="Patrimoine net" value={eur(v.foyer.net)} sub="Tout ce que vous possédez, moins ce que vous devez" color={C.ink} />
                <Kpi i={1} label="Actifs bruts" value={eur(v.foyer.actifs)} sub="Avant les dettes, maison comprise" color={C.blue} />
                <Kpi i={2} label="Dettes" value={eur(v.foyer.dettes)} sub="Capital restant du prêt immobilier" color={C.red} />
              </>
            ) : (
              <>
                <Kpi i={0} label="Patrimoine hors maison" value={eur(sum(v.people, (p) => p.netSansImmo))} sub="Patrimoine net sans la maison ni le prêt" color={C.ink} />
                <Kpi i={1} label="Valeur de la maison" value={eur(sum(v.people, (p) => p.re))} sub="Estimation saisie dans Finary" color={C.blue} />
                <Kpi i={2} label="Prêt restant" value={eur(sum(v.people, (p) => p.loans))} sub="Capital restant dû" color={C.red} />
              </>
            )}
            <Kpi i={3} label="Actifs financiers" value={eur(v.foyer.actifs_financiers)} sub="Livrets, actions, fonds, fonds euros, crypto. Sans comptes courants ni immobilier" color={C.violet} />
          </div>

          <div className="grid-2col">
            <div className="fade-up" style={CS}>
              <h3 style={{ ...H3, fontSize: 18, marginBottom: 16 }}>Répartition des actifs</h3>
              <RepartitionChart rows={withRe ? v.rep : v.rep.filter((r) => r.categorie !== "Immobilier")} />
              {withRe && <Note>La maison pèse lourd dans le total. Active « Sans la maison ni le prêt » pour lire la répartition de ton épargne.</Note>}
            </div>
            <div className="fade-up" style={CS}>
              <h3 style={{ ...H3, fontSize: 18, marginBottom: 16 }}>Évolution</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={v.evo} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.soft} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={(x) => `${Math.round(x / 1000)} k`} width={56} />
                  <Tooltip formatter={tooltipEur} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="linear" dataKey="net" name="Patrimoine net" stroke={C.ink} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="linear" dataKey="financiers" name="Actifs financiers" stroke={C.violet} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
              {v.evo.length < 2 && <Note>Premier relevé le {frDate(v.last)}. Finary ne fournit pas d'historique : la courbe se construit à chaque mise à jour hebdomadaire.</Note>}
            </div>
          </div>

          <div className="fade-up" style={CS}>
            <h3 style={{ ...H3, fontSize: 18 }}>Le patrimoine de chacun</h3>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 4, marginBottom: 18 }}>
              {withRe ? "Patrimoine net selon Finary. La maison, le prêt et le compte joint sont partagés à 50/50 entre Ophélie et toi." : "Patrimoine net sans la maison ni le prêt immobilier. Les montants des filles ne changent pas."}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
              {v.people.map((p) => {
                const parts = MIX_ORDER.filter((t) => withRe || t !== "real-estate").map((t) => ({ key: t, label: TYPE_LABEL[t], value: p.byType[t] || 0, color: TYPE_COLOR[t] }));
                return (
                  <div key={p.name} style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, borderLeft: `4px solid ${PERSON_COLOR[p.name]}` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{p.name}</div>
                    <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 22, color: C.ink, margin: "6px 0 10px" }}>{eur(withRe ? p.net : p.netSansImmo)}</div>
                    <Bar100 parts={parts} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 10 }}>
                      {parts.filter((x) => x.value > 0.5).map((x) => (
                        <div key={x.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted }}>
                          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: x.color, marginRight: 6 }} />{x.label}</span>
                          <span style={{ color: C.ink, fontWeight: 600 }}>{eur(x.value)}</span>
                        </div>
                      ))}
                      {withRe && p.dettes > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.red }}>
                          <span>Part du prêt</span><span style={{ fontWeight: 600 }}>−{eur(p.dettes)}</span>
                        </div>
                      )}
                      {p.net === 0 && p.gap < 1 && <div style={{ fontSize: 11, color: C.muted }}>Aucun compte pour l'instant</div>}
                    </div>
                    {p.gap > 1 && <div style={{ fontSize: 11, color: C.orange, marginTop: 8, lineHeight: 1.5 }}>{eur(p.gap)} de ses comptes ne sont pas comptés dans le total Finary. Vérifie dans Finary si un compte est exclu du patrimoine.</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid-2col">
            <ObjectifsCard rows={d.objectifs} />
            <PretCard pret={(d.pret || [])[0]} syncIso={synthese(d, "derniere_synchro").texte} />
          </div>
        </div>
      )}
    </Gate>
  );
}

function RepartitionChart({ rows }) {
  const total = sum(rows, (r) => r.montant);
  if (!rows.length) return <Note>Aucune donnée de répartition.</Note>;
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ width: 170, height: 170, flex: "0 0 170px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="montant" nameKey="categorie" innerRadius={52} outerRadius={80} paddingAngle={1} stroke="none">
              {rows.map((r) => <Cell key={r.categorie} fill={REP_COLOR[r.categorie] || C.muted} />)}
            </Pie>
            <Tooltip formatter={tooltipEur} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.categorie} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
            <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: REP_COLOR[r.categorie] || C.muted, marginRight: 8 }} />{r.categorie}</span>
            <span style={{ whiteSpace: "nowrap" }}><b>{eur(r.montant)}</b> <span style={{ color: C.muted }}>{pct(r.montant / total, 1)}</span></span>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
          <span>Total</span><span>{eur(total)}</span>
        </div>
      </div>
    </div>
  );
}

function ObjectifsCard({ rows = [] }) {
  return (
    <div className="fade-up" style={CS}>
      <h3 style={{ ...H3, fontSize: 18, marginBottom: 16 }}>Objectifs Finary</h3>
      {!rows.length && <Note>Aucun objectif défini dans Finary.</Note>}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {rows.map((o) => {
          const [label, color] = STATUS[o.statut] || [o.statut || "", C.muted];
          const ratio = o.cible ? o.actuel / o.cible : null;
          return (
            <div key={o.cle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{o.nom}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}14`, padding: "3px 8px", borderRadius: 6 }}>{label}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, margin: "8px 0 6px" }}>
                <span><b style={{ color: C.ink }}>{eur(o.actuel)}</b> sur {eur(o.cible)}</span>
                <span>{pct(ratio)}</span>
              </div>
              <Progress value={ratio} color={color} />
              <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
                {o.type === "safety_net" && o.couverture_mois != null && <>Couvre {num(o.couverture_mois, 1)} mois de dépenses.</>}
                {o.type === "life_project" && (
                  <>
                    {o.mois_cible && <>Échéance {monthLong(o.mois_cible)}. </>}
                    {o.contribution_mensuelle != null && <>Versement prévu {eur(o.contribution_mensuelle)} par mois. </>}
                    {o.rendement_requis != null && o.rendement_attendu != null && (
                      <>Rendement nécessaire {pct(o.rendement_requis, 1)} par an, rendement attendu de tes placements {pct(o.rendement_attendu, 1)} par an (hypothèses Finary).</>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PretCard({ pret, syncIso }) {
  if (!pret) return <div className="fade-up" style={CS}><h3 style={{ ...H3, fontSize: 18 }}>Prêt immobilier</h3><Note>Aucun prêt suivi dans Finary.</Note></div>;
  const rembourse = pret.montant_initial ? 1 - pret.capital_restant / pret.montant_initial : null;
  const ref = syncIso ? new Date(syncIso) : new Date();
  const fin = pret.fin ? new Date(pret.fin) : null;
  const moisRestants = fin ? Math.max(0, (fin.getFullYear() - ref.getFullYear()) * 12 + (fin.getMonth() - ref.getMonth())) : null;
  return (
    <div className="fade-up" style={CS}>
      <h3 style={{ ...H3, fontSize: 18, marginBottom: 16 }}>Prêt immobilier</h3>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 6 }}>
        <span><b style={{ color: C.ink }}>{pct(rembourse)}</b> du capital remboursé</span>
        <span>{eur(pret.capital_restant)} restants</span>
      </div>
      <Progress value={rembourse} color={C.blue} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
        {[
          ["Capital emprunté", eur(pret.montant_initial)],
          ["Taux", pret.taux != null ? `${num(pret.taux, 2)} %` : "—"],
          ["Mensualité hors assurance", money(pret.mensualite)],
          ["Fin du prêt", fin ? `${monthLong(pret.fin.slice(0, 7))}` : "—"],
          ["Mensualités restantes", moisRestants != null ? `${moisRestants} mois` : "—"],
          ["Durée totale", pret.duree_mois ? `${pret.duree_mois} mois` : "—"],
        ].map(([k, val]) => (
          <div key={k}>
            <div style={LBL}>{k}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{val}</div>
          </div>
        ))}
      </div>
      <Note>Le nombre de mensualités restantes part de la date de fin indiquée dans Finary.</Note>
    </div>
  );
}

// ─── Onglet Budget réel ─────────────────────────────────────────────────────
// ─── Semaine (du dimanche au samedi) ────────────────────────────────────────
// Dépenses du quotidien : tout sauf les flux fixes ou internes ci-dessous.
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const dayLong = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : `${JOURS[d.getDay()]} ${d.getDate() === 1 ? "1er" : d.getDate()} ${MOIS_L[d.getMonth()]}`;
};
const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const deltaPct = (a, b) => (b ? (a - b) / b : null);
const signed = (x, digits = 0) => (x == null ? "—" : `${x > 0 ? "+" : ""}${pct(x, digits)}`);
const deltaColor = (x) => (x == null ? C.muted : x > 0.15 ? C.red : x < -0.15 ? C.green : C.ink);

function weekView(rows = []) {
  const weeks = [...new Set(rows.map((r) => r.debut).filter(Boolean))].sort();
  if (!weeks.length) return null;
  const last = weeks[weeks.length - 1];
  const prev = weeks.length > 1 ? weeks[weeks.length - 2] : null;
  const of = (d) => rows.filter((r) => r.debut === d);
  const quot = (rs) => rs.filter((r) => !HORS_QUOTIDIEN.has(r.categorie));
  const cur = of(last);
  const prv = prev ? of(prev) : [];
  const slugs = [...new Set([...quot(cur), ...quot(prv)].map((r) => r.categorie))];
  const lines = slugs
    .map((slug) => {
      const c = cur.find((r) => r.categorie === slug) || {};
      const p = prv.find((r) => r.categorie === slug);
      return {
        slug,
        libelle: c.libelle || p?.libelle || slug,
        semaine: c.depenses || 0,
        transactions: c.transactions || 0,
        precedente: prev ? p?.depenses || 0 : null,
        moyenne: c.moyenne_12s ?? null,
      };
    })
    .sort((a, b) => Math.max(b.semaine, b.moyenne || 0) - Math.max(a.semaine, a.moyenne || 0));
  const hasMoy = lines.some((l) => l.moyenne != null);
  return {
    debut: last,
    fin: cur[0]?.fin,
    prevDebut: prev,
    lines,
    total: sum(lines, (l) => l.semaine),
    totalPrev: prev ? sum(lines, (l) => l.precedente) : null,
    totalMoy: hasMoy ? sum(lines, (l) => l.moyenne) : null,
    hors: cur.filter((r) => HORS_QUOTIDIEN.has(r.categorie) && r.depenses > 0).sort((a, b) => b.depenses - a.depenses),
    history: weeks.map((wk) => ({ label: frDate(wk).slice(0, 5), total: Math.round(sum(quot(of(wk)), (r) => r.depenses)) })),
  };
}

function merchantsView(rows = []) {
  if (!rows.length) return null;
  const last = rows.reduce((m, r) => (r.debut > m ? r.debut : m), "");
  const cur = rows.filter((r) => r.debut === last);
  const groups = [...new Set(cur.map((r) => r.groupe || "Autres"))];
  return groups.map((g) => {
    const rs = cur
      .filter((r) => (r.groupe || "Autres") === g)
      .sort((a, b) => (b.depenses || 0) - (a.depenses || 0) || (b.moyenne_12s || 0) - (a.moyenne_12s || 0));
    return { groupe: g, rows: rs, total: sum(rs, (r) => r.depenses), moyenne: sum(rs, (r) => r.moyenne_12s) };
  });
}

function SemaineSection({ data }) {
  const w = useMemo(() => weekView(data.semaine || []), [data.semaine]);
  const groups = useMemo(() => merchantsView(data.marchands || []), [data.marchands]);
  if (!w) return null;
  const vsPrev = w.totalPrev != null ? deltaPct(w.total, w.totalPrev) : null;
  const vsMoy = w.totalMoy != null ? deltaPct(w.total, w.totalMoy) : null;
  const max = Math.max(1, ...w.lines.map((l) => Math.max(l.semaine, l.moyenne || 0, l.precedente || 0)));
  return (
    <>
      <div className="fade-up" style={CS}>
        <h3 style={{ ...H3, fontSize: 18 }}>Semaine du {dayLong(w.debut)} au {dayLong(w.fin)}</h3>
        <p style={{ fontSize: 12, color: C.muted, margin: "6px 0 18px", lineHeight: 1.6 }}>
          Dépenses du quotidien : tout ce qui sort, sauf le prêt, les impôts, les factures, les frais bancaires, les dépenses pro, les virements entre comptes et les placements.
        </p>
        <div className="grid-kpi" style={{ marginBottom: 20 }}>
          <Kpi i={0} label="Dépenses du quotidien" value={eur(w.total)} sub="Cette semaine" color={C.ink} />
          <Kpi i={1} label="Par rapport à la semaine d'avant" value={signed(vsPrev)} sub={w.totalPrev != null ? `${eur(w.totalPrev)} la semaine du ${dayLong(w.prevDebut)}` : "Pas encore de semaine précédente"} color={deltaColor(vsPrev)} />
          <Kpi i={2} label="Par rapport à votre moyenne" value={signed(vsMoy)} sub={w.totalMoy != null ? `${eur(w.totalMoy)} par semaine en moyenne sur 12 semaines` : "Moyenne indisponible"} color={deltaColor(vsMoy)} />
        </div>
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
            <thead>
              <tr>
                <th style={TH}>Catégorie</th>
                <th style={{ ...TH, width: "28%" }} />
                <th style={{ ...TH, textAlign: "right" }}>Cette semaine</th>
                <th style={{ ...TH, textAlign: "right" }}>Semaine d'avant</th>
                <th style={{ ...TH, textAlign: "right" }}>Moyenne 12 sem.</th>
                <th style={{ ...TH, textAlign: "right" }}>Écart</th>
              </tr>
            </thead>
            <tbody>
              {w.lines.map((l) => {
                const ecart = l.moyenne ? deltaPct(l.semaine, l.moyenne) : null;
                return (
                  <tr key={l.slug} className="row-hover">
                    <td style={{ ...TD, fontWeight: 600 }}>
                      {l.libelle}
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{l.transactions} opération{l.transactions > 1 ? "s" : ""}</div>
                    </td>
                    <td style={TD}>
                      <div style={{ position: "relative", height: 8, background: C.soft, borderRadius: 4 }}>
                        <div style={{ width: `${(l.semaine / max) * 100}%`, height: "100%", background: C.ink, borderRadius: 4 }} />
                        {l.moyenne != null && <div title="Moyenne 12 semaines" style={{ position: "absolute", top: -3, left: `calc(${(l.moyenne / max) * 100}% - 1px)`, width: 2, height: 14, background: C.orange }} />}
                      </div>
                    </td>
                    <td style={{ ...TD, textAlign: "right", fontWeight: 700 }}>{eur(l.semaine)}</td>
                    <td style={{ ...TD, textAlign: "right", color: C.muted }}>{l.precedente != null ? eur(l.precedente) : "—"}</td>
                    <td style={{ ...TD, textAlign: "right", color: C.muted }}>{eur(l.moyenne)}</td>
                    <td style={{ ...TD, textAlign: "right", fontWeight: 600, color: ecart == null ? C.muted : ecart > 0.25 ? C.red : ecart < -0.25 ? C.green : C.muted }}>{signed(ecart)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Note>Le trait orange marque la moyenne des 12 dernières semaines.</Note>
        {w.hors.length > 0 && (
          <Note>
            Hors quotidien cette semaine : {w.hors.map((r) => `${r.libelle} ${eur(r.depenses)}`).join(", ")}.
          </Note>
        )}
        {w.history.length >= 3 && (
          <div style={{ marginTop: 18 }}>
            <div style={LBL}>Dépenses du quotidien, semaine par semaine (6 derniers mois)</div>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={w.history} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.soft} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} width={44} />
                <Tooltip formatter={tooltipEur} />
                <Bar dataKey="total" name="Dépenses du quotidien" fill={C.ink} radius={[4, 4, 0, 0]} />
                {w.totalMoy != null && <Line type="linear" dataKey={() => Math.round(w.totalMoy)} name="Moyenne 12 sem." stroke={C.orange} strokeDasharray="4 4" dot={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        <Note>
          Semaine du dimanche au samedi, lue chaque dimanche matin. Les banques transmettent certaines opérations avec un à trois jours de retard : la dernière semaine est recalculée le dimanche suivant.
        </Note>
      </div>

      {groups && (
        <div className="fade-up" style={CS}>
          <h3 style={{ ...H3, fontSize: 18 }}>Commerçants suivis</h3>
          <p style={{ fontSize: 12, color: C.muted, margin: "6px 0 16px" }}>Même semaine, comparée à la moyenne des 12 dernières semaines.</p>
          <div className="grid-2col" style={{ gap: 18 }}>
            {groups.map((g) => (
              <div key={g.groupe} style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{g.groupe}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>
                    <b style={{ color: C.ink }}>{eur(g.total)}</b> · moyenne {eur(g.moyenne)}
                  </span>
                </div>
                {g.rows.map((r) => (
                  <div key={r.cle} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, fontSize: 13, padding: "6px 0", borderTop: `1px solid ${C.soft}` }}>
                    <span>{r.marchand}{r.operations ? <span style={{ color: C.muted, fontSize: 11 }}> · {r.operations} op.</span> : null}</span>
                    <span style={{ fontWeight: 700, color: (r.depenses || 0) > (r.moyenne_12s || 0) * 1.5 && (r.depenses || 0) > 20 ? C.red : C.ink }}>{eur(r.depenses)}</span>
                    <span style={{ color: C.muted, minWidth: 64, textAlign: "right" }}>{eur(r.moyenne_12s)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <Note>
            Recherche sur le libellé des opérations bancaires : un commerçant dont le libellé diffère n'apparaît pas, et « Uber » regroupe courses VTC et repas. Pour changer la liste, modifie la table Finary_Marchands_Suivis dans Airtable : elle est relue chaque dimanche.
          </Note>
        </div>
      )}
    </>
  );
}

function PlafondsSection({ data }) {
  const v = useMemo(() => {
    const cur = (data.budgetMois || []).find((b) => b.en_cours);
    const rows = (data.budgetCategories || []).filter((c) => cur && c.mois === cur.cle && c.objectif != null);
    return { cur, rows };
  }, [data]);
  const syncIso = synthese(data, "derniere_synchro").texte;
  if (!v.rows.length) {
    return (
      <div className="fade-up" style={{ ...CS, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Plafonds du mois</div>
        <Note>
          Aucun plafond défini. Dans l'app Finary, fixe un objectif mensuel sur les catégories du quotidien (Alimentation, Loisirs, Transports…). Ils s'afficheront ici après la mise à jour du dimanche.
        </Note>
      </div>
    );
  }
  const ref = syncIso ? new Date(syncIso) : new Date();
  const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const pace = Math.min(1, ref.getDate() / daysInMonth);
  return (
    <div className="fade-up" style={CS}>
      <h3 style={{ ...H3, fontSize: 18 }}>Plafonds de {monthLong(v.cur.cle)}</h3>
      <p style={{ fontSize: 12, color: C.muted, margin: "6px 0 16px" }}>
        Au {ref.getDate()} {MOIS_L[ref.getMonth()]}, {pct(pace)} du mois est écoulé. Le trait marque ce rythme.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {v.rows
          .sort((a, b) => (b.depenses || 0) / (b.objectif || 1) - (a.depenses || 0) / (a.objectif || 1))
          .map((r) => {
            const ratio = r.objectif ? (r.depenses || 0) / r.objectif : 0;
            const color = r.objectif_plancher ? (ratio >= pace ? C.green : C.orange) : ratio > 1 ? C.red : ratio > pace + 0.1 ? C.orange : C.green;
            return (
              <div key={r.cle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{r.libelle}{r.objectif_plancher ? <span style={{ color: C.muted, fontWeight: 400 }}> · minimum à atteindre</span> : null}</span>
                  <span><b style={{ color }}>{eur(r.depenses)}</b> <span style={{ color: C.muted }}>sur {eur(r.objectif)}</span></span>
                </div>
                <div style={{ position: "relative", height: 8, background: C.soft, borderRadius: 4, marginTop: 6 }}>
                  <div style={{ width: `${Math.min(1, ratio) * 100}%`, height: "100%", background: color, borderRadius: 4 }} />
                  <div style={{ position: "absolute", top: -3, left: `calc(${pace * 100}% - 1px)`, width: 2, height: 14, background: C.ink }} />
                </div>
              </div>
            );
          })}
      </div>
      <Note>Objectifs fixés dans Finary. Montants du mois à la dernière mise à jour.</Note>
    </div>
  );
}

export function BudgetReelTab({ finary }) {
  const d = finary.data;
  const [sel, setSel] = useState(null);
  const v = useMemo(() => {
    if (!d) return null;
    const bm = [...d.budgetMois].sort((a, b) => a.cle.localeCompare(b.cle));
    const cats = d.budgetCategories || [];
    const catMonths = [...new Set(cats.map((c) => c.mois))].sort();
    const def = [...catMonths].reverse().find((m) => !bm.find((b) => b.cle === m)?.en_cours) || catMonths[catMonths.length - 1];
    const history = bm.map((b) => ({ label: monthShort(b.cle), revenus: b.revenus, depenses: b.depenses, solde: b.solde }));
    const split = catMonths.map((m) => {
      const s = monthStats(m, bm, cats);
      return { label: monthShort(m), vie: Math.round(s.vie), placements: Math.round(s.placements), epargne: Math.round(s.epargne), revenus: Math.round(s.revenusActivite) };
    });
    return { bm, cats, catMonths, def, history, split };
  }, [d]);

  const month = sel || v?.def;
  const s = v && month ? monthStats(month, v.bm, v.cats) : null;
  const rec = synthese(d, "charges_recurrentes_mensuelles").valeur;
  const recN = synthese(d, "charges_recurrentes_nombre").valeur;
  const enCours = s?.b?.en_cours;
  const expenseRows = s ? s.rows.filter((r) => (r.depenses || 0) > 0).sort((a, b) => b.depenses - a.depenses) : [];
  const maxDep = Math.max(1, ...expenseRows.map((r) => r.depenses));

  return (
    <Gate finary={finary}>
      {v && s && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <TabHeader title="Budget réel" finary={finary} />
          <SemaineSection data={d} />
          <PlafondsSection data={d} />
          <h3 style={{ ...H3, fontSize: 18, marginTop: 8 }}>Analyse par mois</h3>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {v.catMonths.map((m) => (
              <button key={m} className="btn-press" style={chip(m === month)} onClick={() => setSel(m)}>{monthShort(m)}</button>
            ))}
          </div>

          <div className="grid-kpi">
            <Kpi i={0} label="Revenus d'activité" value={eur(s.revenusActivite)} sub="Catégorie Revenus de Finary : salaires, allocations, primes" color={C.blue} />
            <Kpi i={1} label="Dépenses de vie" value={eur(s.vie)} sub={`Toutes les sorties hors virements et placements (${eur(s.vieBrut)}), moins ${eur(s.remboursements)} de remboursements`} color={C.red} />
            <Kpi i={2} label="Placements nets" value={eur(s.placements)} sub={`Versé ${eur(s.placementsVerses)}, retiré ${eur(s.placementsRetires)}`} color={C.violet} />
            <Kpi i={3} label="Épargne du mois" value={eur(s.epargne)} sub={`${s.tauxEpargne != null ? `${num(s.tauxEpargne, 1)} % des revenus d'activité. ` : ""}Revenus d'activité moins dépenses de vie`} color={s.epargne >= 0 ? C.green : C.red} />
          </div>
          <div style={{ ...CS, padding: "14px 20px", fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
            <strong style={{ color: C.ink }}>Bilan, {monthLong(month)} :</strong>{" "}
            {eur(s.revenusActivite)} de revenus d&apos;activité
            {Math.abs(s.autresEntrees) >= 1 && <> {s.autresEntrees >= 0 ? "+" : "−"} {eur(Math.abs(s.autresEntrees))} d&apos;autres entrées</>}
            {" "}− {eur(s.vie)} de dépenses de vie
            {" "}{s.placements >= 0 ? "−" : "+"} {eur(Math.abs(s.placements))} de placements nets
            {" "}{s.virementsNets >= 0 ? "+" : "−"} {eur(Math.abs(s.virementsNets))} de virements nets
            {" "}= <strong style={{ color: C.ink }}>{eur(s.b.solde)}</strong> restés sur les comptes (le « solde » de Finary{s.b.taux_epargne != null ? `, qui affiche un taux d'épargne de ${num(s.b.taux_epargne, 1)} % car il compte les placements comme des dépenses` : ""}).
          </div>
          {enCours && <Note warn>{monthLong(month)} n'est pas terminé. Les chiffres couvrent le mois jusqu'à la dernière mise à jour.</Note>}
          <Note>Un mois seul trompe : une prime ou un salaire versé plus tôt ou plus tard fait varier l&apos;épargne d&apos;un mois à l&apos;autre. Compare plutôt plusieurs mois dans le graphique ci-dessous.</Note>

          <div className="grid-2col">
            <div className="fade-up" style={CS}>
              <h3 style={{ ...H3, fontSize: 18, marginBottom: 16 }}>Entrées et sorties, 12 mois</h3>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={v.history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.soft} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={(x) => `${Math.round(x / 1000)} k`} width={44} />
                  <Tooltip formatter={tooltipEur} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenus" name="Entrées" fill={C.blue} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="depenses" name="Sorties" fill={C.red} radius={[4, 4, 0, 0]} />
                  <Line type="linear" dataKey="solde" name="Solde" stroke={C.green} strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
              <Note>Totaux bruts de Finary : les virements entre vos comptes et les versements en placements comptent comme des sorties. Les montants très bas avant juin 2026 laissent penser que tous les comptes n'étaient pas encore connectés.</Note>
            </div>
            <div className="fade-up" style={CS}>
              <h3 style={{ ...H3, fontSize: 18, marginBottom: 16 }}>Revenus, dépenses de vie et épargne</h3>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={v.split} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.soft} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={(x) => `${Math.round(x / 1000)} k`} width={44} />
                  <Tooltip formatter={tooltipEur} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenus" name="Revenus d'activité" fill={C.blue} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vie" name="Dépenses de vie" fill={C.red} radius={[4, 4, 0, 0]} />
                  <Line type="linear" dataKey="epargne" name="Épargne du mois" stroke={C.green} strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
              <Note>Dépenses de vie : sorties totales moins virements et placements, moins les remboursements. Épargne du mois : revenus d&apos;activité moins dépenses de vie.</Note>
            </div>
          </div>

          <div className="fade-up" style={CS}>
            <div className="section-header" style={{ marginBottom: 14 }}>
              <h3 style={{ ...H3, fontSize: 18 }}>Dépenses par catégorie, {monthLong(month)}</h3>
              <span style={{ fontSize: 12, color: C.muted }}>{eur(s.b.depenses)} de sorties au total</span>
            </div>
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr>
                    <th style={TH}>Catégorie</th>
                    <th style={{ ...TH, width: "34%" }} />
                    <th style={{ ...TH, textAlign: "right" }}>Montant</th>
                    <th style={{ ...TH, textAlign: "right" }}>Moyenne 12 mois</th>
                    <th style={{ ...TH, textAlign: "right" }}>Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseRows.map((r) => {
                    const internal = INTERNAL.has(r.categorie);
                    const ecart = r.moyenne_12m ? (r.depenses - r.moyenne_12m) / r.moyenne_12m : null;
                    return (
                      <tr key={r.cle} className="row-hover">
                        <td style={{ ...TD, fontWeight: 600 }}>
                          {r.libelle}
                          {internal && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: C.muted, background: C.soft, padding: "2px 6px", borderRadius: 5 }}>mouvement interne</span>}
                          <div style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{r.transactions} opération{r.transactions > 1 ? "s" : ""}</div>
                        </td>
                        <td style={TD}>
                          <div style={{ height: 8, background: C.soft, borderRadius: 4 }}>
                            <div style={{ width: `${(r.depenses / maxDep) * 100}%`, height: "100%", background: internal ? "#a9bcd9" : C.ink, borderRadius: 4 }} />
                          </div>
                        </td>
                        <td style={{ ...TD, textAlign: "right", fontWeight: 700 }}>{eur(r.depenses)}</td>
                        <td style={{ ...TD, textAlign: "right", color: C.muted }}>{eur(r.moyenne_12m)}</td>
                        <td style={{ ...TD, textAlign: "right", fontWeight: 600, color: ecart == null ? C.muted : ecart > 0.25 ? C.red : ecart < -0.25 ? C.green : C.muted }}>
                          {ecart == null ? "—" : `${ecart > 0 ? "+" : ""}${pct(ecart)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Note>La moyenne porte sur les 12 mois complets avant {monthLong(month)}, selon Finary. Si des comptes manquaient dans Finary avant juin 2026, ces moyennes sont sous-estimées.</Note>
          </div>

          {rec != null && (
            <div className="fade-up" style={{ ...CS, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={LBL}>Charges récurrentes détectées</div>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, marginTop: 6 }}>{eur(rec)} <span style={{ fontSize: 14, color: C.muted, fontFamily: "'Manrope',sans-serif" }}>par mois</span></div>
              </div>
              <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, flex: 1, minWidth: 220 }}>
                {recN ? `${recN} prélèvements mensuels repérés par Finary. ` : ""}Les charges annuelles (assurances, taxe foncière) n'y figurent pas : c'est un minimum, pas le total de tes charges fixes.
              </p>
            </div>
          )}
        </div>
      )}
    </Gate>
  );
}


// ─── Contexte pour l'assistant IA ──────────────────────────────────────────
export function finaryContext(d) {
  if (!d) return "";
  try {
    const last = latestDate(d.patrimoine || []);
    const snap = (d.patrimoine || []).filter((r) => r.date === last);
    const foyer = snap.find((r) => r.personne === "Foyer") || {};
    const sync = synthese(d, "derniere_synchro").texte;
    let s = `\n\nDONNÉES RÉELLES FINARY (relevé du ${sync ? frDate(sync) : last}, mis à jour chaque semaine)\n`;
    s += `Patrimoine net du foyer : ${eur(foyer.net)} (actifs bruts ${eur(foyer.actifs)}, dettes ${eur(foyer.dettes)}, actifs financiers ${eur(foyer.actifs_financiers)}).\n`;
    s += `Par personne (patrimoine net) : ${snap.filter((r) => r.personne !== "Foyer").map((r) => `${r.personne} ${eur(r.net)}`).join(", ")}.\n`;
    const lastRep = latestDate(d.repartition || []);
    s += `Répartition des actifs : ${(d.repartition || []).filter((r) => r.date === lastRep).map((r) => `${r.categorie} ${eur(r.montant)}`).join(", ")}.\n`;
    (d.objectifs || []).forEach((o) => {
      s += `Objectif « ${o.nom} » : ${eur(o.actuel)} sur ${eur(o.cible)}, statut Finary ${STATUS[o.statut]?.[0] || o.statut}.\n`;
    });
    const p = (d.pret || [])[0];
    if (p) s += `Prêt immobilier : capital restant ${eur(p.capital_restant)} sur ${eur(p.montant_initial)}, taux ${p.taux} %, mensualité ${eur(p.mensualite)} hors assurance, fin ${p.fin}.\n`;
    const bm = [...(d.budgetMois || [])].sort((a, b) => a.cle.localeCompare(b.cle));
    const cats = d.budgetCategories || [];
    const months = [...new Set(cats.map((c) => c.mois))].sort();
    const enCours = (m) => !!bm.find((b) => b.cle === m)?.en_cours;
    s += `\nBUDGET RÉEL PAR MOIS (calculé à partir des catégories Finary).\n`;
    s += `Définitions : revenus d'activité = catégorie Revenus (salaires, allocations, primes). Dépenses de vie = toutes les sorties sauf virements et placements, moins les remboursements (crédit immobilier et impôts compris). Placements nets = versé moins retiré. Épargne du mois = revenus d'activité moins dépenses de vie.\n`;
    months.forEach((m) => {
      const st = monthStats(m, bm, cats);
      s += `- ${monthLong(m)}${st.b.en_cours ? " (mois en cours, partiel)" : ""} : revenus d'activité ${eur(st.revenusActivite)}, autres entrées ${eur(st.autresEntrees)}, dépenses de vie ${eur(st.vie)}, épargne du mois ${eur(st.epargne)}${st.tauxEpargne != null ? ` (${num(st.tauxEpargne, 1)} %)` : ""}, placements nets ${eur(st.placements)}, virements nets ${eur(st.virementsNets)}, reste sur les comptes ${eur(st.b.solde)}.\n`;
    });
    const complets = months.filter((m) => !enCours(m)).slice(-3);
    if (complets.length) {
      const stats = complets.map((m) => monthStats(m, bm, cats));
      const moy = (k) => stats.reduce((a, x) => a + (x[k] || 0), 0) / stats.length;
      s += `Moyenne des ${stats.length} derniers mois complets (${complets.map(monthLong).join(", ")}) : revenus d'activité ${eur(moy("revenusActivite"))}, dépenses de vie ${eur(moy("vie"))}, épargne ${eur(moy("epargne"))} par mois, placements nets ${eur(moy("placements"))} par mois. C'est la meilleure base pour parler de l'enveloppe mensuelle du foyer.\n`;
    }
    const autres = bm.filter((b) => !months.includes(b.cle));
    if (autres.length) {
      s += `Mois sans détail par catégorie (totaux bruts Finary, virements et placements compris) : ${autres.map((b) => `${monthLong(b.cle)} entrées ${eur(b.revenus)}, sorties ${eur(b.depenses)}`).join(" ; ")}.\n`;
    }
    const lastFull = [...months].reverse().find((m) => !enCours(m));
    const current = [...months].reverse().find((m) => enCours(m));
    [lastFull, current].filter(Boolean).forEach((m) => {
      s += `Dépenses par catégorie en ${monthLong(m)}${enCours(m) ? " (partiel)" : ""}, avec la moyenne mensuelle des 12 mois précédents : ${cats.filter((c) => c.mois === m && c.depenses > 0).sort((a, b) => b.depenses - a.depenses).map((c) => `${c.libelle} ${eur(c.depenses)}${c.moyenne_12m != null ? ` (moyenne ${eur(c.moyenne_12m)})` : ""}`).join(", ")}.\n`;
    });
    const rec = synthese(d, "charges_recurrentes_mensuelles").valeur;
    if (rec != null) s += `Charges récurrentes détectées par Finary : ${eur(rec)} par mois (hors charges annuelles).\n`;
    const w = weekView(d.semaine || []);
    if (w) {
      s += `Semaine du ${dayLong(w.debut)} au ${dayLong(w.fin)} : dépenses du quotidien ${eur(w.total)}`;
      if (w.totalPrev != null) s += `, semaine précédente ${eur(w.totalPrev)}`;
      if (w.totalMoy != null) s += `, moyenne des 12 dernières semaines ${eur(w.totalMoy)}`;
      s += `. Détail : ${w.lines.map((l) => `${l.libelle} ${eur(l.semaine)}${l.moyenne != null ? ` (moyenne ${eur(l.moyenne)})` : ""}`).join(", ")}.\n`;
    }
    const groups = merchantsView(d.marchands || []);
    if (groups) {
      s += `Commerçants suivis la même semaine (semaine / moyenne hebdo 12 semaines) : ${groups.flatMap((g) => g.rows).map((r) => `${r.marchand} ${eur(r.depenses)} / ${eur(r.moyenne_12s)}`).join(", ")}.\n`;
    }
    const A = analyser(d.transactions || [], d.comptes || []);
    const weeks = [...new Set(A.rows.map((t) => t.semaine).filter(Boolean))].sort().reverse().slice(0, 4);
    if (weeks.length) {
      s += `\nOPÉRATIONS BANCAIRES UNE À UNE (classement Finary : catégorie › sous-catégorie), semaines du dimanche au samedi, sans les virements entre vos comptes ni l'épargne. Format : date, libellé, montant (négatif = sortie), classement, compte, titulaire. Les virements vers Alizée, Noémie et Camille comptent comme mis de côté : ils vont sur leur livret A, leur compte, leur assurance vie ou leur CTO Trade Republic.\n`;
      weeks.forEach((wk) => {
        const rows = A.rows.filter((t) => t.semaine === wk);
        const t = totaux(rows);
        s += `Semaine du ${dayLong(wk)} au ${dayLong(addDays(wk, 6))} : quotidien ${eur(t.quotidien)}, charges et autres sorties ${eur(t.charges)}, mis de côté ${eur(t.epargne)}, entrées ${eur(t.entrees)}.\n`;
        s += rows.filter((x) => x.nature !== "interne" && x.nature !== "epargne").sort((x, y) => x.date.localeCompare(y.date)).map((x) => `${x.date.slice(8, 10)}/${x.date.slice(5, 7)} ${x.libelle} ${money(x.montant)} [${posteLabel(x)}${x.nature === "charges" ? ", hors quotidien" : ""}] (${x.compte}, ${x.personne || "titulaire inconnu"})`).join(" | ") + "\n";
      });
      const mv = mouvements(A.rows.filter((t) => weeks.includes(t.semaine)));
      const agg = new Map();
      for (const m of mv) agg.set(`${libelleNoeud(m.de)} vers ${libelleNoeud(m.vers)}`, (agg.get(`${libelleNoeud(m.de)} vers ${libelleNoeud(m.vers)}`) || 0) + m.montant);
      if (agg.size) s += `Virements entre les comptes de la famille sur ces 4 semaines (qui verse à qui) : ${[...agg.entries()].sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${eur(v)}`).join(", ")}.\n`;
      const filles = FILLES.map((f) => [f, sum(mv.filter((m) => m.vers === f), (m) => m.montant)]).filter(([, v]) => v > 0);
      if (filles.length) s += `Versé à chaque fille sur ces 4 semaines : ${filles.map(([f, v]) => `${f} ${eur(v)}`).join(", ")}.\n`;
    }
    s += `Limites : ${weeks.length ? "le détail des opérations ne couvre que les 4 dernières semaines, et la sous-catégorie n'existe que pour les commerçants couverts par une règle Finary" : "Finary ne donne ni le libellé des opérations ni les sous-catégories"}. Les mois avant juin 2026 semblent incomplets, donc les moyennes sur 12 mois sont un peu basses. Le taux d'épargne affiché par Finary compte les placements comme des dépenses : ne le cite pas comme le taux d'épargne réel.\n`;
    return s;
  } catch {
    return "";
  }
}
