"use client";
// Briques d'interface du design « en relief » : bandeau marine, cartes flottantes, pilules, sphères.
import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export const T = {
  ink: "#0b1b33",
  muted: "#4b5b72",
  line: "#d5dde8",
  lineSoft: "#e6ebf3",
  soft: "#f3f6fb",
  bg: "#eef2f8",
  navy: "#12305c",
  navy2: "#2a5394",
  navy3: "#4f7cc0",
  navy4: "#86a6d6",
  navy5: "#c3d2ea",
  navySoft: "#e3eaf5",
  signal: "#1fb5c9",
  signalDark: "#0e8fa1",
  orange: "#cc7d1d",
  orangeInk: "#8a4d00",
  orangeBg: "#fdf3e6",
  orangeLine: "#f1cf9f",
  grey: "#8392a8",
};
export const SHADOW = "0 1px 2px rgba(11,27,51,.05), 0 18px 36px -16px rgba(18,48,92,.3)";

// Couleur de chaque personne (palette vérifiée pour le daltonisme), et les filles en violet.
export const PERS = {
  Lionel: { c: "#3462b0", hi: "#cfe0ff", lo: "#1b4378", soft: "#c8d6ef", bar: ["#5c86cf", "#3462b0"] },
  Ophélie: { c: "#13a1b5", hi: "#bff1f7", lo: "#0b6f7d", soft: "#c9eef3", bar: ["#45c3d3", "#13a1b5"] },
  Commun: { c: "#cc7d1d", hi: "#ffe2b8", lo: "#8a4d00", soft: "#f6e1c4", bar: ["#e1a24e", "#cc7d1d"] },
  Alizée: { c: "#8e5db8", hi: "#e6d6f5", lo: "#5c3580", soft: "#e8dcf3", bar: ["#a982cc", "#8e5db8"] },
  Noémie: { c: "#8e5db8", hi: "#e6d6f5", lo: "#5c3580", soft: "#e8dcf3", bar: ["#a982cc", "#8e5db8"] },
  Camille: { c: "#8e5db8", hi: "#e6d6f5", lo: "#5c3580", soft: "#e8dcf3", bar: ["#a982cc", "#8e5db8"] },
  Extérieur: { c: "#8392a8", hi: "#e1e6ee", lo: "#55637a", soft: "#e1e6ee", bar: ["#a5b4c8", "#8392a8"] },
  Épargne: { c: "#6f93d8", hi: "#dce7fa", lo: "#2a5394", soft: "#dce7fa", bar: ["#86a6d6", "#4f7cc0"] },
};
export const persOf = (p) => PERS[p] || PERS.Extérieur;
export const NOM_PERS = { Commun: "Communs" };

const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const eur0 = (n) => (n == null || Number.isNaN(+n) ? "—" : `${nf0.format(Math.round(n)).replace(/ /g, " ")} €`);
export const eur2 = (n) => (n == null || Number.isNaN(+n) ? "—" : `${n < 0 ? "−" : ""}${nf2.format(Math.abs(n)).replace(/ /g, " ")} €`);
export const signedEur = (n) => (n == null ? "—" : `${n >= 0 ? "+" : "−"}${eur0(Math.abs(n))}`);

