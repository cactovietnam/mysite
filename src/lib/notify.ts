// Chỉ import file này từ code chạy trên server (route handler, instrumentation). Không import vào component client.
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

type Ctx = { source: "server" | "client"; path?: string; method?: string };
type Entry = { fingerprint: string; source: Ctx["source"]; message: string; stack?: string; path?: string; method?: string };
type Alerts = { discord: boolean; dedupeSeconds: number; webhookUrl?: string };

const DEFAULTS: Alerts = { discord: true, dedupeSeconds: 300 };
const TIMEOUT_MS = 4000;
// Webhook đặt từ quan_ly.py (cmd 7) lưu trong Supabase; chỉ nhận đúng dạng webhook Discord. Trống thì dùng biến DISCORD_WEBHOOK_URL.
const WEBHOOK_RE = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

const db = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
};

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// Xóa bí mật trước khi gửi ra ngoài: lỗi có thể chứa URL webhook, token, JWT.
const scrub = (s: string) =>
  s
    .replace(/https:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/\S+/g, "[webhook]")
    .replace(/(Bearer\s+|access_token=|apikey=|key=)[\w.\-]+/gi, "$1[redacted]")
    .replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g, "[jwt]");

function normalize(err: unknown, ctx: Ctx): Entry {
  const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err));
  const message = scrub(e.message || e.name).slice(0, 1000);
  const stack = e.stack ? scrub(e.stack).slice(0, 3000) : undefined;
  const key = `${ctx.source}|${message.split("\n")[0]}|${ctx.path ?? ""}`;
  const fingerprint = createHash("sha256").update(key).digest("hex").slice(0, 32);
  return { fingerprint, source: ctx.source, message, stack, path: ctx.path, method: ctx.method };
}

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

async function sendDiscord(e: Entry, url: string | undefined): Promise<string> {
  if (!url) return "no_config";
  const fields = [
    e.path && { name: "Đường dẫn", value: cut(e.path, 200), inline: true },
    e.method && { name: "Method", value: e.method, inline: true },
    { name: "Mã lỗi", value: e.fingerprint.slice(0, 8), inline: true },
    e.stack && { name: "Stack", value: "```\n" + cut(e.stack, 900) + "\n```" },
  ].filter(Boolean);
  const r = await post(url, {
    allowed_mentions: { parse: [] }, // lỗi từ trình duyệt là dữ liệu không tin cậy: chặn @everyone/@role
    embeds: [{
      title: e.source === "client" ? "⚠️ Lỗi trình duyệt (người dùng báo, chưa xác thực)" : "🚨 Lỗi hệ thống",
      description: "```\n" + cut(e.message, 1500) + "\n```",
      color: e.source === "client" ? 0xf59e0b : 0xe11d48,
      fields,
      timestamp: new Date().toISOString(),
    }],
  });
  return r.ok ? "ok" : `http_${r.status}`;
}

// shortcut: cache theo từng instance serverless, đổi cài đặt từ cmd 7 có hiệu lực sau tối đa 30s.
let cache: { at: number; v: Alerts } | null = null;
async function getAlerts(sb: ReturnType<typeof db>): Promise<Alerts> {
  if (cache && Date.now() - cache.at < 30_000) return cache.v;
  let v = DEFAULTS;
  if (sb) {
    const { data } = await sb.from("app_settings").select("value").eq("key", "error_alerts").maybeSingle();
    if (data?.value) v = { ...DEFAULTS, ...(data.value as Partial<Alerts>) };
  }
  cache = { at: Date.now(), v };
  return v;
}

/** Báo lỗi hệ thống tới Discord và ghi error_logs. Không bao giờ throw (lỗi của bộ báo lỗi không được làm sập request). */
export async function reportError(err: unknown, ctx: Ctx): Promise<void> {
  try {
    const e = normalize(err, ctx);
    const sb = db();
    const cfg = await getAlerts(sb); // DB lỗi -> dùng mặc định "bật", vẫn báo được

    let dup = false;
    if (sb && cfg.dedupeSeconds > 0) {
      const since = new Date(Date.now() - cfg.dedupeSeconds * 1000).toISOString();
      const { count } = await sb.from("error_logs").select("id", { count: "exact", head: true })
        .eq("fingerprint", e.fingerprint).eq("alerted", true).gte("created_at", since);
      dup = (count ?? 0) > 0;
    }

    const notified: Record<string, string> = {};
    if (dup) {
      notified.skipped = "duplicate";
    } else {
      const run = async (name: string, on: boolean, fn: (e: Entry) => Promise<string>) => {
        if (!on) { notified[name] = "disabled"; return; }
        try { notified[name] = await fn(e); } catch { notified[name] = "error"; }
      };
      const hook = cfg.webhookUrl && WEBHOOK_RE.test(cfg.webhookUrl) ? cfg.webhookUrl : process.env.DISCORD_WEBHOOK_URL;
      await run("discord", cfg.discord, (x) => sendDiscord(x, hook));
    }

    await sb?.from("error_logs").insert({
      fingerprint: e.fingerprint, source: e.source, message: e.message, stack: e.stack, path: e.path,
      meta: { method: e.method }, notified, alerted: Object.values(notified).includes("ok"),
    });
  } catch (inner) {
    console.error("[notify] reportError failed:", inner);
  }
}
