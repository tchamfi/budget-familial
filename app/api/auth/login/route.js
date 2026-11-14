import { NextResponse } from "next/server";
import { allowedEmails, googleClientId, sessionCookie, signSession } from "../../../../lib/session";

export const dynamic = "force-dynamic";

const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

// Reçoit le jeton Google (ID token) du bouton de connexion,
// le fait vérifier par Google, puis pose le cookie de session.
export async function POST(request) {
  let credential = null;
  try {
    ({ credential } = await request.json());
  } catch {}
  if (!credential || typeof credential !== "string" || credential.length > 4096) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const clientId = googleClientId();
  if (!clientId || !process.env.SESSION_SECRET || allowedEmails().length === 0) {
    return NextResponse.json(
      { error: "Configuration serveur incomplète : GOOGLE_CLIENT_ID, SESSION_SECRET ou AUTHORIZED_EMAILS manquant." },
      { status: 500 }
    );
  }

  let info;
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
      cache: "no-store",
    });
    if (!r.ok) return NextResponse.json({ error: "Jeton Google refusé" }, { status: 401 });
    info = await r.json();
  } catch {
    return NextResponse.json({ error: "Google injoignable, réessaie." }, { status: 502 });
  }

  const email = String(info.email || "").toLowerCase();
  const valid =
    info.aud === clientId &&
    GOOGLE_ISSUERS.includes(info.iss) &&
    (info.email_verified === true || info.email_verified === "true") &&
    Number(info.exp) * 1000 > Date.now();

  if (!valid || !allowedEmails().includes(email)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const user = { email, name: info.name || "", picture: info.picture || "" };
  let token;
  try {
    token = signSession(user);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  const res = NextResponse.json({ user });
  res.cookies.set(sessionCookie(token));
  return res;
}
