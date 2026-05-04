import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * MVP sliding-window limiter (in-process). On serverless multi-instance setups
 * this only partially helps; follow-up: Redis / Upstash or a CDN/WAF limit.
 */
const buckets = new Map<string, number[]>();

function slidingWindowAllow(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  let stamps = buckets.get(key);
  if (!stamps) {
    stamps = [];
    buckets.set(key, stamps);
  }
  while (stamps.length > 0 && now - stamps[0]! >= windowMs) {
    stamps.shift();
  }
  if (stamps.length >= limit) {
    return false;
  }
  stamps.push(now);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.length === 0) buckets.delete(k);
    }
  }
  return true;
}

function clientKey(req: NextRequest): string {
  const h = req.headers.get("x-forwarded-for");
  const first = h?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const method = req.method;
  const ip = clientKey(req);

  if (path === "/api/overview" && method === "GET") {
    if (!slidingWindowAllow(`overview:${ip}`, 120, 60_000)) {
      return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
    }
    return NextResponse.next();
  }

  if (path === "/api/auth/register" && method === "POST") {
    if (!slidingWindowAllow(`register:${ip}`, 15, 60_000)) {
      return NextResponse.json({ error: "Слишком много попыток" }, { status: 429 });
    }
    return NextResponse.next();
  }

  if (path === "/api/presence" && method === "POST") {
    if (!slidingWindowAllow(`presence:${ip}`, 90, 60_000)) {
      return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/overview", "/api/auth/register", "/api/presence"],
};
