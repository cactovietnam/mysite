"use client";
import { useState } from "react";
import { useList } from "@/lib/user-lists";
import { GameTiles, PageHead, useGameIndex } from "./GameTiles";

// Yêu thích (đồng bộ tài khoản qua FavSync) + Đã xem (lưu theo trình duyệt). Chuyển từ menu người dùng vào đây.
export default function Saved() {
  const [tab, setTab] = useState<"fav" | "seen">("fav");
  const fav = useList("fav");
  const seen = useList("seen");
  const { games, failed } = useGameIndex();
  const list = tab === "fav" ? fav : seen;
  const bySlug = new Map((games ?? []).map((g) => [g.slug, g]));
  const shown = list.map((s) => bySlug.get(s)).filter((g): g is NonNullable<typeof g> => !!g); // bỏ game đã xóa; giữ thứ tự mới nhất trước

  const btn = (k: "fav" | "seen", label: string, n: number) => (
    <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${tab === k ? "bg-berry text-ink" : "bg-white/10 hover:bg-white/20"}`}>
      {label} <span className="tabular-nums opacity-70">{n}</span>
    </button>
  );

  return (
    <div className="space-y-6 pb-24">
      <PageHead eyebrow="Danh sách cá nhân" title="Yêu thích & Đã xem"
                desc="Bấm biểu tượng tim trên thẻ game để lưu vào Yêu thích. Game bạn mở xem sẽ tự vào Đã xem." />
      <div className="flex gap-2">{btn("fav", "Yêu thích", fav.length)}{btn("seen", "Đã xem", seen.length)}</div>
      {failed ? <p role="alert" className="text-haze">Không tải được danh sách game.</p>
        : !games ? <div aria-busy className="glass h-56 animate-pulse rounded-3xl" />
        : <GameTiles games={shown} empty={tab === "fav" ? "Chưa có game yêu thích." : "Chưa xem game nào."} />}
    </div>
  );
}
