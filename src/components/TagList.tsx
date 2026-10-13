"use client";
import { useState } from "react";

// Danh sách tag: tự xuống dòng khi dài; quá `limit` tag thì chỉ hiện `limit` tag + nút "… Xem thêm".
export default function TagList({ tags, lead, limit = 10, className = "" }: {
  tags: string[]; lead?: React.ReactNode; limit?: number; className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hidden = Math.max(0, tags.length - limit);
  const shown = expanded || hidden === 0 ? tags : tags.slice(0, limit);

  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {lead && <li className="max-w-full">{lead}</li>}
      {shown.map((t) => (
        <li key={t} className="glass max-w-full rounded-full px-3.5 py-1 text-xs font-medium [overflow-wrap:anywhere]">{t}</li>
      ))}
      {hidden > 0 && (
        <li>
          <button onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}
                  className="glass rounded-full px-3.5 py-1 text-xs font-semibold text-berry transition hover:bg-white/15 active:scale-95">
            {expanded ? "Thu gọn" : <><span aria-hidden>… </span>Xem thêm (+{hidden})</>}
          </button>
        </li>
      )}
    </ul>
  );
}
