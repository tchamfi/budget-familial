import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "../../../../lib/session";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const user = getSessionUser(request);
  if (!user) return unauthorized();
  return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