// ─── Bandeau du haut : chaque onglet y place son titre, ses boutons et ses filtres ───
export const HeroCtx = createContext({ actions: null, extra: null, setText: () => {} });
export function HeroActions({ children }) {
  const { actions } = useContext(HeroCtx);
  return actions ? createPortal(children, actions) : null;
}
export function HeroExtra({ children }) {
  const { extra } = useContext(HeroCtx);
  return extra ? createPortal(children, extra) : null;
}
// Vrai sur un écran de téléphone : sert aux graphiques SVG, qui ne se réagencent pas en CSS.
export function useEtroit(max = 768) {
  const [etroit, setEtroit] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${max}px)`);
    const maj = () => setEtroit(mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, [max]);
  return etroit;
}

export function useHeroText(text) {
  const { setText } = useContext(HeroCtx);
  const key = JSON.stringify(text || null);
  useEffect(() => {
    setText(text || null);
    return () => setText(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setText]);
}
export function ReloadButton({ finary }) {
  return (
    <button type="button" className="hero-btn" onClick={() => finary.reload(true)} disabled={finary.loading}>
      <Icon name="reload" size={16} color="currentColor" />
      {finary.loading ? "Chargement…" : "Recharger"}
    </button>
  );
}

// ─── Icônes ────────────────────────────────────────────────────────────────
const PATHS = {
  reload: ["M21 12a9 9 0 1 1-3-6.7", "M21 3v6h-6"],
  cart: ["M6 6h15l-1.5 9h-12z", "M6 6 5 3H2", "c9,20,1.5", "c18,20,1.5"],
  box: ["M4 4h16v16H4z", "M4 9h16", "M9 14h6"],
  down: ["M12 3v12", "m7 10 5 5 5-5", "M4 20h16"],
  up: ["M12 21V9", "m7 14 5-5 5 5", "M4 4h16"],
  home: ["M3 11 12 4l9 7", "M5 10v10h14V10", "M10 20v-5h4v5"],
  ticket: ["M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 0 0-6V6H3z", "M14 6v12"],
  arrow: ["M5 12h14", "m13 6 6 6-6 6"],
  swap: ["M7 7h11", "m15 4 3 3-3 3", "M17 17H6", "m9 14-3 3 3 3"],
  fuel: ["M4 20V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14", "M3 20h12", "M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-3-3"],
  car: ["M5 17h14", "M6 17l1.5-6h9L18 17", "c8,18,1.5", "c16,18,1.5", "M4 17v-2", "M20 17v-2"],
  health: ["M12 5v14", "M5 12h14"],
  bolt: ["M13 2 4 14h7l-1 8 9-12h-7z"],
  bank: ["M3 10h18", "M5 10v8", "M10 10v8", "M14 10v8", "M19 10v8", "M3 20h18", "M12 3 3 8h18z"],
  food: ["M7 3v8", "M5 3v4a2 2 0 0 0 4 0V3", "M7 11v10", "M16 3c-2 0-3 2-3 5s1 4 3 4v9"],
  bag: ["M6 7h12l1 13H5z", "M9 7a3 3 0 0 1 6 0"],
  trend: ["M3 17 9 11l4 4 8-8", "M15 7h6v6"],
  warn: ["M12 3 2 20h20L12 3z", "M12 10v4", "M12 17h.01"],
  clock: ["c12,12,9", "M12 8v4l3 2"],
  search: ["c11,11,7", "m20 20-3.5-3.5"],
  chart: ["M4 19V10", "M10 19V5", "M16 19v-7", "M21 19H3"],
  gift: ["M4 10h16v10H4z", "M3 7h18v3H3z", "M12 7v13", "M12 7c-2-4-6-3-5 0", "M12 7c2-4 6-3 5 0"],
};
export function Icon({ name, size = 20, color = "#fff", stroke = 2 }) {
  const ps = PATHS[name] || PATHS.box;
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {ps.map((d, i) => {
        if (d.startsWith("c")) {
          const [cx, cy, r] = d.slice(1).split(",").map(Number);
          return <circle key={i} cx={cx} cy={cy} r={r} />;
        }
        return <path key={i} d={d} />;
      })}
    </svg>
  );
}
const TUILES = {
  navy: ["#2a5394", "#12305c", "rgba(18,48,92,.6)"],
  blue: ["#4f7cc0", "#2a5394", "rgba(42,83,148,.6)"],
  sky: ["#86a6d6", "#4f7cc0", "rgba(79,124,192,.6)"],
  teal: ["#4fd0de", "#0e8fa1", "rgba(14,143,161,.6)"],
  orange: ["#e1a24e", "#b0660f", "rgba(176,102,15,.6)"],
  grey: ["#a5b4c8", "#6f8099", "rgba(75,91,114,.6)"],
  periwinkle: ["#6f93d8", "#2a5394", "rgba(42,83,148,.6)"],
};
export function Tile({ icon, tone = "navy", size = 46, radius = 16 }) {
  const [a, b, s] = TUILES[tone] || TUILES.navy;
  return (
    <span aria-hidden="true" style={{ flex: "none", width: size, height: size, borderRadius: radius, background: `linear-gradient(145deg, ${a} 0%, ${b} 100%)`, boxShadow: `0 10px 18px -6px ${s}, inset 0 1px 0 rgba(255,255,255,.28)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={Math.round(size * 0.46)} />
    </span>
  );
}

