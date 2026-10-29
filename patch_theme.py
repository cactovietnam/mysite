# -*- coding: utf-8 -*-
"""Đổi bảng màu toàn web cho dịu mắt:  python patch_theme.py   (chạy trong thư mục gốc dự án)
Trước: hồng cánh sen #ff2e93 + xanh neon #2af5d6, nút có quầng sáng hồng, nền ngả đỏ tía.
Sau  : MỘT màu nhấn tím oải hương #a78bfa (nút, link, nhãn), xanh ngọc dịu #5eead4 làm màu phụ, nền ngả xanh tím, nút phẳng bóng nhẹ.
Sửa mọi file .ts/.tsx/.css trong src/. Mỗi file đổi có bản .theme.bak; chạy lại không đổi thêm gì.
Muốn đổi màu chủ đạo khác: sửa dòng NEW_ACCENT rồi chạy lại trên bản .bak (hoặc sửa tay 2 biến --color-berry / --color-neon trong globals.css)."""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ACCENT, ACCENT_RGB = "#a78bfa", "167, 139, 250"   # tím oải hương
SECOND, SECOND_RGB = "#5eead4", "94, 234, 212"    # xanh ngọc dịu
DEEP = "#7c6cff"                                  # tím đậm cho gradient

RULES = [
    (r"#ff2e93", ACCENT),
    (r"#2af5d6", SECOND),
    (r"#b537f2", DEEP),
    (r"#db2777", DEEP),
    (r"rgba\(\s*255,\s*46,\s*147", f"rgba({ACCENT_RGB}"),
    (r"rgba\(\s*42,\s*245,\s*214", f"rgba({SECOND_RGB}"),
    (r"rgba\(\s*181,\s*55,\s*242", "rgba(124, 108, 255"),
    (r"rgba\(\s*124,\s*22,\s*78", "rgba(60, 44, 130"),          # quầng nền ngả đỏ tía -> xanh tím
    (r"rgba\(\s*255,\s*107,\s*152", f"rgba({ACCENT_RGB}"),      # viền sáng của .edge
    (r"shadow-\[0_(?:14|18)px_\d+px_-\d+px_var\(--color-berry\)\]", "shadow-md shadow-black/30"),  # bỏ quầng sáng hồng quanh nút
]
COMPILED = [(re.compile(p), r) for p, r in RULES]


def apply(text: str) -> str:
    for rx, rep in COMPILED: text = rx.sub(rep, text)
    return text


def main():
    src = ROOT / "src"
    if not src.is_dir(): sys.exit("✗ Không thấy thư mục src (chạy trong thư mục gốc dự án)")
    n = 0
    for p in sorted(src.rglob("*")):
        if p.suffix not in {".ts", ".tsx", ".css"} or not p.is_file(): continue
        with open(p, encoding="utf-8", newline="") as f: old = f.read()
        new = apply(old)
        if new == old: continue
        bak = p.with_name(p.name + ".theme.bak")
        if not bak.exists(): shutil.copy2(p, bak)
        with open(p, "w", encoding="utf-8", newline="") as f: f.write(new)
        print(f"✓ {p.relative_to(ROOT)}"); n += 1
    print(f"\nXong: đã đổi màu trong {n} file." if n else "\nKhông còn gì để đổi (đã áp dụng rồi).")


if __name__ == "__main__":
    main()
