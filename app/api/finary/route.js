import { NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { getSessionUser, unauthorized } from "../../../lib/session";
import { semaineDeDonnees } from "../../../lib/semaine";

export const dynamic = "force-dynamic";

// Données Finary recopiées dans Airtable chaque dimanche par une tâche planifiée Claude.
// Lecture seule : cette route ne fait que des GET vers Airtable.
const TABLES = {
  comptes: "Finary_Comptes",
  patrimoine: "Finary_Patrimoine",
  repartition: "Finary_Repartition",
  budgetMois: "Finary_Budget_Mois",
  budgetCategories: "Finary_Budget_Categories",
  objectifs: "Finary_Objectifs",
  positions: "Finary_Positions",
  pret: "Finary_Pret",
  synthese: "Finary_Synthese",
  semaine: "Finary_Semaine",
  marchands: "Finary_Marchands",
};

// Le site n'affiche que les semaines récentes. Tout l'historique reste dans Airtable.
const FILTRES = {
  // Graphique hebdomadaire : les 6 derniers mois.
  semaine: "IS_AFTER({debut}, DATEADD(TODAY(), -183, 'days'))",
  // Le site n'affiche que la dernière semaine. 5 semaines gardent une marge si une synchro saute.
  marchands: "IS_AFTER({debut}, DATEADD(TODAY(), -35, 'days'))",
};

// Cache partagé entre toutes les instances Vercel (cache de données de Next).
// La tâche planifiée écrit les tables le dimanche vers 6 h, heure de Paris.
// Une lecture d'Airtable sert donc toute la semaine, du dimanche 7 h au dimanche suivant 7 h.
// Le bouton « Recharger » vide ce cache à tout moment.
const CACHE_TAG = "finary";
const CACHE_SECONDS = 8 * 24 * 60 * 60;

// Airtable accepte 5 requêtes par seconde et par base : on espace les départs de 250 ms (4 par seconde).
const PARALLELE = 4;
const ECART_MS = 250;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let prochainDepart = 0;
async function attendreSonTour() {
  const now = Date.now();
  const depart = Math.max(now, prochainDepart);
  prochainDepart = depart + ECART_MS;
  if (depart > now) await sleep(depart - now);
}

async function fetchTable(base, token, table, formule) {
  let all = [];
  let offset = null;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (formule) params.set("filterByFormula", formule);
    if (offset) params.set("offset", offset);
    const url = `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}?${params}`;
    let r;
    for (let attempt = 0; attempt < 3; attempt++) {
      await attendreSonTour();
      r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (r.status !== 429) break;
      await sleep(1100 * (attempt + 1));
    }
    const d = await r.json();
    if (!r.ok) throw new Error(`${table} : ${d?.error?.message || d?.error?.type || r.status}`);
    all = all.concat((d.records || []).map((x) => x.fields || {}));
    offset = d.offset;
  } while (offset);
  return all;
}

async function lireAirtable() {
  const token = process.env.AIRTABLE_TOKEN;
  const base = process.env.AIRTABLE_BASE_ID;
  const entries = Object.entries(TABLES);
  const lu = {};
  let next = 0;
  async function lecteur() {
    while (next < entries.length) {
      const [key, table] = entries[next++];
      lu[key] = await fetchTable(base, token, table, FILTRES[key]);
    }
  }
  await Promise.all(Array.from({ length: PARALLELE }, lecteur));
  return Object.fromEntries(entries.map(([key]) => [key, lu[key]]));
}

// La semaine fait partie de la clé : le premier passage après le dimanche 7 h relit Airtable.
const lireEnCache = unstable_cache(async (_semaine) => lireAirtable(), ["finary-airtable-v2"], {
  revalidate: CACHE_SECONDS,
  tags: [CACHE_TAG],
});

export async function GET(request) {
  if (!getSessionUser(request)) return unauthorized();
  if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE_ID) {
    return NextResponse.json({ error: "AIRTABLE_TOKEN ou AIRTABLE_BASE_ID manquant côté serveur" }, { status: 500 });
  }

  // Bouton « Recharger » : on vide le cache partagé et on relit Airtable tout de suite.
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";

  try {
    let data;
    if (refresh) {
      revalidateTag(CACHE_TAG);
      data = await lireAirtable();
    } else {
      data = await lireEnCache(semaineDeDonnees());
    }
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 502 });
  }
}
