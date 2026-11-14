import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "../../../lib/session";

export const dynamic = "force-dynamic";

// Données Finary recopiées dans Airtable chaque semaine par Claude.
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
};

const CACHE_MS = 10 * 60 * 1000;
let cache = { at: 0, data: null };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchTable(base, token, table) {
  let all = [];
  let offset = null;
  do {
    const url = `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}?pageSize=100${offset ? `&offset=${offset}` : ""}`;
    let r;
    for (let attempt = 0; attempt < 3; attempt++) {
      r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (r.status !== 429) break;
      await sleep(1100 * (attempt + 1)); // Airtable limite à 5 requêtes par seconde
    }
    const d = await r.json();
    if (!r.ok) throw new Error(`${table} : ${d?.error?.message || d?.error?.type || r.status}`);
    all = all.concat((d.records || []).map((x) => x.fields || {}));
    offset = d.offset;
    await sleep(220);
  } while (offset);
  return all;
}

export async function GET(request) {
  if (!getSessionUser(request)) return unauthorized();
  const token = process.env.AIRTABLE_TOKEN;
  const base = process.env.AIRTABLE_BASE_ID;
  if (!token || !base) {
    return NextResponse.json({ error: "AIRTABLE_TOKEN ou AIRTABLE_BASE_ID manquant côté serveur" }, { status: 500 });
  }

  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  if (!refresh && cache.data && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.data, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const data = {};
    for (const [key, table] of Object.entries(TABLES)) {
      data[key] = await fetchTable(base, token, table);
    }
    cache = { at: Date.now(), data };
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 502 });
  }
}
