"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

// Số người đang mở web, đếm bằng Supabase Realtime Presence (không cần bảng, không cần đăng nhập).
// shortcut: mỗi tab mở = 1 kết nối Realtime, gói Free giới hạn ~200 kết nối cùng lúc; vượt thì nâng gói hoặc bỏ component này.
export default function OnlineCount() {
  const [n, setN] = useState(0);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const ch = sb.channel("site-online", { config: { presence: { key: crypto.randomUUID() } } });
    ch.on("presence", { event: "sync" }, () => setN(Object.keys(ch.presenceState()).length))
      .subscribe((s) => { if (s === "SUBSCRIBED") void ch.track({ at: Date.now() }); });
    return () => { void sb.removeChannel(ch); };
  }, []);

  if (n < 1) return null;
  return (
    <span className="pointer-events-none absolute right-0 top-full mt-1.5 hidden items-center gap-1.5 rounded-full border border-white/10 bg-[rgba(30,27,46,0.85)] px-3 py-1 text-xs text-slate-300 xl:flex" style={{ opacity: "clamp(0, calc(1 - var(--hp) * 3), 1)" }} title="Đang online">
      <i aria-hidden className="size-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
      {n.toLocaleString("en-US")} Online
    </span>
  );
}
