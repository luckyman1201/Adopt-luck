import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE = "adoptluck_session";

function secret() {
  const value = process.env.SESSION_SECRET || "dev-only-change-me-adopt-luck-session";
  return new TextEncoder().encode(value);
}

export async function signSession(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function setSessionCookie(userId: string) {
  const token = await signSession(userId);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return db.user.findUnique({ where: { id: payload.sub } });
  } catch {
    return null;
  }
}

export function robloxEnabled() {
  return Boolean(process.env.ROBLOX_CLIENT_ID && process.env.ROBLOX_CLIENT_SECRET);
}
