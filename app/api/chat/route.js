import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "../../../lib/session";

export const dynamic = "force-dynamic";
// Les recherches sur data.gouv.fr allongent le temps de réponse.
export const maxDuration = 60;

const MAX_MESSAGES = 20;
const MAX_SYSTEM_CHARS = 80_000;
const MAX_MESSAGE_CHARS = 8_000;
const MODEL = "claude-sonnet-4-6";
const MAX_CONTINUATIONS = 3;

// Serveur MCP public de data.gouv.fr : lecture seule, sans clé.
// Mettre DATAGOUV_MCP_URL=off dans Vercel pour le couper.
const DATAGOUV_MCP_URL = process.env.DATAGOUV_MCP_URL || "https://mcp.data.gouv.fr/mcp";
const DATAGOUV_TOOLS = ["search_datasets", "get_dataset_info", "list_dataset_resources", "get_resource_info", "query_resource_data"];
const MCP_BETA = "mcp-client-2025-11-20";

async function callClaude(key, payload, withMcp) {
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
  };
  const body = { ...payload };
  if (withMcp) {
    headers["anthropic-beta"] = MCP_BETA;
    body.mcp_servers = [{ type: "url", url: DATAGOUV_MCP_URL, name: "datagouv" }];
    body.tools = [
      {
        type: "mcp_toolset",
        mcp_server_name: "datagouv",
        default_config: { enabled: false },
        configs: Object.fromEntries(DATAGOUV_TOOLS.map((t) => [t, { enabled: true }])),
      },
    ];
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

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
    const raw = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    const system = typeof body.system === "string" ? body.system : "";
    const tooLong =
      system.length > MAX_SYSTEM_CHARS ||
      raw.some((m) => typeof m?.content !== "string" || m.content.length > MAX_MESSAGE_CHARS) ||
      raw.some((m) => m?.role !== "user" && m?.role !== "assistant");
    if (!raw.length || tooLong) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    const messages = raw.map((m) => ({ role: m.role, content: m.content }));
    // La conversation envoyée à Claude doit commencer par un message de l'utilisateur.
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (!messages.length) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

    let useMcp = DATAGOUV_MCP_URL.startsWith("https://");
    const payload = { model: MODEL, max_tokens: 2000, system, messages };
    let { res, data } = await callClaude(ANTHROPIC_KEY, payload, useMcp);

    // Si data.gouv.fr ne répond pas, l'assistant répond quand même, sans ses outils.
    let datagouvIndisponible = false;
    if (!res.ok && useMcp) {
      useMcp = false;
      ({ res, data } = await callClaude(ANTHROPIC_KEY, payload, false));
      datagouvIndisponible = res.ok;
    }
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || "Erreur API" }, { status: res.status });
    }

    // Une réponse longue peut s'arrêter en "pause_turn" : on renvoie le début pour que Claude termine.
    const blocks = [...(data.content || [])];
    let convo = messages;
    for (let i = 0; i < MAX_CONTINUATIONS && data.stop_reason === "pause_turn"; i++) {
      convo = [...convo, { role: "assistant", content: data.content }];
      ({ res, data } = await callClaude(ANTHROPIC_KEY, { ...payload, messages: convo }, useMcp));
      if (!res.ok) break;
      blocks.push(...(data.content || []));
    }

    const text = blocks
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text.trim())
      .join("\n\n");
    const datagouv = blocks.filter((b) => b.type === "mcp_tool_use").length;
    const datagouvErreurs = blocks.filter((b) => b.type === "mcp_tool_result" && b.is_error).length;

    return NextResponse.json({
      content: [{ type: "text", text }],
      datagouv,
      datagouvErreurs,
      datagouvIndisponible,
    });
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