// ─── Sphère de couleur pour une personne ───────────────────────────────────
export function Sphere({ p, size = 28, label, shadow = true, style }) {
  const c = persOf(p);
  const txt = label ?? (p ? p[0] : "?");
  return (
    <span aria-hidden="true" style={{ flex: "none", width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle at 30% 28%, #ffffff 0%, ${c.hi} 18%, ${c.c} 62%, ${c.lo} 100%)`, boxShadow: shadow && size >= 30 ? `0 8px 14px -6px ${c.c}b3` : "none", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: Math.max(10, Math.round(size * 0.34)), fontWeight: 800, ...style }}>
      {size >= 22 ? txt : null}
    </span>
  );
}

// ─── Cartes et titres ──────────────────────────────────────────────────────
export function Card({ children, style, className = "", as: Tag = "section", ...rest }) {
  return (
    <Tag className={`card ${className}`} style={style} {...rest}>
      {children}
    </Tag>
  );
}
export function CardHead({ title, sub, right }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px 16px", alignItems: "flex-start" }}>
      <div style={{ minWidth: 0 }}>
        <h2 className="card-title">{title}</h2>
        {sub && <p className="card-sub">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
export function Note({ children, tone = "plain" }) {
  if (tone === "box") return <p className="note-box">{children}</p>;
  return <p className="note">{children}</p>;
}

// ─── Pilules (choix exclusif) ───────────────────────────────────────────────
export function Segmented({ options, value, onChange, label, dark = false, small = false }) {
  return (
    <div role="group" aria-label={label} className={`seg ${dark ? "seg-dark" : ""} ${small ? "seg-small" : ""}`}>
      {options.map(([k, l]) => (
        <button key={k} type="button" aria-pressed={value === k} className={value === k ? "on" : ""} onClick={() => onChange(k)}>
          {l}
        </button>
      ))}
    </div>
  );
}
export function PersonChips({ options, value, onChange, dark = true }) {
  return (
    <div role="group" aria-label="Personne" className={`pchips ${dark ? "pchips-dark" : ""}`}>
      {options.map((p) => (
        <button key={p} type="button" aria-pressed={value === p} className={value === p ? "on" : ""} onClick={() => onChange(p)}>
          {p === "Famille" || p === "Tous" ? (
            <span aria-hidden="true" className="pchip-all">{p === "Famille" ? "5" : "∗"}</span>
          ) : (
            <Sphere p={p} size={26} />
          )}
          {NOM_PERS[p] || p}
        </button>
      ))}
    </div>
  );
}

// ─── Barres en capsule ──────────────────────────────────────────────────────
export function Track({ parts, height = 14, max }) {
  const total = max || parts.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
  const vis = parts.filter((p) => p.value > 0);
  return (
    <div className="track" style={{ height }}>
      {vis.map((p, i) => (
        <span
          key={p.key || i}
          title={p.title}
          style={{
            width: `${Math.min(100, (p.value / total) * 100)}%`,
            minWidth: 3,
            borderRadius: vis.length === 1 ? 999 : i === 0 ? "999px 4px 4px 999px" : i === vis.length - 1 ? "4px 999px 999px 4px" : 4,
            background: p.stripes ? `repeating-linear-gradient(135deg, ${p.color} 0 3px, ${p.stripes} 3px 7px)` : p.grad ? `linear-gradient(180deg, ${p.grad[0]}, ${p.grad[1]})` : p.color,
          }}
        />
      ))}
    </div>
  );
}

// ─── Anneau (répartition) ───────────────────────────────────────────────────
export function Donut({ parts, size = 200, center, sub, label }) {
  const C = 2 * Math.PI * 70;
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0);
  let off = 0;
  const id = `d${Math.round(total)}${parts.length}`;
  return (
    <svg role="img" aria-label={label} viewBox="0 0 200 200" style={{ width: size, height: size, flex: "none" }}>
      <defs>
        <filter id={`${id}s`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#12305c" floodOpacity="0.28" />
        </filter>
        <radialGradient id={`${id}h`} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef2f8" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="70" fill="none" stroke="#eef2f8" strokeWidth="26" />
      <g transform="rotate(-90 100 100)" filter={`url(#${id}s)`} fill="none" strokeWidth="26">
        {total > 0 &&
          parts.map((p, i) => {
            const L = (Math.max(0, p.value) / total) * C;
            const gap = parts.length > 1 && L > 5 ? 3 : 0;
            const dash = Math.max(L - gap, 0.8);
            const el = <circle key={i} cx="100" cy="100" r="70" stroke={p.color} strokeDasharray={`${dash.toFixed(1)} ${(C - dash).toFixed(1)}`} strokeDashoffset={(-off).toFixed(1)} />;
            off += L;
            return el;
          })}
      </g>
      <circle cx="100" cy="100" r="54" fill={`url(#${id}h)`} />
      <text x="100" y={sub ? 97 : 107} textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize={String(center || "").length > 8 ? 20 : 24} fontWeight="800" fill={T.navy}>
        {center}
      </text>
      {sub && (
        <text x="100" y="117" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="12" fontWeight="600" fill={T.muted}>
          {sub}
        </text>
      )}
    </svg>
  );
}
export function Legend({ items }) {
  return (
    <div style={{ flex: 1, minWidth: 210, display: "flex", flexDirection: "column", gap: 9 }}>
      {items.map((it, i) => (
        <div key={i} className="legend-row">
          <span aria-hidden="true" style={{ width: 13, height: 13, borderRadius: 5, background: it.color, flex: "none" }} />
          <span style={{ fontWeight: 700, minWidth: 0 }}>
            {it.label} {it.hint && <span className="hint">{it.hint}</span>}
          </span>
          <span className="mono" style={{ fontWeight: 600 }}>{it.value}</span>
          {it.pct != null && <span className="hint" style={{ textAlign: "right", minWidth: 44 }}>{it.pct}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Jauge (prêt) ───────────────────────────────────────────────────────────
export function Gauge({ value, size = 190, label, sub = "remboursé" }) {
  const C = 2 * Math.PI * 70;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <svg role="img" aria-label={label} viewBox="0 0 200 200" style={{ width: size, height: size, flex: "none" }}>
      <defs>
        <filter id="gaugeS" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#12305c" floodOpacity="0.3" />
        </filter>
        <linearGradient id="gaugeF" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#7fe0ec" />
          <stop offset="1" stopColor="#0e8fa1" />
        </linearGradient>
        <radialGradient id="gaugeH" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef2f8" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="70" fill="none" stroke="#e3eaf5" strokeWidth="24" />
      <g transform="rotate(-90 100 100)" filter="url(#gaugeS)">
        <circle cx="100" cy="100" r="70" fill="none" stroke="url(#gaugeF)" strokeWidth="24" strokeLinecap="round" strokeDasharray={`${(v * C).toFixed(1)} ${(C - v * C).toFixed(1)}`} />
      </g>
      <circle cx="100" cy="100" r="56" fill="url(#gaugeH)" />
      <text x="100" y="98" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="32" fontWeight="800" fill={T.navy}>
        {Math.round(v * 100)} %
      </text>
      <text x="100" y="120" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="12" fontWeight="600" fill={T.muted}>
        {sub}
      </text>
    </svg>
  );
}

// ─── Étiquettes ─────────────────────────────────────────────────────────────
export function Tag({ children, tone = "navy" }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}
export function Fresh({ etat, children }) {
  const warn = etat === "warn";
  return (
    <span className={`fresh fresh-${etat || "ok"}`}>
      {warn && <Icon name="warn" size={11} color={T.orangeInk} stroke={3} />}
      {etat === "old" && <Icon name="clock" size={11} color={T.orangeInk} stroke={3} />}
      {children}
    </span>
  );
}
