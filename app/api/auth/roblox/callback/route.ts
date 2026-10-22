import { robloxEnabled, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { newId } from "@/lib/server/helpers";
import { fail } from "@/lib/server/http";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (!robloxEnabled()) return fail("Roblox login is not configured", 501);
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return fail("Missing Roblox code");

  const tokenRes = await fetch("https://apis.roblox.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.ROBLOX_CLIENT_ID!,
      client_secret: process.env.ROBLOX_CLIENT_SECRET!,
      redirect_uri: process.env.ROBLOX_REDIRECT_URI!,
    }),
  });
  if (!tokenRes.ok) return fail("Roblox token exchange failed", 401);
  const tokens = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) return fail("Roblox profile failed", 401);
  const profile = (await userRes.json()) as { sub: string; name?: string; preferred_username?: string };
  const robloxId = profile.sub;
  const name = (profile.preferred_username || profile.name || `Player${robloxId.slice(-4)}`).slice(0, 16);

  const staff = (process.env.STAFF_ROBLOX_IDS || "").split(",").map((id) => id.trim()).filter(Boolean);
  let user = await db.user.findUnique({ where: { robloxId } });
  if (!user) {
    user = await db.user.create({
      data: {
        id: newId("user"),
        robloxId,
        name,
        hue: Math.floor(Math.random() * 360),
        isStaff: staff.includes(robloxId),
      },
    });
  } else if (user.name !== name || user.isStaff !== staff.includes(robloxId)) {
    user = await db.user.update({
      where: { id: user.id },
      data: { name, isStaff: staff.includes(robloxId) },
    });
  }

  await setSessionCookie(user.id);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  return NextResponse.redirect(site);
}
