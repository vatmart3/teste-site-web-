import { conversionsToday, remainingQuota } from "@/lib/cache";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_QUOTA = Number(process.env.FICHE_FREE_QUOTA ?? "3");

export function GET(request: NextRequest): Response {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "anonyme";
  return Response.json({
    today: conversionsToday(),
    remaining: remainingQuota(ip, FREE_QUOTA),
    quota: FREE_QUOTA,
  });
}
