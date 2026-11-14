// Session côté serveur : cookie httpOnly signé (HMAC-SHA256).
// Ce fichier ne doit jamais être importé depuis un composant client.
import crypto from "crypto";
import { NextResponse } from "next/server";

export const COOKIE_NAME = "bf_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 jours

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET manquant ou trop court (32 caractères minimum)");
  return s;
}

export function allowedEmails() {
  return (process.env.AUTHORIZED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function googleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
}

function mac(body) {
  return crypto.createHmac("sha256", secret()).update(body).digest("base64url");
}

export function signSession(user) {
  const payload = { ...user, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${mac(body)}`;
}

export function verifySession(token) {
  if (!token || typeof token !== "string" || token.length > 4096) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  let expected;
  try {
    expected = mac(body);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!p.exp || p.exp * 1000 < Date.now()) return null;
    // Retirer une adresse de AUTHORIZED_EMAILS coupe l'accès tout de suite.
    if (!allowedEmails().includes(String(p.email || "").toLowerCase())) return null;
    return { email: p.email, name: p.name || "", picture: p.picture || "" };
  } catch {
    return null;
  }
}

function readCookie(request, name) {
  const fromNext = request.cookies?.get?.(name)?.value;
  if (fromNext) return fromNext;
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function getSessionUser(request) {
  return verifySession(readCookie(request, COOKIE_NAME));
}

export function unauthorized() {
  return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
}

export function sessionCookie(value, maxAge = SESSION_MAX_AGE) {
  return {
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}
