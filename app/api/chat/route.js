import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "../../../lib/session";

export const dynamic = "force-dynamic";

const MAX_MESSAGES = 20;
const MAX_SYSTEM_CHARS = 80_000;
const MAX_MESSAGE_CHARS = 8_000;

export async function POST(request) {
  // Sans session valide, personne ne consomme la clé Anthropic.
  if (!getSessionUser(request)) return unauthorized();

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_KEY) {
    return NextResponse.json(
      { error: "Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans les variables d'environnement Vercel." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    const system = typeof body.system === "string" ? body.system : "";
    const tooLong =
      system.length > MAX_SYSTEM_CHARS ||
      messages.some((m) => typeof m?.content !== "string" || m.content.length > MAX_MESSAGE_CHARS) ||
      messages.some((m) => m?.role !== "user" && m?.role !== "assistant");
    if (!messages.length || tooLong) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages,
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || "Erreur API" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
