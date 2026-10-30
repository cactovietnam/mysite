"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { LOGO } from "@/lib/logos";
import { PageHead } from "@/components/account/GameTiles";

type Status = { discord: { id: string; name: string; avatar: string | null; state: string } | null; purchases: number };

const NOTICE: Record<string, string> = {
  ok: "Đã liên kết, role khách hàng đã được cấp.",
  no_purchase: "Đã liên kết. Role sẽ được cấp khi bạn mua key bằng tài khoản này (đơn mua lúc chưa đăng nhập không được tính).",
  not_in_guild: "Đã liên kết nhưng bạn chưa ở trong server Discord. Vào server rồi bấm “Đồng bộ lại”.",
  already_linked: "Tài khoản này đã liên kết với một Discord khác.",
  discord_taken: "Discord này đã được liên kết với một tài khoản web khác.",
  cancelled: "Bạn đã hủy liên kết.",
  cooldown: "Thao tác quá nhanh, thử lại sau vài giây.",
  error: "Có lỗi khi liên kết, vui lòng thử lại.",
};
const STATE: Record<string, [string, string]> = {
  ok: ["Đã có role khách hàng", "text-emerald-300"],
  no_purchase: ["Chưa có role", "text-amber-200"],
  not_in_guild: ["Chưa vào server", "text-amber-200"],
  error: ["Đồng bộ lỗi", "text-red-300"],
};

const box = "rounded-3xl border border-white/10 bg-white/[0.04] p-6";
const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.22em]";

export default function DiscordLinkCard() {
  const [s, setS] = useState<Status | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<"" | "login" | "fail">("");

  async function call(init?: RequestInit) {
    const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
    if (!token) return null;
    const r = await fetch("/api/discord", { ...init, cache: "no-store", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    return { ok: r.ok, data: await r.json().catch(() => ({})) };
  }

  async function load() {
    try {
      const r = await call();
      if (!r) return setOut("login");
      if (r.ok) { setS(r.data); setOut(""); } else setOut("fail");
    } catch { setOut("fail"); }
  }

  useEffect(() => {
    const p = new URLSearchParams(location.search).get("discord");
    if (p) { setMsg(NOTICE[p] ?? ""); history.replaceState(null, "", location.pathname); }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(action: "link" | "sync") {
    setBusy(true);
    try {
      const r = await call({ method: "POST", body: JSON.stringify({ action }) });
      if (r?.ok && r.data.url) { location.href = r.data.url; return; }
      setMsg(NOTICE[r ? (r.ok ? r.data.state : r.data.code) : "error"] ?? NOTICE.error);
      await load();
    } catch { setMsg(NOTICE.error); }
    setBusy(false);
  }

  const head = <PageHead eyebrow="Cộng đồng" title="Discord" desc="Liên kết để nhận role khách hàng trong server sau khi mua key. Mỗi tài khoản chỉ liên kết được một Discord." />;
  if (!s) {
    return <div className="space-y-6 pb-24">{head}
      {out === "login" ? <p className={`${box} text-sm text-haze`}>Đăng nhập để liên kết Discord và nhận role khách hàng.</p>
        : out === "fail" ? <p className={`${box} text-sm text-haze`}>Không tải được thông tin Discord. Tải lại trang để thử lại.</p>
        : <div aria-busy className="h-40 animate-pulse rounded-3xl bg-white/[0.04]" />}
    </div>;
  }
  const d = s.discord;
  const [stTitle, stCls] = d ? STATE[d.state] ?? ["Chưa đồng bộ", "text-haze"] : ["Chưa liên kết", "text-haze"];
  const btn = "shrink-0 rounded-full bg-[#5865F2] px-6 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#4752C4] active:scale-95 disabled:opacity-40";

  return (
    <div className="space-y-6 pb-24">
      {head}

      {/* Thẻ liên kết: viền trái màu Discord, 3 cụm (danh tính · trạng thái · nút) */}
      <section className={`${box} flex flex-wrap items-center gap-x-8 gap-y-5 border-l-4 border-l-[#5865F2]`}>
        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#5865F2] text-white">
          {d?.avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={`https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=96`} alt="" className="size-full object-cover" />
            : <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden><path d={LOGO.discord.d} /></svg>}
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <p className={`${eyebrow} text-[#8c96ff]`}>Liên kết Discord</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">{d ? d.name : "Chưa liên kết"}</h2>
          <p className="mt-1 text-sm leading-relaxed text-haze">
            {d ? "Role được cấp tự động khi tài khoản có đơn key đã thanh toán." : "Mỗi tài khoản chỉ liên kết được một Discord và không tự gỡ được."}
          </p>
        </div>
        <div className="basis-48">
          <p className={`font-display text-lg font-bold ${stCls}`}>{stTitle}</p>
          {d && <p className="mt-1 max-w-[30ch] text-xs leading-relaxed text-haze">{NOTICE[d.state] ?? "Bấm “Đồng bộ lại” để cập nhật."}</p>}
        </div>
        {d ? <button type="button" onClick={() => act("sync")} disabled={busy} className={btn}>Đồng bộ lại</button>
           : <button type="button" onClick={() => act("link")} disabled={busy} className={btn}>Liên kết Discord</button>}
      </section>

      {/* Thẻ quyền lợi: số đơn key đã thanh toán (điều kiện để nhận role) */}
      <section className={`${box} flex flex-wrap items-end justify-between gap-4`}>
        <div className="max-w-[52ch]">
          <p className={`${eyebrow} text-[#5eead4]`}>Quyền lợi · Role khách hàng</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">Đơn key đã thanh toán</h2>
          <p className="mt-2 text-sm leading-relaxed text-haze">Chỉ đơn mua khi đang đăng nhập mới được tính. Mua xong mở trang này, hệ thống tự cấp role nếu bạn đã liên kết.</p>
        </div>
        <p className="flex items-baseline gap-2">
          <span className="bg-gradient-to-r from-[#5eead4] to-[#ee5a96] bg-clip-text font-display text-5xl font-extrabold tabular-nums text-transparent">{s.purchases}</span>
          <span className={`${eyebrow} text-haze`}>đơn</span>
        </p>
      </section>

      {msg && <p role="status" className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{msg}</p>}
    </div>
  );
}
