import { NextResponse } from "next/server";
import { reportError } from "@/lib/notify";

// shortcut: đếm theo từng instance serverless nên chỉ là lưới thô; cần chặt hơn thì chuyển sang Upstash/Supabase.
const hits = new Map<string, { n: number; reset: number }>();
const MAX_PER_MIN = 5;

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return new NextResponse(null, { status: 403 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (hits.size > 1000) hits.clear();
  const h = hits.get(ip);
  if (!h || now > h.reset) hits.set(ip, { n: 1, reset: now + 60_000 });
  else if (++h.n > MAX_PER_MIN) return new NextResponse(null, { status: 429 });

  const raw = await req.text();
  if (raw.length > 8192) return new NextResponse(null, { status: 413 });
  let b: { message?: unknown; stack?: unknown; path?: unknown };
  try { b = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
  if (typeof b.message !== "string" || !b.message) return new NextResponse(null, { status: 400 });

  const err = new Error(b.message.slice(0, 500));
  err.stack = typeof b.stack === "string" ? b.stack.slice(0, 2000) : undefined;
  await reportError(err, { source: "client", path: typeof b.path === "string" ? b.path.slice(0, 200) : undefined });
  return new NextResponse(null, { status: 204 });
}
