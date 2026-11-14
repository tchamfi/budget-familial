import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "../../../../lib/session";

export const dynamic = "force-dynamic";

// Seules ces tables sont accessibles depuis le navigateur, et seulement après connexion.
// Les tables Finary_* passent par /api/finary, en lecture seule.
const TABLES = new Set([
  "Revenus",
  "Charges",
  "Charges_Montants",
  "Epargne",
  "Epargne_montants",
  "Objectifs",
  "Epargne_ponctuelle",
]);
const RECORD_ID = /^rec[A-Za-z0-9]{14}$/;
const MAX_BODY = 100_000;

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

async function proxy(request, params, method) {
  if (!getSessionUser(request)) return unauthorized();

  const token = process.env.AIRTABLE_TOKEN;
  const base = process.env.AIRTABLE_BASE_ID;
  if (!token || !base) {
    return NextResponse.json({ error: "AIRTABLE_TOKEN ou AIRTABLE_BASE_ID manquant côté serveur" }, { status: 500 });
  }

  const parts = (params?.path || []).map(safeDecode);
  const [table, recordId, ...rest] = parts;
  if (!table || rest.length || !TABLES.has(table)) {
    return NextResponse.json({ error: "Table inconnue" }, { status: 404 });
  }
  if (recordId && !RECORD_ID.test(recordId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }
  if (method === "PATCH" && !recordId) {
    return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
  }

  const search = new URL(request.url).search;
  const url = `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}${recordId ? `/${recordId}` : ""}${search}`;
  const init = {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  };
  if (method === "POST" || method === "PATCH") {
    const body = await request.text();
    if (body.length > MAX_BODY) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
    init.body = body;
  }

  try {
    const r = await fetch(url, init);
    const text = await r.text();
    return new NextResponse(text, { status: r.status, headers: { "Content-Type": "application/json" } });
  } catch {
    return NextResponse.json({ error: "Airtable injoignable" }, { status: 502 });
  }
}

export async function GET(request, { params }) {
  return proxy(request, params, "GET");
}
export async function POST(request, { params }) {
  return proxy(request, params, "POST");
}
export async function PATCH(request, { params }) {
  return proxy(request, params, "PATCH");
}
export async function DELETE(request, { params }) {
  return proxy(request, params, "DELETE");
}
