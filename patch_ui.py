# -*- coding: utf-8 -*-
"""Chạy trong thư mục gốc dự án:  python patch_ui.py   (có file .bak, chạy lại không bị chèn trùng)
  - Library.tsx        : bỏ chip Yêu thích/Đã xem khỏi kho game (đã chuyển vào menu tài khoản)
  - Brand/HeaderShell/layout/NotificationBell/SearchBox : header vừa khít điện thoại (hết tràn viền)
"""
import shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
C = "src/components/"

# (đã có rồi thì bỏ qua | đoạn cũ | đoạn mới)
EDITS = {
    C + "Library.tsx": [
        (".filter(([k]) => filters.list === k)",
         '{([["fav", "Yêu thích", alive(fav), "#fb7185"], ["seen", "Đã xem", alive(seen), "#38bdf8"]] as const).map(([k, label, n, c]) => {',
         '{([["fav", "Yêu thích", alive(fav), "#fb7185"], ["seen", "Đã xem", alive(seen), "#38bdf8"]] as const).filter(([k]) => filters.list === k).map(([k, label, n, c]) => {'),
    ],
    C + "Brand.tsx": [
        ("items-center gap-2 sm:gap-3", 'className="group flex shrink-0 items-center gap-3"', 'className="group flex shrink-0 items-center gap-2 sm:gap-3"'),
        ("h-10 w-[38px]", 'className="h-12 w-[45px] shrink-0', 'className="h-10 w-[38px] shrink-0 sm:h-12 sm:w-[45px]'),
        ("max-[339px]:hidden", '<span className="flex flex-col leading-none">', '<span className="flex flex-col leading-none max-[339px]:hidden">'),
        ("text-xl font-extrabold sm:text-2xl", "var(--font-orbitron)] text-2xl font-extrabold", "var(--font-orbitron)] text-xl font-extrabold sm:text-2xl"),
    ],
    C + "HeaderShell.tsx": [
        ("px-1 will-change-transform sm:px-3", 'className="relative mx-auto max-w-6xl px-3 will-change-transform', 'className="relative mx-auto max-w-6xl px-1 will-change-transform sm:px-3'),
        ("gap-1 justify-self-end sm:gap-1.5", "ml-auto flex shrink-0 items-center gap-1.5 justify-self-end", "ml-auto flex shrink-0 items-center gap-1 justify-self-end sm:gap-1.5"),
    ],
    "src/app/layout.tsx": [
        ("max-[399px]:hidden", 'className="grid size-10 place-items-center rounded-full text-berry transition hover:bg-white/10 md:hidden"',
         'className="grid size-9 place-items-center rounded-full text-berry transition hover:bg-white/10 max-[399px]:hidden sm:size-10 md:hidden"'),
    ],
    C + "NotificationBell.tsx": [
        ("size-9 place-items-center", 'className="relative grid size-10 place-items-center rounded-full bg-white/10', 'className="relative grid size-9 place-items-center rounded-full bg-white/10 sm:size-10'),
    ],
    C + "SearchBox.tsx": [
        ("h-9 items-center", 'className="flex h-10 items-center justify-center rounded-lg', 'className="flex h-9 items-center justify-center rounded-lg sm:h-10'),
        ("px-2.5 text-sm text-slate-400", "bg-[rgba(30,27,46,0.85)] px-3 text-sm text-slate-400", "bg-[rgba(30,27,46,0.85)] px-2.5 text-sm text-slate-400"),
    ],
}


def main():
    failed = 0
    for rel, edits in EDITS.items():
        p = ROOT / rel
        if not p.is_file():
            print(f"✗ Không thấy {rel} (chạy trong thư mục gốc dự án)"); failed += 1; continue
        with open(p, encoding="utf-8", newline="") as f: text = f.read()
        eol = "\r\n" if "\r\n" in text else "\n"
        todo = []
        for marker, old, new in edits:
            if marker in text: print(f"  = {rel}: đã có '{marker}', bỏ qua"); continue
            if old not in text: print(f"✗ {rel}: không tìm thấy đoạn cần sửa:\n    {old.strip()[:80]!r}"); failed += 1; continue
            todo.append((old, new))
        if not todo: continue
        bak = p.with_name(p.name + ".bak")
        if not bak.exists(): shutil.copy2(p, bak)
        for old, new in todo: text = text.replace(old, new, 1)
        with open(p, "w", encoding="utf-8", newline="") as f: f.write(text)
        print(f"✓ {rel}: đã sửa {len(todo)} chỗ (bản gốc: {bak.name})")
    print("\nXong." if not failed else f"\n{failed} chỗ không sửa được: file của bạn khác bản mình thấy, gửi mình file đó.")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
