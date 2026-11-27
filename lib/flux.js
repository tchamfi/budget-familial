// Qui possède chaque compte, d'où vient et où va chaque euro.
// Fonctions pures, sans React : l'onglet Opérations et l'assistant IA s'en servent.
//
// Règles décidées avec Lionel (novembre 2026) :
// - Un virement d'un compte de Lionel, d'Ophélie ou d'un compte commun vers une des filles compte
//   comme « mis de côté » : il part sur son livret A, son compte, son assurance vie ou son CTO Trade Republic.
// - Les deux virements de 75 € par fille, sans contrepartie visible, vont sur son CTO Trade Republic
//   (saisi à la main dans Finary, donc sans opérations).
// - « SEPA MME TCHAMFONG TCHOUGNA » désigne le livret A d'Alizée.

export const PARENTS = ["Lionel", "Ophélie"];
export const FILLES = ["Alizée", "Noémie", "Camille"];
export const PERSONNES = ["Lionel", "Ophélie", "Commun", "Alizée", "Noémie", "Camille"];

// Catégories Finary qui ne sont pas des dépenses du quotidien.
// « loan_payments » vient de la règle Kereis (assurance du prêt), « loan_payment » des mensualités.
export const HORS_QUOTIDIEN = new Set(["investment", "transfer", "loan_payment", "loan_payments", "taxes", "bills_and_utilities", "fees", "business_and_work", "income", "refunds"]);
const TRANSFERT = new Set(["transfer", "investment"]);

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

// Nom d'une fille dans un libellé de virement ou dans le nom d'un compte.
const INDICES_FILLES = [
  ["Camille", /\bCAMILLE\b/],
  ["Alizée", /\bALIZ(EE)?\b|TCHOUGNA A M$|^SEPA MME TCHAMFONG TCHOUGNA$/],
  ["Noémie", /\bNOEM(IE)?\b|TCHOUGNA N E$/],
];
export function filleDans(texte) {
  const t = norm(texte);
  for (const [nom, re] of INDICES_FILLES) if (re.test(t)) return nom;
  return null;
}
// Qui a envoyé un virement reçu, d'après son libellé.
function emetteurDans(texte) {
  const t = norm(texte);
  if (/LINDE|TCHOUASSI|MAMAN|OPHELIE/.test(t)) return "Ophélie";
  if (/\bLIONEL\b|\bPAPA\b|TCHOUGNA LI\b|\bLION\b/.test(t)) return "Lionel";
  return null;
}

const COMPTE_EPARGNE = /\b(PEA|LIVRET|LDD|LINXEA|PORTFOLIO|PER|CTO|KRAKEN|CRYPTO|ASSURANCE VIE|PLAN EPARGNE|TRADE REPUBLIC)\b/;

