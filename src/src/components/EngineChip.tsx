import { engineColor } from "@/lib/game-ui";

export default function EngineChip({ engine, className = "" }: { engine: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      <i className="size-2 rounded-full" style={{ background: engineColor(engine), boxShadow: `0 0 10px ${engineColor(engine)}` }} />
      {engine}
    </span>
  );
}
