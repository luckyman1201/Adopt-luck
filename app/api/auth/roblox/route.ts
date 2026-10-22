import { robloxEnabled } from "@/lib/auth";
import { fail } from "@/lib/server/http";
import { NextResponse } from "next/server";

export async function GET() {
  if (!robloxEnabled()) {
    return fail("Roblox login is not configured. Add ROBLOX_CLIENT_ID and ROBLOX_CLIENT_SECRET.", 501);
  }
  const redirect = process.env.ROBLOX_REDIRECT_URI!;
  const url = new URL("https://apis.roblox.com/oauth/v1/authorize");
  url.searchParams.set("client_id", process.env.ROBLOX_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", crypto.randomUUID());
  return NextResponse.redirect(url.toString());
}