function parseTitulaires(s) {
  try {
    const a = JSON.parse(s || "[]");
    return Array.isArray(a) ? a.map((o) => String(o.name || "").trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

// Fiche de chaque compte : personne, nature (courant ou épargne), ambiguïté de nom.
export function indexComptes(comptes = []) {
  const parNom = new Map();
  for (const c of comptes) {
    const k = c.nom || "";
    if (!parNom.has(k)) parNom.set(k, []);
    parNom.get(k).push(c);
  }
  const fiches = new Map();
  for (const [nom, liste] of parNom) {
    const c = liste[0];
    const ambigu = liste.length > 1;
    let personne = filleDans(nom);
    if (!personne && !ambigu) {
      const t = parseTitulaires(c.titulaires);
      if (t.includes("Lionel") && t.includes("Ophélie")) personne = "Commun";
      else if (t.length) personne = t[0];
    }
    const courant = c.type === "checking" && !/TRADE REPUBLIC/.test(norm(nom));
    fiches.set(nom, {
      nom,
      type: c.type,
      personne,
      ambigu,
      candidats: ambigu ? liste.map((x) => parseTitulaires(x.titulaires)[0]).filter(Boolean) : [],
      genre: courant ? "courant" : "epargne",
      livret: c.type === "saving",
    });
  }
  return fiches;
}

function ficheDe(fiches, compte) {
  if (fiches.has(compte)) return fiches.get(compte);
  // Compte absent de Finary_Comptes (compte de passage de la banque, par exemple).
  return { nom: compte, type: null, personne: filleDans(compte), ambigu: false, candidats: [], genre: COMPTE_EPARGNE.test(norm(compte)) ? "epargne" : "transit", livret: false };
}

const jours = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);
const estTransfert = (t) => TRANSFERT.has(t.categorie) || !!t.exclue || t.sous_categorie === "internal_transfer";

// Associe chaque sortie à son entrée sur un autre compte de la famille.
// Ordre de préférence : nom de la fille dans le libellé, même titulaire, libellé de l'émetteur, date la plus proche.
function rapprocher(rows) {
  const sorties = rows.filter((t) => t.candidat && t.montant < 0);
  const entrees = rows.filter((t) => t.candidat && t.montant > 0);
  const options = [];
  for (const o of sorties) {
    const fille = filleDans(o.libelle);
    for (const i of entrees) {
      if (i.compte === o.compte) continue;
      if (Math.abs(i.montant + o.montant) > 0.005) continue;
      const d = jours(o.date, i.date);
      if (d < -1 || d > 4) continue;
      let s = -Math.abs(d);
      const pIn = i.fiche.personne;
      const pOut = o.fiche.personne;
      if (fille) {
        if (FILLES.includes(pIn) && pIn !== fille) continue;
        s += pIn === fille ? 100 : -20;
        // La Caisse d'Épargne nomme les livrets des filles « MME … » ou « MLLE … » ; les autres virements
        // portent leur prénom.
        if (pIn === fille) s += /\bM(ME|LLE)\b/.test(norm(o.libelle)) === i.fiche.livret ? 5 : -5;
      }
      const em = emetteurDans(i.libelle);
      if (em) {
        if (pOut === em || (!pOut && o.fiche.candidats.includes(em))) s += 20;
        else if (PARENTS.includes(pOut)) s -= 30;
      }
      if (pOut && pIn && pOut === pIn) s += 10;
      options.push([s, o, i]);
    }
  }
  options.sort((a, b) => b[0] - a[0] || a[1].date.localeCompare(b[1].date) || a[1].cle.localeCompare(b[1].cle) || a[2].cle.localeCompare(b[2].cle));
  for (const [, o, i] of options) {
    if (o.paire || i.paire) continue;
    o.paire = i;
    i.paire = o;
  }
}

// Personne d'une opération sur un compte au nom ambigu (deux comptes « Trade Republic Cash »).
function personneDe(t) {
  if (t.fiche.personne) return t.fiche.personne;
  if (t.paire) {
    const p = t.paire.fiche.personne;
    if (p && p !== "Commun" && !FILLES.includes(p) && t.fiche.candidats.includes(p)) return p;
    const em = t.montant > 0 ? emetteurDans(t.libelle) : emetteurDans(t.paire.libelle);
    if (em && t.fiche.candidats.includes(em)) return em;
  }
  return null;
}

const FOYER = new Set(["Lionel", "Ophélie", "Commun"]);

function nature(t) {
  const p = t.personne;
  const g = t.fiche.genre;
  if (t.paire) {
    const o = t.montant < 0 ? t : t.paire;
    const i = t.montant < 0 ? t.paire : t;
    const pO = o.personne;
    const pI = i.personne;
    let porteur = null; // l'opération qui porte le « mis de côté »
    if (FOYER.has(pO) && o.fiche.genre === "courant" && FILLES.includes(pI)) porteur = o;
    else if (FILLES.includes(pO)) porteur = null;
    else if (o.fiche.genre === "courant" && i.fiche.genre === "epargne") porteur = o;
    else if (o.fiche.genre === "epargne" && i.fiche.genre === "courant") porteur = i;
    else if (o.fiche.genre === "courant" && i.fiche.genre === "transit" && filleDans(o.libelle)) porteur = o;
    return porteur === t ? "epargne" : "interne";
  }
  if (estTransfert(t) || (t.montant > 0 && FILLES.includes(p) && g !== "courant")) {
    if (g !== "courant" || FILLES.includes(p)) return "interne";
    if (t.montant < 0 && filleDans(t.libelle)) return "epargne";
    if (t.categorie === "investment") return "epargne";
    if (t.exclue) return "interne";
    return t.montant < 0 ? "charges" : "entrees";
  }
  if (g !== "courant") return "interne";
  if (FILLES.includes(p) && t.montant > 0 && emetteurDans(t.libelle)) return "interne";
  if (t.montant >= 0) return "entrees";
  return HORS_QUOTIDIEN.has(t.categorie) ? "charges" : "quotidien";
}

// Nœud du schéma « qui verse à qui ».
export function noeud(t) {
  const p = t.personne;
  if (!p) return null;
  if (FILLES.includes(p)) return p;
  return `${p}|${t.fiche.genre === "courant" ? "courant" : "epargne"}`;
}
export function libelleNoeud(n) {
  if (!n) return "Compte inconnu";
  if (n === "Extérieur") return "Extérieur";
  if (FILLES.includes(n)) return n;
  const [p, g] = n.split("|");
  if (p === "Commun") return g === "courant" ? "Communs" : "Épargne commune";
  return g === "courant" ? `Courant ${p}` : `Épargne ${p}`;
}

// Point d'entrée : toutes les opérations, enrichies.
export function analyser(transactions = [], comptes = []) {
  const fiches = indexComptes(comptes);
  const vus = new Set();
  const rows = transactions.map((x) => {
    const t = { ...x, montant: +x.montant || 0, fiche: ficheDe(fiches, x.compte || "") };
    // Doublon d'import Finary : même livret, même jour, même libellé, même montant.
    if (t.fiche.livret && !t.fiche.ambigu) {
      const k = `${t.compte}|${t.date}|${t.libelle}|${t.montant}`;
      t.doublon = vus.has(k);
      vus.add(k);
    }
    t.candidat = !t.doublon && (estTransfert(t) || (t.montant > 0 && FILLES.includes(t.fiche.personne)));
    return t;
  });
  const utiles = rows.filter((t) => !t.doublon);
  rapprocher(utiles);
  for (const t of utiles) t.personne = personneDe(t);
  for (const t of utiles) t.nature = nature(t);
  for (const t of utiles) {
    if (t.paire) {
      t.vers = t.montant < 0 ? t.paire.compte : null;
      t.de = t.montant > 0 ? t.paire.compte : null;
    } else if (t.montant < 0 && t.nature === "epargne" && filleDans(t.libelle)) {
      t.fille = filleDans(t.libelle);
      t.vers = `CTO de ${t.fille}`;
    }
  }
  return { rows: utiles, doublons: rows.filter((t) => t.doublon), fiches };
}

// Les virements du schéma, une ligne par mouvement d'argent.
export function mouvements(rows) {
  const out = [];
  for (const t of rows) {
    if (t.montant >= 0) continue;
    const de = noeud(t);
    if (!de || !FOYER.has(t.personne)) continue;
    let vers = null;
    if (t.paire) {
      // Compte de passage de la banque (ouverture d'un livret au nom d'une fille).
      vers = t.paire.fiche.genre === "transit" && filleDans(t.libelle) ? filleDans(t.libelle) : noeud(t.paire);
      if (!vers) continue;
      const deEp = de.endsWith("|epargne");
      const versEp = vers.endsWith("|epargne");
      if (deEp && versEp) continue; // d'un placement à un autre
      if (de === vers) continue;
    } else if (t.fille) {
      vers = t.fille;
    } else if (t.nature === "charges" && TRANSFERT.has(t.categorie)) {
      vers = "Extérieur";
    } else continue;
    out.push({ de, vers, montant: -t.montant, t });
  }
  return out;
}

// Sommes par nature, pour une liste d'opérations.
export function totaux(rows) {
  const s = { quotidien: 0, charges: 0, epargne: 0, entrees: 0, n: { quotidien: 0, charges: 0, epargne: 0, entrees: 0, interne: 0 } };
  for (const t of rows) {
    s.n[t.nature] = (s.n[t.nature] || 0) + 1;
    if (t.nature === "quotidien") s.quotidien -= t.montant;
    else if (t.nature === "charges") s.charges -= t.montant;
    else if (t.nature === "epargne") s.epargne -= t.montant;
    else if (t.nature === "entrees") s.entrees += t.montant;
  }
  return s;
}
