"use client";
// Onglets alimentés par Finary : Patrimoine, Budget réel, Comptes & placements.
// Les données viennent des tables Finary_* d'Airtable (mises à jour chaque semaine par Claude),
// lues via /api/finary, en lecture seule.
import { useState, useEffect, useMemo, useCallback } from "react";
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
const C = { ink: "#1a1a2e", muted: "#8a8578", line: "#e8e4dd", soft: "#f2efeb", blue: "#1e40af", violet: "#6d28d9", green: "#15803d", red: "#b91c1c", orange: "#c2410c", teal: "#0e7490", pink: "#be185d", gold: "#a16207" };
const CS = { background: "#fff", borderRadius: 16, padding: 24, border: "1px solid rgba(26,26,46,0.06)", boxShadow: "0 2px 12px rgba(26,26,46,0.04)" };
const H3 = { fontFamily: "'DM Serif Display',serif", fontSize: 20, margin: 0, color: C.ink };
const LBL = { fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" };
const TH = { textAlign: "left", padding: "10px 12px", borderBottom: `2px solid ${C.line}`, color: C.muted, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" };
const TD = { padding: "10px 12px", borderBottom: "1px solid #f2efeb", fontSize: 13 };
const chip = (active) => ({ padding: "7px 14px", border: active ? `2px solid ${C.ink}` : "1px solid #ddd8d0", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400, background: active ? "rgba(26,26,46,0.06)" : "#fff", color: active ? C.ink : C.muted });

const PEOPLE = ["Lionel", "Ophélie", "Noémie", "Alizée", "Camille"];
const PERSON_COLOR = { Foyer: C.ink, Lionel: C.blue, "Ophélie": C.pink, "Noémie": C.teal, "Alizée": C.violet, Camille: C.gold };
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
    <div className={`card-hover fade-up stagger-${Math.min(i + 1, 4)}`} style={{ ...CS, borderTop: `3px solid ${color}`, padding: 20 }}>
      <div style={LBL}>{label}</div>
      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color, marginTop: 8, lineHeight: 1.15 }}>{value}</div>
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
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.ink, userSelect: "none" }}>
      <span onClick={() => onChange(!checked)} role="switch" aria-checked={checked} style={{ width: 34, height: 20, borderRadius: 10, background: checked ? C.ink : "#ddd8d0", position: "relative", transition: "background .2s" }}>
        <span style={{ position: "absolute", top: 2, left: checked ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
      </span>
      <span onClick={() => onChange(!checked)}>{label}</span>
    </label>
  );
}
function TabHeader({ title, finary, children }) {
  const sync = synthese(finary.data, "derniere_synchro").texte;
  return (
    <div className="section-header">
      <div>
        <h3 style={H3}>{title}</h3>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          {sync ? `Données Finary du ${frDateTime(sync)}. Mise à jour automatique chaque semaine.` : "Données Finary"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {children}
        <button className="btn-press" onClick={() => finary.reload(true)} disabled={finary.loading} style={{ padding: "8px 16px", background: "transparent", color: C.muted, border: "1px solid #ddd8d0", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
          {finary.loading ? "Chargement…" : "Recharger"}
        </button>
      </div>
    </div>
  );
}
function Gate({ finary, children }) {
  if (finary.data) return children;
  return (
    <div className="fade-up" style={{ ...CS, textAlign: "center", padding: 48 }}>
      {finary.error ? (
        <>
          <div style={{ ...H3, fontSize: 18 }}>Données Finary indisponibles</div>
          <p style={{ color: C.muted, fontSize: 13, margin: "10px 0 18px" }}>{finary.error}</p>
          <button className="btn-press" onClick={() => finary.reload(true)} style={{ padding: "8px 18px", background: C.ink, color: "#faf9f7", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Réessayer</button>
        </>
      ) : (
        <p style={{ color: C.muted, fontSize: 14 }}>Chargement des données Finary…</p>
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
function monthStats(m, budgetMois, cats) {
  const rows = cats.filter((c) => c.mois === m);
  const g = (slug) => rows.find((r) => r.categorie === slug) || {};
  const b = budgetMois.find((x) => x.cle === m) || {};
  const placements = g("investment").depenses || 0;
  const virements = g("transfer").depenses || 0;
  return {
    m,
    rows,
    b,
    revenusActivite: g("income").revenus || 0,
    remboursements: g("refunds").revenus || 0,
    placements,
    virements,
    vie: (b.depenses || 0) - placements - virements,
  };
}
function prevuPour(cle, revenus = [], chargesMontants = [], epargneMontants = []) {
  const y = +cle.slice(0, 4);
  const m = +cle.slice(5, 7);
  const rv = revenus.find((r) => r.fields?.annee === y && r.fields?.mois === m);
  const rev = rv ? (rv.fields.lionel || 0) + (rv.fields.ophelie || 0) + (rv.fields.prime_lionel || 0) + (rv.fields.prime_ophelie || 0) : null;
  const chg = sum(chargesMontants.filter((r) => r.fields?.annee === y && r.fields?.mois === m), (r) => (r.fields.lionel || 0) + (r.fields.ophelie || 0));
  const ep = sum(epargneMontants.filter((r) => r.fields?.annee === y && r.fields?.mois === m), (r) => r.fields.montant || 0);
  return { revenus: rev, charges: chg, epargne: ep, has: rv != null || chg > 0 || ep > 0 };
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
                    <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: C.ink, margin: "6px 0 10px" }}>{eur(withRe ? p.net : p.netSansImmo)}</div>
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
export function BudgetReelTab({ finary, revenus, chargesMontants, epargneMontants }) {
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
      return { label: monthShort(m), vie: Math.round(s.vie), placements: Math.round(s.placements), revenus: Math.round(s.revenusActivite) };
    });
    return { bm, cats, catMonths, def, history, split };
  }, [d]);

  const month = sel || v?.def;
  const s = v && month ? monthStats(month, v.bm, v.cats) : null;
  const prevu = month ? prevuPour(month, revenus, chargesMontants, epargneMontants) : null;
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
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {v.catMonths.map((m) => (
              <button key={m} className="btn-press" style={chip(m === month)} onClick={() => setSel(m)}>{monthShort(m)}</button>
            ))}
          </div>

          <div className="grid-kpi">
            <Kpi i={0} label="Revenus d'activité" value={eur(s.revenusActivite)} sub={`Catégorie Revenus de Finary. Total des entrées : ${eur(s.b.revenus)}, virements et remboursements compris`} color={C.blue} />
            <Kpi i={1} label="Dépenses de vie" value={eur(s.vie)} sub="Toutes les sorties, sans les virements entre vos comptes ni les versements en placements" color={C.red} />
            <Kpi i={2} label="Versé en placements" value={eur(s.placements)} sub="Sorties classées Investissements par Finary" color={C.violet} />
            <Kpi i={3} label="Solde Finary" value={eur(s.b.solde)} sub={s.b.taux_epargne != null ? `Taux d'épargne Finary : ${num(s.b.taux_epargne, 1)} %` : undefined} color={(s.b.solde || 0) >= 0 ? C.green : C.red} />
          </div>
          {enCours && <Note warn>{monthLong(month)} n'est pas terminé. Les chiffres couvrent le mois jusqu'à la dernière mise à jour.</Note>}

          {prevu?.has && (
          <div className="fade-up" style={CS}>
            <h3 style={{ ...H3, fontSize: 18 }}>Réel contre prévu, {monthLong(month)}</h3>
            {(
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 18 }}>
                  {[
                    ["Revenus", prevu.revenus, s.revenusActivite, "higher"],
                    ["Charges prévues / dépenses de vie", prevu.charges, s.vie, "lower"],
                    ["Épargne prévue / versé en placements", prevu.epargne, s.placements, "higher"],
                  ].map(([label, p, r, good]) => {
                    const ecart = p == null ? null : r - p;
                    const bad = ecart == null ? false : good === "lower" ? ecart > 0 : ecart < 0;
                    const max = Math.max(p || 0, r || 0, 1);
                    return (
                      <div key={label}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600 }}>{label}</span>
                          <span style={{ color: ecart == null ? C.muted : bad ? C.red : C.green, fontWeight: 700 }}>
                            {ecart == null ? "Pas de prévu" : `${ecart > 0 ? "+" : ""}${eur(ecart)}`}
                          </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 90px", gap: 8, alignItems: "center", marginTop: 6, fontSize: 11, color: C.muted }}>
                          <span>Prévu</span>
                          <div style={{ height: 8, background: C.soft, borderRadius: 4 }}><div style={{ width: `${((p || 0) / max) * 100}%`, height: "100%", background: "#c4c0b8", borderRadius: 4 }} /></div>
                          <span style={{ textAlign: "right" }}>{eur(p)}</span>
                          <span>Réel</span>
                          <div style={{ height: 8, background: C.soft, borderRadius: 4 }}><div style={{ width: `${((r || 0) / max) * 100}%`, height: "100%", background: C.ink, borderRadius: 4 }} /></div>
                          <span style={{ textAlign: "right", color: C.ink, fontWeight: 600 }}>{eur(r)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Note>Le prévu vient du budget saisi dans Airtable (tables Revenus, Charges et Épargne). Le réel vient de Finary. Les catégories ne correspondent pas une à une : la comparaison porte sur les totaux du mois.</Note>
              </>
            )}
          </div>
          )}

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
              <h3 style={{ ...H3, fontSize: 18, marginBottom: 16 }}>Dépenses de vie et placements</h3>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={v.split} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.soft} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={(x) => `${Math.round(x / 1000)} k`} width={44} />
                  <Tooltip formatter={tooltipEur} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="vie" name="Dépenses de vie" stackId="s" fill={C.red} />
                  <Bar dataKey="placements" name="Placements" stackId="s" fill={C.violet} radius={[4, 4, 0, 0]} />
                  <Line type="linear" dataKey="revenus" name="Revenus d'activité" stroke={C.blue} strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
              <Note>Calcul à partir des catégories Finary : sorties totales moins Virements et Investissements.</Note>
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
                            <div style={{ width: `${(r.depenses / maxDep) * 100}%`, height: "100%", background: internal ? "#c4c0b8" : C.ink, borderRadius: 4 }} />
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
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, marginTop: 6 }}>{eur(rec)} <span style={{ fontSize: 14, color: C.muted, fontFamily: "'DM Sans',sans-serif" }}>par mois</span></div>
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

// ─── Onglet Comptes & placements ────────────────────────────────────────────
const GROUP_ORDER = ["checking", "saving", "investment", "crypto", "real-estate", "loan", "credit", "startup", "other"];

export function ComptesTab({ finary }) {
  const d = finary.data;
  const [who, setWho] = useState("Foyer");
  const syncIso = synthese(d, "derniere_synchro").texte;
  const v = useMemo(() => {
    if (!d) return null;
    const accs = d.comptes
      .map((a) => ({ ...a, owners: parseOwners(a.titulaires) }))
      .map((a) => {
        const share = who === "Foyer" ? 1 : a.owners.find((o) => o.name === who)?.share || 0;
        return { ...a, share, part: (a.solde_eur || 0) * share };
      })
      .filter((a) => a.share > 0);
    const groups = GROUP_ORDER.map((t) => ({ type: t, rows: accs.filter((a) => a.type === t).sort((x, y) => Math.abs(y.part) - Math.abs(x.part)) })).filter((g) => g.rows.length);
    const tot = (types) => sum(accs.filter((a) => types.includes(a.type)), (a) => a.part);
    const positions = d.positions || [];
    const byAccount = [...new Set(positions.map((p) => p.compte))].map((compte) => ({ compte, rows: positions.filter((p) => p.compte === compte).sort((a, b) => (b.valeur || 0) - (a.valeur || 0)) }));
    return { groups, liquid: tot(["checking", "saving"]), placements: tot(["investment", "crypto"]), immo: tot(["real-estate"]), dettes: tot(["loan", "credit"]), byAccount };
  }, [d, who]);
  const showPositions = who === "Foyer" || who === "Lionel";

  return (
    <Gate finary={finary}>
      {v && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <TabHeader title="Comptes et placements" finary={finary} />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["Foyer", ...PEOPLE].map((p) => (
              <button key={p} className="btn-press" style={chip(who === p)} onClick={() => setWho(p)}>{p}</button>
            ))}
          </div>

          <div className="grid-kpi">
            <Kpi i={0} label="Liquidités" value={eur(v.liquid)} sub="Comptes courants et livrets" color={C.teal} />
            <Kpi i={1} label="Placements" value={eur(v.placements)} sub="PEA, assurances vie, PER, PEE, crypto" color={C.violet} />
            <Kpi i={2} label="Immobilier" value={eur(v.immo)} color={C.blue} />
            <Kpi i={3} label="Dettes" value={eur(v.dettes)} color={C.red} />
          </div>
          <Note>{who === "Foyer" ? "Montants à 100 % de chaque compte." : `Montants à la part de ${who} sur chaque compte.`} Ces totaux additionnent les comptes listés. Le total officiel Finary est dans l'onglet Patrimoine.</Note>

          {v.groups.map((g) => (
            <div key={g.type} className="fade-up" style={CS}>
              <div className="section-header" style={{ marginBottom: 12 }}>
                <h3 style={{ ...H3, fontSize: 18 }}>{TYPE_LABEL[g.type] || g.type}</h3>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{eur(sum(g.rows, (a) => a.part))}</span>
              </div>
              <div className="table-scroll">
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                  <thead>
                    <tr>
                      <th style={TH}>Compte</th>
                      <th style={TH}>Titulaire</th>
                      <th style={{ ...TH, textAlign: "right" }}>Solde</th>
                      {who !== "Foyer" && <th style={{ ...TH, textAlign: "right" }}>Part</th>}
                      <th style={{ ...TH, textAlign: "right" }}>Mise à jour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((a) => {
                      const age = a.maj && syncIso ? daysBetween(a.maj, syncIso) : null;
                      const stale = a.etablissement && a.type !== "real-estate" && age != null && age > 7;
                      return (
                        <tr key={a.cle} className="row-hover">
                          <td style={TD}>
                            <div style={{ fontWeight: 600 }}>{a.nom}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{a.etablissement || "Saisie manuelle"}{a.rendement ? ` · rémunéré ${num(a.rendement, 2)} %` : ""}</div>
                          </td>
                          <td style={{ ...TD, fontSize: 12, color: C.muted }}>{a.owners.map((o) => (o.share < 1 ? `${o.name} ${pct(o.share)}` : o.name)).join(", ")}</td>
                          <td style={{ ...TD, textAlign: "right", fontWeight: 600, color: a.type === "loan" || a.solde_eur < 0 ? C.red : C.ink }}>
                            {a.devise && a.devise !== "EUR" ? (
                              <>{money(a.solde, a.devise)}<div style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{money(a.solde_eur)}</div></>
                            ) : money(a.solde_eur)}
                          </td>
                          {who !== "Foyer" && <td style={{ ...TD, textAlign: "right" }}>{money(a.part)}</td>}
                          <td style={{ ...TD, textAlign: "right", fontSize: 12, color: stale ? C.orange : C.muted, whiteSpace: "nowrap" }}>
                            {frDate(a.maj)}{stale ? " · à vérifier" : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {showPositions && (
            <div className="fade-up" style={CS}>
              <h3 style={{ ...H3, fontSize: 18 }}>Lignes détenues</h3>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 4, marginBottom: 16 }}>
                Comptes de Lionel uniquement. Finary ne donne pas le détail des lignes pour les comptes d'Ophélie et des filles.
              </p>
              {v.byAccount.map(({ compte, rows }) => {
                const cur = rows[0]?.devise || "EUR";
                const sameCur = rows.every((r) => (r.devise || "EUR") === cur);
                const totVal = sum(rows, (r) => r.valeur);
                const totCost = sum(rows.filter((r) => r.pru != null), (r) => r.quantite * r.pru);
                const totLat = sum(rows.filter((r) => r.pru != null), (r) => r.valeur - r.quantite * r.pru);
                return (
                  <div key={compte} style={{ marginBottom: 22 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{compte}</span>
                      {sameCur && (
                        <span style={{ fontSize: 12, color: C.muted }}>
                          {money(totVal, cur)} · <b style={{ color: totLat >= 0 ? C.green : C.red }}>{totLat >= 0 ? "+" : ""}{money(totLat, cur)}</b>{totCost > 0 ? ` (${totLat >= 0 ? "+" : ""}${pct(totLat / totCost, 1)})` : ""}
                        </span>
                      )}
                    </div>
                    <div className="table-scroll">
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
                        <thead>
                          <tr>
                            <th style={TH}>Ligne</th>
                            <th style={{ ...TH, textAlign: "right" }}>Quantité</th>
                            <th style={{ ...TH, textAlign: "right" }}>Prix de revient</th>
                            <th style={{ ...TH, textAlign: "right" }}>Valeur</th>
                            <th style={{ ...TH, textAlign: "right" }}>Plus-value latente</th>
                            <th style={{ ...TH, textAlign: "right" }}>Frais / an</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((p) => {
                            const cost = p.pru != null ? p.quantite * p.pru : null;
                            const lat = cost != null ? p.valeur - cost : null;
                            return (
                              <tr key={p.cle} className="row-hover">
                                <td style={TD}>
                                  <div style={{ fontWeight: 600 }}>{p.nom}</div>
                                  <div style={{ fontSize: 11, color: C.muted }}>{[p.symbole, p.isin].filter(Boolean).join(" · ")}</div>
                                </td>
                                <td style={{ ...TD, textAlign: "right" }}>{num(p.quantite, 6)}</td>
                                <td style={{ ...TD, textAlign: "right" }}>{p.pru != null ? money(p.pru, p.devise) : "—"}</td>
                                <td style={{ ...TD, textAlign: "right", fontWeight: 700 }}>{money(p.valeur, p.devise)}</td>
                                <td style={{ ...TD, textAlign: "right", fontWeight: 600, color: lat == null ? C.muted : lat >= 0 ? C.green : C.red }}>
                                  {lat == null ? "—" : `${lat >= 0 ? "+" : ""}${money(lat, p.devise)}`}
                                  {lat != null && cost > 0 && <div style={{ fontSize: 11, fontWeight: 400 }}>{lat >= 0 ? "+" : ""}{pct(lat / cost, 1)}</div>}
                                </td>
                                <td style={{ ...TD, textAlign: "right", color: C.muted }}>{p.frais != null ? pct(p.frais, 2) : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              <Note>Plus-value latente calculée ici : valeur actuelle moins quantité × prix de revient Finary. Les lignes Kraken sont en dollars.</Note>
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
    s += `Budget réel Finary par mois (revenus d'activité / dépenses de vie hors virements et placements / versé en placements / solde Finary) :\n`;
    months.forEach((m) => {
      const st = monthStats(m, bm, cats);
      s += `- ${monthLong(m)}${st.b.en_cours ? " (en cours)" : ""} : ${eur(st.revenusActivite)} / ${eur(st.vie)} / ${eur(st.placements)} / ${eur(st.b.solde)}\n`;
    });
    const lastFull = [...months].reverse().find((m) => !bm.find((b) => b.cle === m)?.en_cours);
    if (lastFull) {
      s += `Dépenses par catégorie en ${monthLong(lastFull)} : ${cats.filter((c) => c.mois === lastFull && c.depenses > 0).sort((a, b) => b.depenses - a.depenses).map((c) => `${c.libelle} ${eur(c.depenses)}`).join(", ")}.\n`;
    }
    const rec = synthese(d, "charges_recurrentes_mensuelles").valeur;
    if (rec != null) s += `Charges récurrentes détectées par Finary : ${eur(rec)} par mois (hors charges annuelles).\n`;
    s += `Attention : dans Finary, les virements entre comptes et les versements en placements comptent comme des dépenses. Les mois avant juin 2026 semblent incomplets.\n`;
    return s;
  } catch {
    return "";
  }
}
