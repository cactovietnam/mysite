"use client";
import Link from "next/link";
import { thumbOf, type GameCardData } from "@/data/games";
import { engineColor, fmtDate, isHex } from "@/lib/game-ui";
import { gameBadges, isBadgeTag } from "@/lib/game-badges";
import { useList } from "@/lib/user-lists";
import Cover from "./Cover";
import FavoriteButton from "./FavoriteButton";
import EngineChip from "./EngineChip";
import { PatchChip } from "./GameBadges";
import NewBadge from "./NewBadge";

export default function GameCard({ game }: { game: GameCardData }) {
  const seen = useList("seen").includes(game.slug);
  const glow = isHex(game.accent) ? game.accent : engineColor(game.engine);
  const tags = game.tags.filter((t) => !isBadgeTag(t)).slice(0, 3);
  const { adult, patch } = gameBadges(game.tags);
  const frame = { "--c": glow, ...(game.blur ? { backgroundImage: `url("${game.blur}")` } : {}) } as React.CSSProperties;

  return (
    <div className="relative">
    <Link href={`/game/${game.slug}`}
          className="group relative block rounded-[1.9rem] p-2 transition-[transform,background-color] duration-300 ease-out hover:-translate-y-1 hover:bg-white/[0.06] focus-visible:-translate-y-1">
      {/* ánh sáng quanh ảnh: bóng đổ vẽ sẵn một lần, hover chỉ đổi opacity (box-shadow mà transition thì phải vẽ lại từng khung hình) */}
      <span aria-hidden className="pointer-events-none absolute inset-x-2 top-2 aspect-video rounded-[1.5rem] opacity-0 shadow-[0_28px_56px_-20px_var(--c)] transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
            style={{ "--c": glow } as React.CSSProperties} />
      {/* ảnh mờ làm nền: hiện ngay trong lúc ảnh thật còn đang tải */}
      <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-plum bg-cover ring-1 ring-[#8b5cf6]/25 transition-shadow duration-500 group-hover:ring-[#5eead4]/60"
           style={frame}>
        <Cover src={thumbOf(game)} title={game.title} engine={game.engine}
               className="h-full w-full transform-gpu object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <EngineChip engine={game.engine} tint className="glass" />
            {patch && <PatchChip patch={patch} />}
          </div>
          <NewBadge updatedAt={game.updatedAt} />
        </div>

        <div className={`absolute inset-x-0 bottom-0 px-4 pb-3.5 ${adult ? "pr-16" : ""}`}>
          {/* tag hiện lên phía trên tiêu đề bằng opacity + translate (chạy trên GPU). Bản cũ animate grid-template-rows nên mỗi khung hình phải tính lại bố cục */}
          {tags.length > 0 && (
            <ul className="pointer-events-none absolute inset-x-4 bottom-full flex translate-y-1.5 flex-wrap gap-1.5 pb-2 opacity-0 transition duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
              {tags.map((t) => (
                <li key={t} className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white">{t}</li>
              ))}
            </ul>
          )}
          <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight tracking-tight text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
            {game.title}
          </h3>
        </div>

        {adult && (
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-red-600 px-2 py-0.5 text-xs font-extrabold tracking-wide text-white shadow-lg shadow-black/40">
            18+
          </span>
        )}
      </div>

      <p className="mt-2.5 flex flex-wrap gap-x-3 px-1 text-sm tabular-nums text-haze">
        {seen && <span className="text-mist/70">Đã xem</span>}
        <span>v{game.version}</span>
        <span>{game.sizeGB}GB</span>
        <span>{fmtDate(game.updatedAt)}</span>
      </p>
    </Link>
    {/* ngoài Link để không lồng nút trong thẻ a; nằm dưới nhãn 18+, trên ảnh */}
    <div className="absolute left-5 top-14 z-10"><FavoriteButton slug={game.slug} /></div>
    </div>
  );
}
