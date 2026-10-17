"use client";
import { useId, useState } from "react";

// Nội dung game nhiều khổ. fold > 0: chỉ hiện `fold` khổ đầu, các khổ sau ẩn sau nút "Xem thêm".
// Khổ bị ẩn vẫn nằm trong HTML (thuộc tính hidden) nên Google vẫn đọc đủ nội dung.
export default function ExpandableContent({ paragraphs, fold }: { paragraphs: string[]; fold: number }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const folded = fold > 0 && fold < paragraphs.length;

  return (
    <div className="max-w-[62ch] text-lg leading-relaxed text-white/70">
      <div id={id} className="flex flex-col gap-4">
        {paragraphs.map((p, i) => (
          <p key={i} hidden={folded && !open && i >= fold} className="whitespace-pre-line">{p}</p>
        ))}
      </div>
      {folded && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id}
                className="glass mt-4 rounded-full px-5 py-2 text-base font-semibold text-accent transition hover:bg-white/15 active:scale-95">
          {open ? "Thu gọn" : "… Xem thêm"}
        </button>
      )}
    </div>
  );
}
