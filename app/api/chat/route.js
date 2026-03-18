import { NextResponse } from "next/server";

export async function POST(request) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  
  if (!ANTHROPIC_KEY) {
    return NextResponse.json(
      { error: "Clé API Anthropic non configurée." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: body.system,
        messages: body.messages,
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
