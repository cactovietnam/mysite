import { engineColor, isHex } from "@/lib/game-ui";

// tint: nền + viền pha màu engine (dùng trên thẻ game để nhận ra engine ngay, kể cả khi ảnh nền sáng)
export default function EngineChip({ engine, className = "", tint }: { engine: string; className?: string; tint?: boolean }) {
  const c = engineColor(engine);
  const style = tint && isHex(c)
    ? { background: `linear-gradient(${c}40, ${c}40), rgba(15,12,26,0.74)`, borderColor: `${c}8c` }
    : undefined;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${className}`} style={style}>
      <i className="size-2 rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
      {engine}
    </span>
  );
}
