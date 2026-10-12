"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import Link from "next/link";
import { games } from "@/data/games";

export default function SearchBox() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fuse = useMemo(
    () => new Fuse(games, { keys: ["title", "tags", "engine"], threshold: 0.35 }),
    []
  );
  const results = q ? fuse.search(q).slice(0, 6).map((r) => r.item) : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-white/80 hover:text-white">
        Tìm kiếm <span className="ml-1 text-xs text-white/40">Ctrl K</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-24"
             onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-xl bg-neutral-900 p-4" onClick={(e) => e.stopPropagation()}>
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                   placeholder="Tìm theo tên, tag hoặc engine"
                   className="w-full bg-transparent text-lg outline-none" />
            <ul className="mt-3 space-y-1">
              {results.map((g) => (
                <li key={g.slug}>
                  <Link href={`/game/${g.slug}`} onClick={() => { setOpen(false); setQ(""); }}
                        className="block rounded-lg px-3 py-2 hover:bg-white/10">
                    {g.title} <span className="text-xs text-white/40">{g.engine}</span>
                  </Link>
                </li>
              ))}
              {q && results.length === 0 && (
                <li className="px-3 py-2 text-sm text-white/50">Không tìm thấy game nào khớp.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
