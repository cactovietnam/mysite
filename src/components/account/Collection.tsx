"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuthUser } from "@/lib/auth-store";
import { fold } from "@/lib/library-filter";
import { GameTiles, PageHead, selectCls, useGameIndex } from "./GameTiles";

type Own = "own" | "not" | "all";
type Sort = "recent" | "new" | "name";

// Bộ sưu tập = game đã có đơn key thanh toán gắn với tài khoản (cùng nguồn với trang Key đã mua).
export default function Collection() {
  const user = useAuthUser();
  const { games, failed } = useGameIndex();
  const [owned, setOwned] = useState<Map<string, number> | null>(null); // slug -> thời điểm mua
  const [q, setQ] = useState("");
  const [own, setOwn] = useState<Own>("own");
  const [engine, setEngine] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  useEffect(() => {
    if (!user) return;
    let dead = false;
    (async () => {
      const m = new Map<string, number>();
      try {
        const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
        const r = token ? await fetch("/api/orders/mine", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }) : null;
        const d = r?.ok ? await r.json() as { orders: { paidAt: string | null; keys: { slug: string }[] }[] } : null;
        for (const o of d?.orders ?? []) for (const k of o.keys) m.set(k.slug, Math.max(m.get(k.slug) ?? 0, o.paidAt ? Date.parse(o.paidAt) : 0));
      } catch { /* mạng lỗi: coi như chưa sở hữu game nào */ }
      if (!dead) setOwned(m);
    })();
    return () => { dead = true; };
  }, [user]);

  const engines = useMemo(() => [...new Set((games ?? []).map((g) => g.engine))], [games]);
  const view = useMemo(() => {
    if (!games || !owned) return [];
    const n = fold(q);
    const out = games.filter((g) =>
      (own === "all" || (own === "own") === owned.has(g.slug)) && (!engine || g.engine === engine) && (!n || fold(g.title).includes(n)));
    if (sort === "name") out.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    if (sort === "recent") out.sort((a, b) => (owned.get(b.slug) ?? -1) - (owned.get(a.slug) ?? -1)); // sort ổn định: cùng điểm giữ thứ tự mới cập nhật
    return out;
  }, [games, owned, q, own, engine, sort]);

  if (user === null) {
    return <p className="glass rounded-3xl px-6 py-10 text-center text-haze">Bạn cần <Link href="/dang-nhap" className="font-medium text-berry hover:underline">đăng nhập</Link> để xem bộ sưu tập.</p>;
  }
  if (failed) return <p role="alert" className="text-haze">Không tải được danh sách game. Tải lại trang để thử lại.</p>;
  if (!games || !owned) return <div aria-busy className="glass h-72 animate-pulse rounded-3xl" />;

  const have = games.filter((g) => owned.has(g.slug)).length;
  const seg = (k: Own, label: string, n: number) => (
    <button key={k} type="button" aria-pressed={own === k} onClick={() => setOwn(k)}
            className={`flex-1 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider transition ${own === k ? "bg-berry text-ink" : "text-mist/70 hover:bg-white/10"}`}>
      {label}<span className="block text-[11px] tabular-nums opacity-70">{n}</span>
    </button>
  );
  const lab = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-haze";

  return (
    <div className="space-y-6 pb-24">
      <PageHead eyebrow="Bộ sưu tập" title="Game của bạn"
                desc="Những game bạn đã mua key, kèm lối tắt tới trang tải."
                aside={<p className="text-sm tabular-nums text-haze">{have}/{games.length} game</p>} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1.6fr_1fr_1fr]">
        <label><span className={lab}>Tìm game</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nhập tên game…" autoComplete="off" className={selectCls} /></label>
        <div><span className={lab}>Trạng thái sở hữu</span>
          <div role="group" className="flex overflow-hidden rounded-xl ring-1 ring-white/10">
            {seg("own", "Đã sở hữu", have)}{seg("not", "Chưa sở hữu", games.length - have)}{seg("all", "Tất cả", games.length)}
          </div></div>
        <label><span className={lab}>Engine</span>
          <select value={engine} onChange={(e) => setEngine(e.target.value)} className={selectCls}>
            <option value="">Tất cả engine</option>{engines.map((e) => <option key={e}>{e}</option>)}
          </select></label>
        <label><span className={lab}>Sắp xếp</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={selectCls}>
            <option value="recent">Mới sở hữu</option><option value="new">Mới cập nhật</option><option value="name">Tên A đến Z</option>
          </select></label>
      </div>

      <GameTiles games={view} empty={own === "own" && have === 0 ? "Bạn chưa sở hữu game nào. Mua key ở trang game để mở khóa." : "Không có game nào khớp bộ lọc."} />
    </div>
  );
}
