# -*- coding: utf-8 -*-
"""Đổi bảng màu toàn web:  python patch_theme.py   (chạy trong thư mục gốc dự án)
Bảng màu "Slate & Sky" nhẹ mắt, thay cho hồng cánh sen + tím nặng:
  - Nền xanh than (ink #0b1220, plum #131c2e) thay cho nền ngả tím
  - Màu nhấn DUY NHẤT xanh trời #38bdf8 (nút, link, nhãn), phụ xanh ngọc #5eead4, gradient xanh dương #3b82f6
  - Nút phẳng, bóng đen nhẹ, bỏ quầng sáng màu
  - Yêu thích (nút tim, chip, Khám phá nhanh, menu) màu ĐỎ #ef4444
Chạy được cả trên bản gốc lẫn bản đã chạy patch_theme cũ (tím). Mỗi file đổi có bản .theme.bak (bản gốc đầu tiên);
chạy lại không đổi thêm. Hoàn tác: chép đè từng file từ .theme.bak.
Muốn màu nhấn khác: sửa ACCENT/ACCENT_RGB/DEEP bên dưới, chép .theme.bak đè lại rồi chạy lại."""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ACCENT, ACCENT_RGB = "#38bdf8", "56, 189, 248"   # xanh trời
DEEP, DEEP_RGB = "#3b82f6", "59, 130, 246"       # xanh dương (gradient)
SECOND, SECOND_RGB = "#5eead4", "94, 234, 212"   # xanh ngọc
RED = "#ef4444"                                  # màu Yêu thích

HEX = {  # màu cũ (gốc + bản tím) -> màu mới
    "#ff2e93": ACCENT, "#a78bfa": ACCENT, "#8b5cf6": ACCENT,
    "#2af5d6": SECOND,
    "#b537f2": DEEP, "#db2777": DEEP, "#7c6cff": DEEP, "#7c5cff": DEEP,
    "#7c3aed": "#2563eb", "#c4b5fd": "#bae6fd",
    "#0f0c1a": "#0b1220", "#1a1530": "#131c2e", "#100c20": "#0e1626", "#14102b": "#101a2c",
    "#efeaff": "#eaf1fb", "#a59dc9": "#9fb0c8",
    "#ff6b98": ACCENT, "#fb7185": RED,
}
RGB = [  # (r, g, b cũ) -> "r, g, b" mới
    ((255, 46, 147), ACCENT_RGB), ((167, 139, 250), ACCENT_RGB), ((255, 107, 152), ACCENT_RGB),
    ((181, 55, 242), DEEP_RGB), ((124, 92, 255), DEEP_RGB), ((124, 108, 255), DEEP_RGB),
    ((42, 245, 214), SECOND_RGB),
    ((124, 22, 78), "37, 99, 160"), ((60, 44, 130), "37, 99, 160"),
    ((139, 92, 246), "148, 163, 184"),
    ((15, 12, 26), "11, 18, 32"), ((30, 27, 46), "22, 31, 48"),
]

# Quy tắc riêng cho Yêu thích: chạy TRƯỚC bảng chung (vì #ff6b98 cũng là chấm "Tất cả game")
FAV = [
    (re.compile(r'(id: "fav", label: "Yêu thích của bạn", count: favCount, dot: ")#[0-9a-fA-F]{6}'), r"\g<1>" + RED),
    (re.compile(r'on \? "text-berry"'), 'on ? "text-red-500"'),
]
RULES = [(re.compile(re.escape(k), re.I), v) for k, v in HEX.items()]
RULES += [(re.compile(r"rgba\(\s*%d,\s*%d,\s*%d" % c), "rgba(" + new) for c, new in RGB]
RULES.append((re.compile(r"shadow-\[0_(?:14|18)px_\d+px_-\d+px_var\(--color-berry\)\]"), "shadow-md shadow-black/30"))  # bỏ quầng sáng quanh nút


def apply(text: str) -> str:
    for rx, rep in FAV + RULES: text = rx.sub(rep, text)
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
