import { fetchHeadshotImage } from "@/lib/roblox-avatar.server";
import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ robloxId: string }> }) {
  const { robloxId } = await context.params;
  try {
    const image = await fetchHeadshotImage(robloxId);
    if (!image) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(image.body), {
      headers: {
        "Content-Type": image.type || "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
