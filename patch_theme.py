# -*- coding: utf-8 -*-
"""Bảng màu "ấm, dịu" (quay về hồng/tím như ban đầu nhưng bớt chói):  python patch_theme.py   (trong thư mục gốc dự án)
  - Hồng cánh sen chói #ff2e93 -> hồng dịu #ee5a96; xanh neon #2af5d6 -> xanh ngọc #5eead4; tím #b537f2 -> tím #9d6bf0
  - Nền ngả đỏ tía bớt sáng; nút phẳng, bóng đen nhẹ, bỏ quầng sáng hồng
  - Yêu thích (nút tim, chip, Khám phá nhanh, menu) màu ĐỎ #e5484d
  - Các màu tím/xanh trời dùng riêng (engine, link host, chip Đã xem, viền thẻ...) GIỮ như bản gốc
Chạy được trên: bản gốc, bản đã chạy patch_theme tím, bản đã chạy patch_theme xanh. File đã đổi trước đó được trả về đúng màu gốc
(dựa vào file .theme.bak) rồi mới áp bảng màu mới, nên các sửa đổi khác (patch_key/patch_ui) không bị mất.
Chạy lại không đổi thêm gì. Muốn màu khác: sửa ACCENT/DEEP/RED ở đầu file rồi chạy lại."""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ACCENT, ACCENT_RGB = "#ee5a96", "238, 90, 150"
DEEP, DEEP_RGB = "#9d6bf0", "157, 107, 240"
SECOND, SECOND_RGB = "#5eead4", "94, 234, 212"
RED = "#e5484d"

# ---------- BẢNG MÀU MỚI: tính từ file GỐC ----------
_HEX = {"#ff2e93": ACCENT, "#2af5d6": SECOND, "#b537f2": DEEP, "#db2777": "#d6407f", "#fb7185": RED}
_RGB = {(255, 46, 147): ACCENT_RGB, (42, 245, 214): SECOND_RGB, (181, 55, 242): DEEP_RGB, (124, 22, 78): "100, 34, 80"}
_FAV = [
    (re.compile(r'(id: "fav", label: "Yêu thích của bạn", count: favCount, dot: ")#[0-9a-fA-F]{6}'), r"\g<1>" + RED),
    (re.compile(r'on \? "text-berry"'), 'on ? "text-red-500"'),
]
_NEW = [(re.compile(re.escape(k), re.I), v) for k, v in _HEX.items()]
_NEW += [(re.compile(r"rgba\(\s*%d,\s*%d,\s*%d" % c), "rgba(" + v) for c, v in _RGB.items()]
_NEW.append((re.compile(r"shadow-\[0_(?:14|18)px_\d+px_-\d+px_var\(--color-berry\)\]"), "shadow-md shadow-black/30"))


def new_from_orig(t: str) -> str:
    for rx, rep in _FAV + _NEW: t = rx.sub(rep, t)
    return t


# ---------- CÁC BẢNG MÀU CŨ (để nhận ra và trả về gốc) ----------
def _sub(t, pairs):
    for p, r in pairs: t = re.sub(p, r, t)
    return t

_V_COMMON = [(r"#ff2e93", "#a78bfa"), (r"#2af5d6", "#5eead4"), (r"#b537f2", "#7c6cff"), (r"#db2777", "#7c6cff"),
             (r"rgba\(\s*255,\s*46,\s*147", "rgba(167, 139, 250"), (r"rgba\(\s*42,\s*245,\s*214", "rgba(94, 234, 212"),
             (r"rgba\(\s*181,\s*55,\s*242", "rgba(124, 108, 255"), (r"rgba\(\s*124,\s*22,\s*78", "rgba(60, 44, 130"),
             (r"rgba\(\s*255,\s*107,\s*152", "rgba(167, 139, 250")]
def legacy_violet1(t): return _sub(t, _V_COMMON + [(r"shadow-\[0_14px_36px_-12px_var\(--color-berry\)\]", "shadow-md shadow-black/30")])
def legacy_violet2(t): return _sub(t, _V_COMMON + [(r"shadow-\[0_(?:14|18)px_\d+px_-\d+px_var\(--color-berry\)\]", "shadow-md shadow-black/30")])

_S_HEX = {"#ff2e93": "#38bdf8", "#a78bfa": "#38bdf8", "#8b5cf6": "#38bdf8", "#2af5d6": "#5eead4", "#b537f2": "#3b82f6", "#db2777": "#3b82f6",
          "#7c6cff": "#3b82f6", "#7c5cff": "#3b82f6", "#7c3aed": "#2563eb", "#c4b5fd": "#bae6fd", "#0f0c1a": "#0b1220", "#1a1530": "#131c2e",
          "#100c20": "#0e1626", "#14102b": "#101a2c", "#efeaff": "#eaf1fb", "#a59dc9": "#9fb0c8", "#ff6b98": "#38bdf8", "#fb7185": "#ef4444"}
_S_RGB = [((255, 46, 147), "56, 189, 248"), ((167, 139, 250), "56, 189, 248"), ((255, 107, 152), "56, 189, 248"), ((181, 55, 242), "59, 130, 246"),
          ((124, 92, 255), "59, 130, 246"), ((124, 108, 255), "59, 130, 246"), ((42, 245, 214), "94, 234, 212"), ((124, 22, 78), "37, 99, 160"),
          ((60, 44, 130), "37, 99, 160"), ((139, 92, 246), "148, 163, 184"), ((15, 12, 26), "11, 18, 32"), ((30, 27, 46), "22, 31, 48")]
def legacy_sky(t):
    t = re.sub(r'(id: "fav", label: "Yêu thích của bạn", count: favCount, dot: ")#[0-9a-fA-F]{6}', r"\g<1>#ef4444", t)
    t = t.replace('on ? "text-berry"', 'on ? "text-red-500"')
    for k, v in _S_HEX.items(): t = re.sub(re.escape(k), v, t, flags=re.I)
    for c, v in _S_RGB: t = re.sub(r"rgba\(\s*%d,\s*%d,\s*%d" % c, "rgba(" + v, t)
    return re.sub(r"shadow-\[0_(?:14|18)px_\d+px_-\d+px_var\(--color-berry\)\]", "shadow-md shadow-black/30", t)

LEGACY = (legacy_violet1, legacy_violet2, legacy_sky)

# Dòng không nhận ra được (bạn đã sửa tay / patch khác thêm vào): chỉ quy đổi các màu cũ sang màu mới.
_FALL = [(r"#a78bfa|#38bdf8|#8b5cf6", ACCENT), (r"#7c6cff|#3b82f6", DEEP), (r"#ef4444", RED),
         (r"rgba\(\s*(?:167,\s*139,\s*250|56,\s*189,\s*248)", f"rgba({ACCENT_RGB}"), (r"rgba\(\s*(?:124,\s*108,\s*255|59,\s*130,\s*246)", f"rgba({DEEP_RGB}")]
_SEEN = 'alive(seen), "#38bdf8"'   # chip "Đã xem" vốn màu xanh trời: giữ nguyên
def fallback_line(line: str) -> str:
    if _SEEN in line:
        a, b = line.split(_SEEN, 1)
        return fallback_line(a) + _SEEN + fallback_line(b)
    return new_from_orig(_sub(line, _FALL))


def convert(current: str, bak: str | None) -> str:
    if bak is None: return new_from_orig(current)
    lookup: dict[str, set[str]] = {}
    for b in bak.splitlines(keepends=True):
        new = new_from_orig(b)
        for key in {b, new, *(f(b) for f in LEGACY)}: lookup.setdefault(key, set()).add(new)
    out = []
    for line in current.splitlines(keepends=True):
        hit = lookup.get(line)
        out.append(next(iter(hit)) if hit and len(hit) == 1 else fallback_line(line))
    return "".join(out)


def main():
    src = ROOT / "src"
    if not src.is_dir(): sys.exit("✗ Không thấy thư mục src (chạy trong thư mục gốc dự án)")
    n = 0
    for p in sorted(src.rglob("*")):
        if p.suffix not in {".ts", ".tsx", ".css"} or not p.is_file(): continue
        bak = p.with_name(p.name + ".theme.bak")
        with open(p, encoding="utf-8", newline="") as f: cur = f.read()
        orig = open(bak, encoding="utf-8", newline="").read() if bak.exists() else None
        new = convert(cur, orig)
        if new == cur: continue
        if orig is None: shutil.copy2(p, bak)
        with open(p, "w", encoding="utf-8", newline="") as f: f.write(new)
        print(f"✓ {p.relative_to(ROOT)}"); n += 1
    print(f"\nXong: đã cập nhật màu trong {n} file." if n else "\nKhông còn gì để đổi (đã áp dụng rồi).")


if __name__ == "__main__":
    main()
