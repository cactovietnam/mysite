# -*- coding: utf-8 -*-
"""MySite - Tool quản lý: game, link tải, ảnh (chính + bổ sung), chữ/link trên web, đẩy lên Vercel.
Chạy:  python quan_ly.py   (đặt file này trong thư mục mysite)
Ảnh: bỏ vào thư mục  anh-moi/  rồi chọn trong tool.
  - Ảnh CHÍNH   (1 ảnh): hiện ngoài trang chủ + làm nền trang game.
  - Ảnh BỔ SUNG (tối đa 10): ảnh trong game để người xem hiểu thêm.
Mọi ảnh thêm vào đều được đóng dấu logo (logo/logo-xanh.png, tự tách nền xanh lá). Chỉnh góc/cỡ ở các hằng WM_*.
"""
import base64, colorsys, datetime, hashlib, importlib, io, json, os, re, secrets, shutil, subprocess, sys, unicodedata
import urllib.error, urllib.parse, urllib.request
from pathlib import Path
from urllib.parse import quote, urlparse

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "src" / "data" / "games.json"
SITE = ROOT / "src" / "data" / "site.json"
TAGS = ROOT / "src" / "data" / "tags.json"      # danh mục tag theo nhóm (web dùng tô màu, tool dùng gợi ý)
PUBLIC = ROOT / "public"
COVERS = PUBLIC / "covers"
INBOX = ROOT / "anh-moi"
DONE = INBOX / "_da_xu_ly"
BACKUP = ROOT / "backup"
ANH_GOC = ROOT / "anh-goc"                    # ảnh gốc theo từng game (không đẩy lên git): đổi logo/cỡ sau này vẫn đóng dấu lại được
LOGO_SRC = ROOT / "logo" / "logo-xanh.png"   # logo nền xanh lá; tool tự tách nền khi dùng

NATIVE = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"}   # trình duyệt đọc được, không cần Pillow
EXT = NATIVE | {".jfif", ".jpe", ".tif", ".tiff", ".ico"}             # các đuôi này cần Pillow để chuyển
SKIP_NAMES = {"thumbs.db", "desktop.ini", ".ds_store"}
MAX_EXTRA = 10      # số ảnh bổ sung tối đa
COVER_W = 1920      # ảnh chính dùng làm nền nên cho rộng hơn
EXTRA_W = 1600
WEBP_Q = 80         # chất lượng WebP ảnh chính/phụ (85 -> 80 thường nhẹ hơn ~15-25%, mắt thường khó thấy); method=6 nén kỹ hơn, chậm hơn chút
WEBP_METHOD = 6
THUMB_W = 640       # ảnh nhỏ cho thẻ game / ô tìm kiếm / game tương tự (hiện ~380px nên 640 đủ nét cho màn 1.5x-2x)

# git: PUSH_ALL = True -> mục [9] đẩy MỌI thay đổi (code web + dữ liệu + ảnh), trừ file trong .gitignore.
#      PUSH_ALL = False -> chỉ đẩy PUSH_PATHS, code web đang sửa dở KHÔNG bị kéo theo vào commit.
PUSH_ALL = True
PUSH_PATHS = ("src/data", "public/covers", ".gitignore")

# --- đóng dấu logo lên mọi ảnh thêm vào (ảnh gốc trong anh-moi/ không bị sửa) ---
WM_ON = True          # False = tắt đóng dấu
WM_CORNER = "br"      # br = dưới phải | bl = dưới trái | tr = trên phải | tl = trên trái
WM_WIDTH = 0.13       # chiều rộng logo = 13% chiều rộng ảnh
WM_MIN_W = 96         # nhưng không nhỏ hơn 96 px
WM_MARGIN = 0.025     # cách mép = 2.5% chiều rộng ảnh
WM_OPACITY = 0.9

SITE_DEFAULT = {
    "name": "MySite",
    "url": "https://mysite.vercel.app",
    "description": "Danh sách game và hướng dẫn cài đặt.",
    "discord": "https://discord.gg/",
    "facebook": "https://www.facebook.com/profile.php?id=61591215583142",
    "footer": "© 2026 MySite",
    "nav": {"explore": "Khám phá", "discord": "Discord", "facebook": "Facebook"},
    "home": {"libraryTitle": "Kho game", "featuredBadge": "Mới cập nhật", "featuredButton": "Xem game", "sliderSeconds": 6,
             "announcement": "Chào mừng bạn đến MySite! Cùng khám phá game và những bản mới cập nhật.",
             "announcementLabel": "Thông báo"},
    "ageGate": {"enabled": True, "remember": "never"},
    "engines": {"Ren'Py": "#fb923c", "RPGM": "#2dd4bf", "Unity": "#60a5fa", "Unreal": "#9ca3af"},
    "tagPresets": ["2DCG", "3DCG", "Animation", "Anime", "Visual Novel", "RPG", "Simulation", "Management", "Adventure",
                   "Puzzle", "Sandbox", "Action", "Turn-Based", "Fantasy", "Horror", "Comedy", "School Life",
                   "Slice of Life", "Romance", "Harem", "Vanilla", "Netori", "Cheating", "Corruption", "Femdom",
                   "BDSM", "Futa", "Yuri", "Big Tits", "MILF", "Monster Girl", "Tentacles", "Mind Control",
                   "Blackmail", "Group Sex", "Male Protagonist", "Female Protagonist", "Multiple Endings",
                   "Adult", "Eroge", "Erotic", "NSFW", "No AI"],
}
# (đường dẫn trong site.json, nhãn hiển thị, kiểu)
SITE_FIELDS = [
    ("name", "Tên website", "req"),
    ("url", "Địa chỉ website (https://...)", "url_req"),
    ("description", "Mô tả website (SEO)", "text"),
    ("discord", "Link Discord, hiện trong nút Báo lỗi (trống = ẩn)", "url"),
    ("facebook", "Link Facebook, hiện trong nút Báo lỗi (trống = ẩn)", "url"),
    ("footer", "Dòng chân trang", "text"),
    ("nav.explore", "Menu: chữ 'Khám phá'", "text"),
    ("nav.discord", "Menu: chữ nút Discord", "text"),
    ("nav.facebook", "Menu: chữ nút Facebook", "text"),
    ("home.libraryTitle", "Tiêu đề kho game", "text"),
    ("home.featuredBadge", "Nhãn game mới cập nhật", "text"),
    ("home.featuredButton", "Chữ nút 'Xem game'", "text"),
    ("home.sliderSeconds", "Slider: số giây tự chuyển game (2-30)", "seconds"),
    ("home.announcement", "Thanh thông báo dưới slider ('-' = ẩn)", "text"),
    ("home.announcementLabel", "Nhãn thanh thông báo", "text"),
    ("ageGate.enabled", "Cổng xác nhận 18+", "bool"),
    ("ageGate.remember", "Cổng 18+: khi nào hỏi lại (bấm số để đổi)", "choice"),
]
REMEMBER_LABEL = {
    "never": "Hỏi lại mỗi lần tải lại trang",
    "session": "Nhớ trong phiên (đóng tab thì hỏi lại)",
    "forever": "Nhớ mãi trên trình duyệt",
}

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = ImageOps = None

if os.name == "nt":
    os.system("chcp 65001 >nul")
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass


# ---------- file JSON (ghi an toàn + backup) ----------
def read_json(path, default):
    if not path.exists(): return default
    try: return json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as e:
        sys.exit(f"{path.name} bị lỗi JSON (dòng {e.lineno}): {e.msg}\nCó thể khôi phục từ thư mục backup/.")

def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():  # backup trước khi ghi, giữ 20 bản gần nhất
        BACKUP.mkdir(exist_ok=True)
        shutil.copy2(path, BACKUP / f"{path.stem}-{datetime.datetime.now():%Y%m%d-%H%M%S}.json")
        for old in sorted(BACKUP.glob(f"{path.stem}-*.json"))[:-20]:
            old.unlink(missing_ok=True)
    tmp = path.with_name(path.name + ".tmp")  # ghi file tạm rồi thay: crash giữa chừng không hỏng file thật
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)

def merge(base, over):
    out = dict(base)
    for k, v in (over or {}).items():
        out[k] = merge(base[k], v) if isinstance(v, dict) and isinstance(base.get(k), dict) else v
    return out

def load_site(): return merge(SITE_DEFAULT, read_json(SITE, {}))

def normalize(g):
    """Ảnh chính nằm riêng ở g['cover']; g['images'] chỉ là ảnh bổ sung (không trùng ảnh chính, tối đa 10)."""
    g.setdefault("links", []); g.setdefault("tags", []); g.setdefault("images", [])
    # intro = sơ lược ngắn; content = list các khổ. Dữ liệu cũ có 'description' (1 chuỗi) tự đổi thành content khi nạp.
    legacy = g.pop("description", "")
    g["intro"] = str(g.get("intro") or "").strip()
    raw = g.get("content") or legacy or []
    if isinstance(raw, str): raw = raw.splitlines()
    g["content"] = [str(p).strip() for p in raw if str(p).strip()]
    try: fold = int(g.get("contentFold") or 0)   # hiện sẵn N khổ đầu, còn lại ẩn sau "Xem thêm" (0 = hiện hết)
    except (TypeError, ValueError): fold = 0
    g["contentFold"] = fold if 0 < fold < len(g["content"]) else 0
    cover = g.get("cover") or (g["images"][0] if g["images"] else "")
    g["cover"] = cover
    extras = []
    for u in g["images"]:
        if u and u != cover and u not in extras: extras.append(u)
    g["images"] = extras[:MAX_EXTRA]
    return g

def load(): return [normalize(g) for g in read_json(DATA, [])]
def save(games): write_json(DATA, games)

def slugify(text):
    t = unicodedata.normalize("NFD", text.replace("đ", "d").replace("Đ", "D"))
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-") or "game"

def unique_slug(base, games):
    used, slug, n = {g["slug"] for g in games}, base, 2
    while slug in used:
        slug, n = f"{base}-{n}", n + 1
    return slug


# ---------- nhập liệu ----------
def ask(prompt, default=None):
    s = input(f"{prompt}" + (f" [{default}]" if default not in (None, "") else "") + ": ").strip()
    return s if s else (default if default is not None else "")

def ask_required(prompt, default=None):
    while True:
        s = ask(prompt, default)
        if s: return s
        print("  ! Không được để trống.")

def ask_size(default):
    while True:
        s = str(ask("Dung lượng (GB)", default)).replace(",", ".")
        try: return round(float(s), 2)
        except ValueError: print("  ! Nhập số, vd 3.8")

def ask_date(default):
    while True:
        s = ask("Ngày cập nhật (YYYY-MM-DD)", default)
        try:
            datetime.date.fromisoformat(s); return s
        except ValueError: print("  ! Sai định dạng, vd 2026-10-13")

def auto_color(name):
    h = int(hashlib.md5(name.encode("utf-8")).hexdigest()[:4], 16) % 360
    r, g, b = colorsys.hls_to_rgb(h / 360, 0.68, 0.7)
    return "#{:02x}{:02x}{:02x}".format(int(r * 255), int(g * 255), int(b * 255))

def ask_engine(default):
    """Danh sách engine lấy từ site.json; gõ tên mới thì tự thêm vào (kèm màu) để web nhận ngay."""
    site = load_site(); engines = list(site["engines"])
    print("Engine: " + "  ".join(f"[{i}] {e}" for i, e in enumerate(engines, 1)) + "  (hoặc gõ tên mới)")
    s = ask("Chọn", default)
    if s.isdigit() and 1 <= int(s) <= len(engines): return engines[int(s) - 1]
    for e in engines:
        if e.lower() == s.lower(): return e
    if s:
        site["engines"][s] = auto_color(s); write_json(SITE, site)
        print(f"  (Engine mới '{s}', màu {site['engines'][s]}. Đổi màu: sửa src/data/site.json)")
    return s

# Nhãn nhanh: tag đặc biệt web hiện thành huy hiệu trên thẻ game (khớp không phân biệt hoa/thường/dấu)
QUICK_TAGS = [
    ("18+", {"18+"}),
    ("Việt hóa", {"viet hoa", "viethoa", "vh"}),
    ("Cheat", {"cheat"}),
]

def _fold(t):
    t = unicodedata.normalize("NFD", t.replace("đ", "d").replace("Đ", "D"))
    return "".join(c for c in t if unicodedata.category(c) != "Mn").lower().strip()

def _split_tags(text):
    return [x.strip() for x in text.split(",") if x.strip()]

def _dedupe(tags):
    out, seen = [], set()
    for t in tags:
        if t and _fold(t) not in seen: seen.add(_fold(t)); out.append(t)
    return out

def _toggle(tags, label, aliases=None):
    """Có rồi thì bỏ, chưa có thì thêm. Trả danh sách mới."""
    keys = aliases or {_fold(label)}
    if any(_fold(t) in keys for t in tags):
        return [t for t in tags if _fold(t) not in keys]
    return tags + [label]

def load_catalog():
    """Danh mục tag theo nhóm: [(nhãn nhóm, [tag...])]. Đọc src/data/tags.json; tag gợi ý cũ trong site.json mà chưa có thì gom vào nhóm riêng."""
    groups = []
    for g in (read_json(TAGS, {}) or {}).get("groups", []):
        items = [t for t in g.get("tags", []) if isinstance(t, str) and t.strip()]
        if items: groups.append((str(g.get("label") or g.get("id") or "Nhóm"), items))
    known = {_fold(t) for _, items in groups for t in items}
    extra = [t for t in load_site().get("tagPresets", []) if isinstance(t, str) and _fold(t) not in known]
    if extra: groups.append(("Khác (từ site.json)" if groups else "Tag gợi ý", extra))
    return groups

def _pick_in_group(tags, title, items):
    """Hiện các tag của 1 nhóm (3 cột), chọn số để bật/tắt. Lặp đến khi Enter."""
    while True:
        have = {_fold(t) for t in tags}
        print(f"\n  === {title} ({len(items)} tag) ===")
        cells = [f"[{i}]{'✓' if _fold(t) in have else ' '}{t}" for i, t in enumerate(items, 1)]
        w = min(max(len(c) for c in cells) + 2, 34)
        for r in range(0, len(cells), 3):
            print("   " + "".join(c.ljust(w) for c in cells[r:r + 3]).rstrip())
        picked = ask_nums("  Chọn số để bật/tắt (vd: 1 4 6-8 | all; Enter = quay lại): ", len(items))
        if not picked: return tags
        for i in picked: tags = _toggle(tags, items[i - 1])

def pick_from_catalog(tags):
    """Menu 2 cấp: chọn nhóm -> chọn tag. Gõ chữ (vd 'big') để tìm tag trong mọi nhóm."""
    catalog = load_catalog()
    if not catalog: print("  (Chưa có tag gợi ý. Thêm vào src/data/tags.json)"); return tags
    while True:
        have = {_fold(t) for t in tags}
        print("\n  Nhóm tag:")
        for i, (lb, items) in enumerate(catalog, 1):
            n = sum(_fold(t) in have for t in items)
            print(f"   [{i:>2}] {lb} ({len(items)} tag{f', đã chọn {n}' if n else ''})")
        s = input("  Chọn nhóm (số) | gõ chữ để tìm tag | Enter = xong\n  > ").strip()
        if not s: return tags
        if s.isdigit():
            if 1 <= int(s) <= len(catalog): tags = _pick_in_group(tags, *catalog[int(s) - 1])
            else: print(f"  ! Không có nhóm số {s}")
            continue
        needle = _fold(s); hits, seen = [], set()
        for _, items in catalog:
            for t in items:
                if needle in _fold(t) and _fold(t) not in seen: seen.add(_fold(t)); hits.append(t)
        if hits: tags = _pick_in_group(tags, f"Kết quả cho '{s}'", hits)
        else: print(f"  Không tìm thấy tag nào chứa '{s}'. Muốn tạo tag mới: quay lại và gõ +{s}")

def ask_tags(default):
    """Sửa tag theo vòng lặp (Enter = xong). Không cần gõ lại cả danh sách khi chỉ muốn thêm/bớt 1-2 tag."""
    tags = _dedupe(default)
    while True:
        have = {_fold(t) for t in tags}
        quick = "  ".join(f"[{i}] {'✓' if have & al else ' '} {lb}" for i, (lb, al) in enumerate(QUICK_TAGS, 1))
        print(f"\n  Tag hiện tại: {', '.join(tags) or '(chưa có)'}")
        print(f"  Nhãn nhanh (bấm số để bật/tắt): {quick}")
        s = input("  Enter = xong | +tag1, tag2 = thêm | -tag = bớt | p = chọn từ danh mục tag (theo nhóm, có tìm kiếm) | hoặc gõ cả danh sách mới\n  > ").strip()
        if not s: return tags
        if re.fullmatch(r"[\d\s,]+", s):                      # số: bật/tắt nhãn nhanh
            for n in re.findall(r"\d+", s):
                if 1 <= int(n) <= len(QUICK_TAGS):
                    lb, al = QUICK_TAGS[int(n) - 1]; tags = _toggle(tags, lb, al)
                else: print(f"  ! Không có nhãn nhanh số {n}")
        elif s.lower() == "p": tags = pick_from_catalog(tags)
        elif s[0] == "+": tags = _dedupe(tags + _split_tags(s[1:]))
        elif s[0] == "-":
            drop = {_fold(t) for t in _split_tags(s[1:])}
            tags = [t for t in tags if _fold(t) not in drop]
        else: tags = _dedupe(_split_tags(s))                    # gõ danh sách đầy đủ = thay toàn bộ

def parse_nums(text, n):
    """'1 2 3' / '1,3' / '3-5' / 'all' -> danh sách chỉ số 1..n, giữ thứ tự, bỏ trùng."""
    text = text.strip().lower()
    if text in ("all", "a"): return list(range(1, n + 1))
    out = []
    for part in re.split(r"[,\s]+", text):
        if not part: continue
        m = re.fullmatch(r"(\d+)-(\d+)", part)
        rng = range(int(m[1]), int(m[2]) + 1) if m else ([int(part)] if part.isdigit() else None)
        if rng is None: raise ValueError(f"Không hiểu '{part}'")
        for i in rng:
            if not 1 <= i <= n: raise ValueError(f"Số {i} ngoài khoảng 1-{n}")
            if i not in out: out.append(i)
    return out

def ask_nums(prompt, n):
    while True:
        s = input(prompt).strip()
        if not s: return []
        try: return parse_nums(s, n)
        except ValueError as e: print("  !", e)

# ---------- intro + nội dung game (nhiều khổ) ----------
INTRO_WARN = 300   # intro dài hơn mức này: chỉ cảnh báo (web tự cắt bớt ở slider)
PARA_HELP = """
  NỘI DUNG GAME: gõ từng khổ, mỗi lần Enter = chốt khổ đó và sang khổ kế tiếp.
  Enter KHÔNG kết thúc và KHÔNG lưu. Dán nhiều dòng cùng lúc cũng được (mỗi dòng = 1 khổ).
  Lệnh (gõ ở đầu dòng):  /luu = xem trước rồi lưu | /huy = bỏ thay đổi | /xem = xem các khổ
                         /sua N = sửa khổ N | /chen N = chèn khổ mới trước khổ N
                         /xoa [N] = xóa khổ N (bỏ trống = khổ cuối) | /xoahet = xóa tất cả
                         /cat N = chỉ hiện N khổ đầu, các khổ sau ẩn sau nút "Xem thêm" | /cat 0 = hiện hết
  (Khổ cần bắt đầu bằng dấu / thì gõ // ở đầu.)"""

def ask_intro(default=""):
    print("\n  INTRO = sơ lược ngắn (1-2 câu) hiện NGOÀI game: slider trang chủ + đầu trang game.")
    if default: s = input(f"  Intro hiện tại: {default}\n  Intro mới (Enter = giữ, '-' = xóa): ").strip()
    else: s = input("  Intro (Enter = để trống): ").strip()
    if not s: return default
    if s == "-": return ""
    if len(s) > INTRO_WARN: print(f"  ! Intro dài {len(s)} ký tự (nên dưới {INTRO_WARN}); web sẽ cắt bớt ở slider.")
    return s

def _show_paras(paras, fold=0):
    if not paras: print("    (chưa có khổ nào)"); return
    for i, p in enumerate(paras, 1):
        print(f"    Khổ {i} ({len(p)} ký tự): {p if len(p) <= 90 else p[:87] + '...'}")
        if 0 < fold == i < len(paras): print('    ------ từ đây trở xuống bị ẨN, hiện sau nút "Xem thêm" ------')

def _para_idx(arg, n):
    return int(arg) - 1 if arg.isdigit() and 1 <= int(arg) <= n else None

def ask_paragraphs(default, fold=0):
    """Nhập nội dung nhiều khổ -> (list[str], fold). Enter chỉ chốt 1 khổ và mở khổ mới; chỉ /luu (+ xác nhận) mới kết thúc."""
    original, paras, warned, orig_fold = list(default), list(default), False, fold
    print(PARA_HELP)
    if paras: print("\n  Nội dung hiện tại:"); _show_paras(paras, fold)
    while True:
        try: text = input(f"  Khổ {len(paras) + 1} > ").strip()
        except EOFError:
            print("\n  (Mất đầu vào, giữ nguyên nội dung cũ)"); return original, orig_fold
        if not text:   # Enter trống: bỏ qua, không kết thúc
            if not warned: print("    (Dòng trống bị bỏ qua. /luu để lưu, /huy để hủy.)"); warned = True
            continue
        if not text.startswith("/") or text.startswith("//"):
            paras.append(text[1:] if text.startswith("//") else text); continue
        cmd, _, arg = text[1:].partition(" "); cmd, arg = cmd.lower(), arg.strip()
        if cmd in ("luu", "xong"):
            if not 0 < fold < len(paras): fold = 0
            print("\n  --- XEM TRƯỚC ---"); _show_paras(paras, fold)
            if not fold and len(paras) >= 4: print("  (Mẹo: /cat N để chỉ hiện N khổ đầu, phần còn lại ẩn sau nút 'Xem thêm')")
            if input(f"  Xác nhận lưu {len(paras)} khổ? (Y/n): ").strip().lower() != "n": return paras, fold
        elif cmd == "huy":
            if paras == original or input("  Bỏ mọi thay đổi ở phần này? (y/N): ").strip().lower() == "y": return original, orig_fold
        elif cmd == "xem": _show_paras(paras, fold)
        elif cmd == "cat":
            n = int(arg) if arg.isdigit() else None
            if n is None or n >= len(paras): print(f"    ! Dùng: /cat N (N trong khoảng 1-{max(len(paras) - 1, 1)}; /cat 0 = hiện hết)"); continue
            fold = n; print(f"    ✓ Hiện {n} khổ đầu, {len(paras) - n} khổ sau ẩn sau 'Xem thêm'" if n else "    ✓ Hiện hết các khổ")
        elif cmd == "xoahet":
            if input("  Xóa TẤT CẢ các khổ? (y/N): ").strip().lower() == "y": paras, fold = [], 0
        elif cmd in ("sua", "chen", "xoa"):
            i = (len(paras) - 1 if not arg and cmd == "xoa" and paras else _para_idx(arg, len(paras) + (cmd == "chen")))
            if i is None: print(f"    ! Dùng: /{cmd} N (N trong khoảng 1-{len(paras) + (cmd == 'chen')})"); continue
            if cmd == "xoa":
                print(f"    ✓ Đã xóa khổ {i + 1}"); del paras[i]
                if i < fold: fold -= 1   # khổ bị xóa nằm trong phần hiện sẵn
            elif cmd == "sua":
                print(f"    Khổ {i + 1} hiện tại: {paras[i]}")
                new = input("    Nhập lại khổ này (Enter trống = giữ nguyên): ").strip()
                if new: paras[i] = new
            else:
                new = input(f"    Nội dung khổ mới (sẽ nằm trước khổ {i + 1}; Enter trống = hủy): ").strip()
                if new:
                    paras.insert(i, new)
                    if i < fold: fold += 1
        else: print("    ! Không hiểu lệnh. Lệnh: /luu /huy /xem /sua /chen /xoa /xoahet")

def show_games(games):
    if not games: print("  (chưa có game nào)")
    for i, g in enumerate(games, 1):
        print(f"  {i:>2}. {g['title']}  [{g['engine']}, v{g['version']}, bìa: {'có' if g['cover'] else 'chưa'}, "
              f"{len(g['images'])}/{MAX_EXTRA} ảnh phụ, {len(g['links'])} link]")

def pick_one(games, prompt="Chọn 1 game: "):
    if not games:
        print("  Chưa có game nào."); return None
    show_games(games)
    r = ask_nums(prompt, len(games))
    return games[r[0] - 1] if r else None

def norm_url(u):
    u = u.strip()
    return u if re.match(r"^https?://", u, re.I) else "https://" + u

def host_of(url):
    return (urlparse(url).hostname or url).removeprefix("www.")


# ---------- ảnh ----------
def ensure_pillow():
    global Image, ImageOps
    if Image is not None: return
    print("Chưa có Pillow: ảnh tải từ web (webp/avif/jfif/tiff...) có thể không xử lý được và ảnh không được nén.")
    if input("Cài Pillow ngay? (Y/n): ").strip().lower() == "n": return
    if subprocess.run([sys.executable, "-m", "pip", "install", "pillow"]).returncode == 0:
        importlib.invalidate_caches()
        try:
            from PIL import Image as _I, ImageOps as _O
            Image, ImageOps = _I, _O
            print("  ✓ Đã cài Pillow.")
        except ImportError:
            print("  ! Cài xong nhưng chưa nạp được, hãy chạy lại tool.")
    else:
        print("  ! Cài thất bại. Thử tay:  pip install pillow")

def is_image(p):
    if p.suffix.lower() in EXT: return True
    if Image is None: return False
    try:  # file không đuôi / đuôi lạ: kiểm tra theo nội dung
        with Image.open(p) as im: im.verify()
        return True
    except Exception: return False

def scan_inbox():
    INBOX.mkdir(exist_ok=True)
    ok, skipped = [], []
    for p in sorted(INBOX.iterdir(), key=lambda p: p.name.lower()):
        if not p.is_file() or p.name.startswith((".", "_")) or p.name.lower() in SKIP_NAMES: continue
        (ok if is_image(p) else skipped).append(p)
    return ok, skipped

_wm = {"img": None, "tried": False}

def _key_green(im):
    """Tách nền xanh lá: độ trong suốt theo mức xanh lá vượt trội (G - max(R,B)); khử viền xanh ở mép."""
    from PIL import ImageChops
    r, g, b = im.convert("RGB").split()
    spill = ImageChops.subtract(g, ImageChops.lighter(r, b))                 # >0 khi pixel nghiêng về xanh lá
    alpha = spill.point(lambda v: 255 - max(0, min(255, (v - 25) * 255 // 150)))
    out = Image.merge("RGB", (r, ImageChops.darker(g, ImageChops.lighter(r, b)), b)).convert("RGBA")
    out.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 16 else 0).getbbox()
    return out.crop(box) if box else out

def load_watermark():
    """Logo đã tách nền (RGBA, cắt sát), nạp một lần. Thiếu file / thiếu Pillow / file hỏng -> None (ảnh vẫn xử lý, không đóng dấu)."""
    if _wm["tried"]: return _wm["img"]
    _wm["tried"] = True
    if Image is None or not WM_ON: return None
    if not LOGO_SRC.is_file():
        print(f"  (Chưa có {LOGO_SRC.relative_to(ROOT)} nên ảnh không được đóng dấu logo)"); return None
    try:
        with Image.open(LOGO_SRC) as im:
            im.load()
            has_alpha = im.mode in ("RGBA", "LA") and im.getchannel("A").getextrema()[0] < 255
            _wm["img"] = im.convert("RGBA") if has_alpha else _key_green(im)  # logo đã trong suốt thì dùng luôn
    except Exception as e:
        print(f"  ! Không đọc được logo: {type(e).__name__}: {e}")
    return _wm["img"]

def stamp_logo(im):
    wm = load_watermark()
    if wm is None: return im
    w, h = im.size
    tw = min(max(WM_MIN_W, round(w * WM_WIDTH)), w // 2)       # không to quá nửa ảnh
    th = max(1, round(wm.height * tw / wm.width))
    if th > h // 2:
        th = max(1, h // 2); tw = max(1, round(wm.width * th / wm.height))
    mark = wm.resize((tw, th), Image.LANCZOS)
    if WM_OPACITY < 1:
        mark.putalpha(mark.getchannel("A").point(lambda v: int(v * WM_OPACITY)))
    m = round(w * WM_MARGIN)
    x = m if "l" in WM_CORNER else w - tw - m
    y = m if "t" in WM_CORNER else h - th - m
    base = im.convert("RGBA")
    base.alpha_composite(mark, (max(0, x), max(0, y)))
    return base

def encode(src, max_w):
    """Trả (bytes, đuôi). Có Pillow: xoay đúng EXIF, thu nhỏ, đổi sang WebP. Không có: giữ nguyên (chỉ định dạng web hỗ trợ)."""
    raw = src.read_bytes()
    if not raw: raise ValueError("file rỗng (0 byte), tải lại ảnh")
    ext = src.suffix.lower()
    if Image is None:
        if ext not in NATIVE: raise ValueError(f"đuôi '{ext or '(không có)'}' cần Pillow:  pip install pillow")
        return raw, ext.lstrip(".").replace("jpeg", "jpg")
    with Image.open(io.BytesIO(raw)) as im:
        if im.format == "GIF" and getattr(im, "is_animated", False):
            return raw, "gif"  # giữ GIF động
        im = ImageOps.exif_transpose(im)  # ảnh chụp điện thoại không bị xoay
        alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
        im = im.convert("RGBA" if alpha else "RGB")
        if im.width > max_w:
            im = im.resize((max_w, max(1, round(im.height * max_w / im.width))), Image.LANCZOS)
        im = stamp_logo(im)
        if not alpha and im.mode != "RGB": im = im.convert("RGB")
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=WEBP_Q, method=WEBP_METHOD)
        return buf.getvalue(), "webp"

def store(game, src, max_w):
    """Xử lý 1 ảnh và ghi vào public/covers/<slug>/. Trả về URL. Ném lỗi nếu hỏng."""
    data, ext = encode(src, max_w)
    folder = COVERS / game["slug"]; folder.mkdir(parents=True, exist_ok=True)
    name = hashlib.md5(data).hexdigest()[:10] + "." + ext  # tên theo nội dung: không trùng, không dính cache cũ
    path = folder / name
    path.write_bytes(data)
    if not path.is_file() or path.stat().st_size == 0: raise OSError("ghi file thất bại")
    keep_original(src, game["slug"], path.stem)
    return f"/covers/{game['slug']}/{name}"

_kept = {}  # file trong anh-moi/ -> bản đã lưu ở anh-goc/ (để archive_files biết bản gốc đã an toàn)

def keep_original(src, slug, stem):
    """Chép ảnh gốc vào anh-goc/<slug>/<tên file web>.<đuôi gốc>. Tên khớp tên file web nên tra ngược được. Lỗi thì chỉ cảnh báo."""
    try:
        dest = ANH_GOC / slug / (stem + (src.suffix.lower() or ".bin"))
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        if dest.stat().st_size == src.stat().st_size: _kept[src] = dest
    except OSError as e:
        print(f"  ! Không lưu được ảnh gốc {src.name}: {e}")

def remove_file(url):
    p = (PUBLIC / url.lstrip("/")).resolve()
    if COVERS.resolve() in p.parents: p.unlink(missing_ok=True)  # chỉ xóa trong public/covers

def archive_files(files):
    """Ảnh đã có bản ở anh-goc/ thì dọn khỏi anh-moi/. Chưa có thì chuyển sang _da_xu_ly/ (trùng tên thì đánh số, không xóa đè)."""
    DONE.mkdir(exist_ok=True)
    for f in files:
        kept = _kept.pop(f, None)
        if kept is not None and kept.is_file(): f.unlink(missing_ok=True); continue
        dest, n = DONE / f.name, 2
        while dest.exists():
            dest = DONE / f"{f.stem}-{n}{f.suffix}"; n += 1
        shutil.move(str(f), dest)

# ---------- màu nhấn + ảnh mờ (placeholder) từ ảnh chính ----------
BLUR_W = 32  # ảnh mờ rộng 32px (~400 byte), web phóng lớn lên làm nền và làm placeholder khi ảnh thật chưa tải xong

def _hex(h, l, s):
    r, g, b = colorsys.hls_to_rgb(h % 1.0, l, s)
    return "#{:02x}{:02x}{:02x}".format(round(r * 255), round(g * 255), round(b * 255))

def extract_accents(path):
    """Trả (accent, accent2) dạng '#rrggbb' từ ảnh, hoặc None nếu ảnh gần như đen trắng/xám.
    Chọn màu rực và chiếm nhiều diện tích; ép độ sáng vào khoảng đọc được trên nền tối (chữ/nút vẫn đạt AA)."""
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((96, 96))
        mc = getattr(Image, "Quantize", Image).MEDIANCUT
        q = im.quantize(colors=12, method=mc)
        pal = q.getpalette() or []
        cands = []
        for count, idx in q.getcolors() or []:
            r, g, b = pal[idx * 3: idx * 3 + 3]
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if l < 0.10 or l > 0.93: continue
            cands.append((count * (s ** 1.5 + 0.05) * (1 - abs(l - 0.5)), h, s))
    if not cands: return None
    cands.sort(reverse=True)
    _, h1, s1 = cands[0]
    if s1 < 0.2: return None
    accent = _hex(h1, 0.64, max(s1, 0.6))
    # accent2: màu rực nhất có sắc độ lệch >= ~30 độ so với accent; không có thì xoay sắc độ
    h2, s2 = next(((h, s) for _, h, s in cands[1:] if min(abs(h - h1), 1 - abs(h - h1)) >= 0.08 and s >= 0.2), (h1 + 0.10, s1))
    return accent, _hex(h2, 0.58, max(s2, 0.5))

def make_blur(path, w=BLUR_W):
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((w, w))
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=40, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

def compute_visuals(g):
    """Ghi accent, accent2, blur vào game từ ảnh chính. Thiếu Pillow/ảnh hỏng: bỏ các field này, web dùng màu mặc định."""
    before = tuple(g.get(k) for k in ("accent", "accent2", "blur"))
    for k in ("accent", "accent2", "blur"): g.pop(k, None)
    p = PUBLIC / g["cover"].lstrip("/") if g.get("cover") else None
    if Image is not None and p is not None and p.is_file():
        try:
            colors = extract_accents(p)
            if colors: g["accent"], g["accent2"] = colors
            g["blur"] = make_blur(p)
        except Exception as e:
            print(f"  ! Không tính được màu nhấn/ảnh mờ cho '{g['title']}': {type(e).__name__}: {e}")
    return before != tuple(g.get(k) for k in ("accent", "accent2", "blur"))

def make_thumb(g):
    """Sinh ảnh nhỏ THUMB_W px từ ảnh chính (đã đóng dấu, nên không đóng dấu lại). Ghi g['thumb'].
    Ảnh chính không rộng hơn THUMB_W / GIF / thiếu Pillow: không có thumb, web dùng thẳng ảnh chính. Trả True nếu field đổi."""
    old = g.get("thumb", ""); g.pop("thumb", None)
    cover = g.get("cover") or ""
    src = PUBLIC / cover.lstrip("/") if cover else None
    if Image is not None and src is not None and src.is_file() and src.suffix.lower() != ".gif":
        try:
            with Image.open(src) as im:
                if im.width > THUMB_W:
                    im.load()
                    im = ImageOps.exif_transpose(im)
                    im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
                    im = im.resize((THUMB_W, max(1, round(im.height * THUMB_W / im.width))), Image.LANCZOS)
                    dest = src.with_name(src.stem + "_t.webp")
                    buf = io.BytesIO(); im.save(buf, "WEBP", quality=80, method=4)
                    dest.write_bytes(buf.getvalue())
                    g["thumb"] = f"/covers/{g['slug']}/{dest.name}"
        except Exception as e:
            print(f"  ! Không tạo được ảnh nhỏ cho '{g['title']}': {type(e).__name__}: {e}")
    new = g.get("thumb", "")
    if old and old != new: remove_file(old)
    return old != new

def backfill_visuals():
    """Game cũ (đã có ảnh chính nhưng chưa có ảnh mờ): tính bù một lần khi mở tool."""
    if Image is None: return
    games = load(); n = 0
    for g in games:
        if g["cover"] and "blur" not in g and compute_visuals(g): n += 1
    t = sum(1 for g in games if g["cover"] and "thumb" not in g and make_thumb(g))
    if n or t:
        save(games); print(f"  (Đã tính màu nhấn/ảnh mờ cho {n} game, tạo ảnh nhỏ cho {t} game. Nhớ đẩy lên Vercel [9])")

def image_wizard(game):
    """Bước 1: ảnh CHÍNH (bìa + nền). Bước 2: ảnh BỔ SUNG (tối đa 10). Trả True nếu có thay đổi."""
    load_watermark()  # in cảnh báo sớm nếu thiếu logo
    files, skipped = scan_inbox()
    if skipped:
        print("\n  Bỏ qua (không phải ảnh / chưa tải xong): " + ", ".join(p.name for p in skipped))
    if not files:
        print(f"\n  Chưa có ảnh dùng được trong: {INBOX}\n  Bỏ ảnh vào đó rồi chọn [4] để thêm.")
        return False
    print("\nẢnh trong anh-moi/:")
    for i, f in enumerate(files, 1): print(f"  {i:>2}. {f.name}  ({f.stat().st_size / 1024:.0f} KB)")

    used, changed = [], False

    # --- bước 1: ảnh chính ---
    print(f"\n[1/2] ẢNH CHÍNH: hiện ngoài trang chủ và làm nền trang game ({'đã có, chọn để thay' if game['cover'] else 'chưa có'}).")
    ni = ask_nums("  Chọn 1 ảnh (Enter = bỏ qua): ", len(files))
    cover_file = files[ni[0] - 1] if ni else None
    if cover_file:
        try:
            url = store(game, cover_file, COVER_W)
            old = game["cover"]
            game["cover"] = url
            compute_visuals(game); make_thumb(game)
            game["images"] = [u for u in game["images"] if u != url]
            if old and old != url and old not in game["images"]: remove_file(old)
            used.append(cover_file); changed = True
            print(f"  ✓ Ảnh chính: {url}")
        except Exception as e:
            print(f"  ✗ {cover_file.name}: {e}")
            cover_file = None

    # --- bước 2: ảnh bổ sung ---
    print(f"\n[2/2] ẢNH BỔ SUNG: giúp hiểu thêm về game. Tối đa {MAX_EXTRA}, hiện có {len(game['images'])}.")
    replace = False
    if game["images"]:
        replace = input("  [1] Thêm vào (mặc định)  [2] Thay toàn bộ ảnh bổ sung cũ: ").strip() == "2"
    room = MAX_EXTRA if replace else MAX_EXTRA - len(game["images"])
    if room <= 0:
        print("  Đã đủ 10 ảnh bổ sung. Chọn chế độ [2] để thay, hoặc xóa bớt ở mục [5].")
    else:
        ni = [i for i in ask_nums("  Chọn ảnh (vd: 1 2 | 3-5 | all; Enter = bỏ qua): ", len(files)) if files[i - 1] != cover_file]
        if len(ni) > room:
            print(f"  ! Chỉ còn {room} chỗ, lấy {room} ảnh đầu."); ni = ni[:room]
        urls = []
        for i in ni:
            try:
                urls.append(store(game, files[i - 1], EXTRA_W)); used.append(files[i - 1])
            except Exception as e:
                print(f"  ✗ {files[i - 1].name}: {e}")
        if urls:
            if replace:
                for u in game["images"]:
                    if u not in urls: remove_file(u)
                game["images"] = []
            for u in urls:
                if u != game["cover"] and u not in game["images"]: game["images"].append(u)
            changed = True
            print(f"  ✓ Đã thêm {len(urls)} ảnh bổ sung ({len(game['images'])}/{MAX_EXTRA}).")

    if used: archive_files(used)  # ảnh lỗi ở lại anh-moi/ để bạn xử lý
    if changed: print("\n  Nhớ chọn [9] Đẩy lên Vercel để ảnh hiện trên web.")
    return changed

def do_images():
    games = load(); g = pick_one(games)
    if not g: return False
    changed = image_wizard(g)
    if changed: save(games)
    return changed

def do_manage_images():
    games = load(); g = pick_one(games)
    if not g: return False
    if not g["cover"] and not g["images"]:
        print("  Game này chưa có ảnh."); return False
    print(f"\n  Ảnh chính: {g['cover'] or '(chưa có)'}")
    for i, u in enumerate(g["images"], 1): print(f"  {i:>2}. {u}")
    act = input("[1] Đặt 1 ảnh bổ sung làm ảnh chính  [2] Xóa ảnh bổ sung: ").strip()
    if act not in ("1", "2") or not g["images"]: return False
    ni = ask_nums("Số ảnh: ", len(g["images"]))
    if not ni: return False
    if act == "1":
        new = g["images"].pop(ni[0] - 1)
        if g["cover"]: g["images"].insert(0, g["cover"])  # ảnh chính cũ xuống làm ảnh bổ sung
        g["cover"] = new
        compute_visuals(g); make_thumb(g)
    else:
        for i in sorted(ni, reverse=True): remove_file(g["images"].pop(i - 1))
    save(games); print("  ✓ Đã cập nhật.")
    return True


# ---------- game ----------
def do_add_game():
    games = load()
    print("\n--- THÊM GAME MỚI (Enter để lấy giá trị mặc định) ---")
    title = ask_required("Tên game")
    g = {
        "slug": unique_slug(slugify(title), games),
        "title": title,
        "engine": ask_engine("Unity"),
        "version": ask("Phiên bản", "1.0.0"),
        "sizeGB": ask_size("0"),
        "cover": "",
        "images": [],
        "tags": ask_tags([]),
        "intro": ask_intro(""),
        "content": (_c := ask_paragraphs([], 0))[0],
        "contentFold": _c[1],
        "updatedAt": ask_date(datetime.date.today().isoformat()),
        "links": [],
    }
    edit_links(g, first_time=True)
    games.append(g); save(games)  # lưu trước khi xử lý ảnh: lỗi ảnh cũng không mất dữ liệu game
    print(f"  ✓ Đã thêm '{title}' (địa chỉ: /game/{g['slug']})")
    print("\n--- ẢNH CHO GAME NÀY ---")
    if image_wizard(g): save(games)
    return True

def do_edit_game():
    games = load(); g = pick_one(games)
    if not g: return False
    print(f"\n--- SỬA '{g['title']}' (Enter = giữ nguyên) ---")
    old_version = g["version"]
    g["title"] = ask_required("Tên game", g["title"])
    g["engine"] = ask_engine(g["engine"])
    g["version"] = ask("Phiên bản", g["version"])
    g["sizeGB"] = ask_size(g["sizeGB"])
    g["tags"] = ask_tags(g["tags"])
    g["intro"] = ask_intro(g["intro"])
    if not g["content"] or input(f"Sửa 'Nội dung game' / vị trí nút Xem thêm (hiện {len(g['content'])} khổ)? (y/N): ").strip().lower() == "y":
        g["content"], g["contentFold"] = ask_paragraphs(g["content"], g["contentFold"])
    g["updatedAt"] = ask_date(g["updatedAt"])
    if g["version"] != old_version and input("Phiên bản đổi. Đặt ngày cập nhật = hôm nay? (Y/n): ").strip().lower() != "n":
        g["updatedAt"] = datetime.date.today().isoformat()
    save(games); print("  ✓ Đã lưu.")
    return True

def drop_favorites(slugs):
    """Game bị xóa thì xóa luôn yêu thích của nó trên Supabase. Chưa có .env.local thì bỏ qua (web tự bỏ qua slug không còn game)."""
    if not slugs or not ENV_FILE.exists(): return
    try:
        sb_call("DELETE", "/rest/v1/favorites?slug=in.(" + ",".join(quote(x, safe="-") for x in slugs) + ")", prefer="return=minimal")
        print("  ✓ Đã dọn yêu thích của các game này trên Supabase.")
    except Exception as e:
        print(f"  ! Chưa dọn được yêu thích trên Supabase ({e}). Không ảnh hưởng web, chỉ còn dòng thừa trong bảng favorites.")

def do_delete_games():
    games = load()
    print("\nGame:"); show_games(games)
    gi = ask_nums("Chọn game cần XÓA (vd: 2 | 3-5; Enter = hủy): ", len(games))
    if not gi: return False
    names = ", ".join(games[i - 1]["title"] for i in gi)
    if input(f"Xóa vĩnh viễn: {names}? Gõ 'xoa' để xác nhận: ").strip().lower() != "xoa":
        print("  Đã hủy."); return False
    gone = [games[i - 1]["slug"] for i in gi]
    for i in sorted(gi, reverse=True):
        shutil.rmtree(COVERS / games[i - 1]["slug"], ignore_errors=True)
        games.pop(i - 1)
    save(games); print("  ✓ Đã xóa.")
    drop_favorites(gone)
    return True


# ---------- link tải ----------
def edit_links(g, first_time=False):
    """Menu thêm/sửa/xóa link tải của 1 game (sửa trực tiếp vào g)."""
    if first_time:
        print("Link tải (dán từng link, Enter trống để xong):")
        while True:
            u = input("  Link: ").strip()
            if not u: break
            g["links"].append({"label": ask("  Tên hiển thị (Enter = tự nhận theo trang)", ""), "url": norm_url(u)})
        return
    while True:
        print(f"\nLink tải của '{g['title']}':")
        if not g["links"]: print("  (chưa có link)")
        for i, l in enumerate(g["links"], 1):
            print(f"  {i:>2}. {l['label'] or host_of(l['url'])}  ->  {l['url']}")
        c = input("[1] Thêm  [2] Sửa  [3] Xóa  [Enter] Xong: ").strip()
        if c == "1":
            u = input("  Link: ").strip()
            if u: g["links"].append({"label": ask("  Tên hiển thị (Enter = tự nhận)", ""), "url": norm_url(u)})
        elif c in ("2", "3") and g["links"]:
            ni = ask_nums("  Số link: ", len(g["links"]))
            if not ni: continue
            if c == "3":
                for i in sorted(ni, reverse=True): g["links"].pop(i - 1)
            else:
                l = g["links"][ni[0] - 1]
                l["url"] = norm_url(ask("  Link", l["url"]))
                l["label"] = ask("  Tên hiển thị", l["label"])
        else:
            return

def do_links():
    games = load(); g = pick_one(games)
    if not g: return False
    edit_links(g)
    save(games); print("  ✓ Đã lưu link.")
    return True


# ---------- chữ & link trên web ----------
def deep_get(d, path):
    for k in path.split("."): d = d[k]
    return d

def deep_set(d, path, value):
    *keys, last = path.split(".")
    for k in keys: d = d[k]
    d[last] = value

def do_site():
    site = load_site(); changed = False
    while True:
        print("\n--- CHỮ & LINK TRÊN WEB (Enter = xong) ---")
        for i, (p, label, kind) in enumerate(SITE_FIELDS, 1):
            v = deep_get(site, p)
            shown = ("Bật" if v else "Tắt") if kind == "bool" else REMEMBER_LABEL.get(v, v) if kind == "choice" else (v or "(trống)")
            print(f"  {i:>2}. {label}: {shown}")
        ni = ask_nums("Số mục cần sửa: ", len(SITE_FIELDS))
        if not ni: return changed
        p, label, kind = SITE_FIELDS[ni[0] - 1]
        if kind == "bool":
            deep_set(site, p, not deep_get(site, p))
        elif kind == "choice":
            keys = list(REMEMBER_LABEL); cur = deep_get(site, p)
            deep_set(site, p, keys[(keys.index(cur) + 1) % len(keys)] if cur in keys else keys[0])
        elif kind == "seconds":
            v = input(f"  {label} [{deep_get(site, p)}]\n  Số giây mới (Enter = giữ): ").strip().replace(",", ".")
            if not v: continue
            try: sec = float(v)
            except ValueError: print("  ! Nhập số, vd 6 hoặc 4.5"); continue
            if not 2 <= sec <= 30: print("  ! Chỉ nhận 2-30 giây."); continue
            deep_set(site, p, int(sec) if sec == int(sec) else sec)
        else:
            v = input(f"  {label} [{deep_get(site, p)}]\n  Giá trị mới (Enter = giữ, '-' = để trống): ").strip()
            if not v: continue
            if v == "-":
                if kind in ("req", "url_req"): print("  ! Mục này không được để trống."); continue
                v = ""
            if kind.startswith("url") and v: v = norm_url(v)
            deep_set(site, p, v)
        write_json(SITE, site); changed = True
        print("  ✓ Đã lưu. Nhớ đẩy lên Vercel để web đổi theo.")


# ---------- git ----------
def run(*cmd, stdin=None):
    return subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True, encoding="utf-8", errors="replace", input=stdin)

def has_git(): return (ROOT / ".git").exists()

def ensure_gitignore():
    """anh-moi/ (ảnh gốc nặng) và backup/ không được đưa lên GitHub."""
    gi = ROOT / ".gitignore"
    text = gi.read_text(encoding="utf-8") if gi.exists() else ""
    have = {l.strip() for l in text.splitlines()}
    add = [x for x in ("anh-moi/", "anh-goc/", "backup/", "__pycache__/", ".env.local") if x not in have]
    if add:
        gi.write_text(text.rstrip("\n") + ("\n" if text else "") + "\n# quan_ly.py\n" + "\n".join(add) + "\n", encoding="utf-8")
        print(f"  (Đã thêm vào .gitignore: {', '.join(add)})")
    if has_git() and run("git", "ls-files", "--", "anh-moi", "anh-goc", "backup").stdout.strip():
        run("git", "rm", "-r", "--cached", "-q", "--", "anh-moi", "anh-goc", "backup")
        print("  (Đã gỡ anh-moi/ và backup/ khỏi git; chúng vẫn nằm trên máy bạn)")

def _in_push_paths(porcelain_line):
    path = porcelain_line[3:].split(" -> ")[-1].strip().strip('"').replace("\\", "/")
    return any(path == p or path.startswith(p.rstrip("/") + "/") for p in PUSH_PATHS)

def do_push():
    if not has_git():
        print("\n  Thư mục này chưa phải git repo."); return False
    allst = run("git", "status", "--porcelain", "-uall").stdout.splitlines()
    status = allst if PUSH_ALL else [l for l in allst if _in_push_paths(l)]
    other = [] if PUSH_ALL else [l for l in allst if not _in_push_paths(l)]
    if other:
        print(f"\n  (Có {len(other)} file khác đang thay đổi, ví dụ code web: sẽ KHÔNG được đẩy cùng.)")
        for l in other[:5]: print("   ", l)
        if len(other) > 5: print(f"    ... và {len(other) - 5} mục nữa")
    if not status:
        print("\n  Không có thay đổi dữ liệu/ảnh nào để đẩy."); return False
    imgs = sum(1 for l in status if "public/covers" in l)
    print(f"\n  Sẽ đẩy {len(status)} thay đổi ({imgs} thuộc ảnh):")
    for l in status[:15]: print("   ", l)
    if len(status) > 15: print(f"    ... và {len(status) - 15} mục nữa")
    msg = ask("Ghi chú commit", "cap nhat game")
    for p in (["."] if PUSH_ALL else PUSH_PATHS):  # từng đường dẫn riêng: đường dẫn chưa tồn tại không làm hỏng cả lệnh
        r = run("git", "add", "-A", "--", p)
        if r.returncode != 0 and "did not match" not in (r.stderr or ""):
            print(f"\n  ✗ Lỗi ở 'git add {p}':\n{r.stderr or r.stdout}"); return False
    r = run("git", "commit", "-m", msg)
    if r.returncode != 0:
        print(f"\n  ✗ Lỗi ở 'git commit':\n{r.stderr or r.stdout}"); return False
    if run("git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}").returncode == 0:
        r = run("git", "pull", "--rebase", "--autostash")  # autostash: file code đang sửa dở không cản việc đồng bộ
        if r.returncode != 0:
            run("git", "rebase", "--abort")
            print(f"\n  ✗ Xung đột khi đồng bộ với GitHub, đã hoàn tác. Commit local vẫn còn.\n{r.stderr or r.stdout}")
            print("  Hãy chạy tay: git pull --rebase, giải quyết xung đột rồi đẩy lại."); return False
    r = run("git", "push")
    if r.returncode != 0 and "upstream" in (r.stderr or "").lower():
        r = run("git", "push", "-u", "origin", "HEAD")
    if r.returncode != 0:
        print(f"\n  ✗ Lỗi ở 'git push':\n{r.stderr or r.stdout}"); return False
    print("\n  ✓ Đã đẩy lên GitHub. Vercel build ~1 phút rồi tự cập nhật site.")
    return True


# ---------- kiểm tra lỗi ----------
def do_check():
    games = load(); problems = 0; referenced = set(); urls = []
    for g in games:
        if not g["cover"]: print(f"  ! {g['title']}: chưa có ảnh chính"); problems += 1
        if not g["intro"]: print(f"  ! {g['title']}: chưa có intro (web tạm lấy khổ đầu của nội dung)"); problems += 1
        for u in ([g["cover"]] if g["cover"] else []) + ([g["thumb"]] if g.get("thumb") else []) + g["images"]:
            referenced.add(u); urls.append(u)
            p = PUBLIC / u.lstrip("/")
            if not p.is_file() or p.stat().st_size == 0:
                print(f"  ✗ {g['title']}: thiếu file ảnh {u}"); problems += 1
            elif Image is not None and p.suffix.lower() != ".gif":
                try:
                    with Image.open(p) as im: im.load()  # giải mã thật: bắt ảnh hỏng/cụt mà trình duyệt không hiện được
                except Exception as e:
                    print(f"  ✗ {g['title']}: ảnh HỎNG, trình duyệt sẽ không hiện: {u} ({type(e).__name__})"); problems += 1
        for l in g["links"]:
            if not re.match(r"^https?://", l["url"], re.I): print(f"  ✗ {g['title']}: link sai '{l['url']}'"); problems += 1
        if not g["links"]: print(f"  ! {g['title']}: chưa có link tải"); problems += 1
    orphans = [p for p in COVERS.rglob("*") if p.is_file() and "/" + p.relative_to(PUBLIC).as_posix() not in referenced] if COVERS.exists() else []
    if orphans:
        print(f"  ! {len(orphans)} file ảnh không còn dùng trong games.json")
        if input("    Xóa các file thừa? (y/N): ").strip().lower() == "y":
            for p in orphans: p.unlink(missing_ok=True)
            print("    ✓ Đã xóa.")
    if has_git() and urls:
        paths = "\n".join("public" + u for u in urls) + "\n"
        ignored = run("git", "check-ignore", "--stdin", stdin=paths).stdout.split()
        for p in ignored: print(f"  ✗ Git đang BỎ QUA file này (sẽ không lên web): {p}"); problems += 1
        pending = run("git", "status", "--porcelain", "--", "public/covers", "src/data").stdout.strip().splitlines()
        if pending: print(f"  ! Còn {len(pending)} thay đổi chưa đẩy lên GitHub (chọn [9])")
    print("  ✓ Không thấy lỗi." if problems == 0 else f"  Tổng {problems} vấn đề.")
    return False


# ---------- CMD 7: cài đặt lưu trên Supabase (báo lỗi Discord, khóa đăng nhập, tài khoản) ----------
# Cần NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY trong file .env.local (nằm NGOÀI git).
# Khóa service_role có toàn quyền với database: tool từ chối chạy nếu git không bỏ qua file đó.
ENV_FILE = ROOT / ".env.local"
NIL_UUID = "00000000-0000-0000-0000-000000000000"   # admin_id ghi vào nhật ký khi thao tác từ tool này
PASSWORD_MIN, PASSWORD_MAX = 8, 12                   # phải khớp src/lib/auth-validate.ts
PW_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # bỏ ký tự dễ nhầm 0/O, 1/l/I
ALERTS_DEFAULT = {"discord": True, "dedupeSeconds": 300, "webhookUrl": ""}
AUTH_DEFAULT = {"maxAttempts": 5, "lockMinutes": 30}
WEBHOOK_RE = re.compile(r"^https://(?:(?:ptb|canary)\.)?discord(?:app)?\.com/api/webhooks/\d+/[\w-]+$")   # khớp src/lib/notify.ts
NAME_RE = re.compile(r"^[A-Za-z0-9_]{0,12}$")
UA = "quan_ly.py/1.0 (DiscordBot; +https://discord.com)"   # Discord/Cloudflare chặn User-Agent mặc định của Python

_sb = None

def _read_env():
    out = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip().strip('"').strip("'")
    return out

def sb_config():
    """(url, khóa) hoặc None. Không bao giờ in khóa ra màn hình."""
    global _sb
    if _sb: return _sb
    env = _read_env()
    url = (env.get("NEXT_PUBLIC_SUPABASE_URL") or env.get("SUPABASE_URL") or "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not (url and key):
        print("\n  ! Chưa có khóa Supabase. Tạo file .env.local cạnh quan_ly.py (file này KHÔNG được lên GitHub) với 2 dòng:")
        print("      NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co")
        print("      SUPABASE_SERVICE_ROLE_KEY=khóa service_role / secret (Supabase -> Project Settings -> API Keys)")
        return None
    if has_git():
        if run("git", "ls-files", "--", ".env.local").stdout.strip():
            print("\n  ✗ .env.local đang được git theo dõi: khóa có thể ĐÃ LÊN GITHUB.")
            print("    Chạy: git rm --cached .env.local   rồi vào Supabase TẠO LẠI khóa (đổi khóa cũ), sau đó thử lại.")
            return None
        if run("git", "check-ignore", "-q", ".env.local").returncode != 0:
            print("\n  ✗ Git không bỏ qua .env.local, tool từ chối chạy để khóa không bị đẩy lên GitHub.")
            print("    Thêm dòng  .env.local  vào file .gitignore (khởi động lại tool cũng tự thêm), rồi thử lại.")
            return None
    _sb = (url, key)
    return _sb

def sb_call(method, path, body=None, prefer=None):
    cfg = sb_config()
    if not cfg: raise RuntimeError("Chưa cấu hình khóa Supabase (.env.local).")
    url, key = cfg
    headers = {"apikey": key, "Content-Type": "application/json", "User-Agent": UA}
    if key.startswith("eyJ"): headers["Authorization"] = f"Bearer {key}"   # khóa kiểu cũ là JWT; khóa "sb_secret_..." chỉ đi qua apikey
    if prefer: headers["Prefer"] = prefer
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Supabase trả lỗi {e.code}: {e.read().decode('utf-8', 'replace')[:300]}") from None
    except urllib.error.URLError as e:
        raise RuntimeError(f"Không kết nối được Supabase: {e.reason}") from None

def _ts(s):
    """Chuỗi thời gian của Supabase -> datetime (chịu được số chữ số thập phân bất kỳ)."""
    return datetime.datetime.fromisoformat(re.sub(r"\.(\d+)", lambda m: "." + m[1][:6].ljust(6, "0"), s.replace("Z", "+00:00")))

def _now(): return datetime.datetime.now(datetime.timezone.utc)

def get_setting(key, default):
    rows = sb_call("GET", f"/rest/v1/app_settings?key=eq.{key}&select=value")
    return merge(default, rows[0]["value"]) if rows and isinstance(rows[0].get("value"), dict) else dict(default)

def put_setting(key, value):
    sb_call("POST", "/rest/v1/app_settings?on_conflict=key", {"key": key, "value": value, "updated_at": _now().isoformat()},
            prefer="resolution=merge-duplicates,return=minimal")

def _int_in(label, lo, hi, cur):
    v = input(f"  {label} [{cur}]\n  Giá trị mới ({lo}-{hi}; Enter = giữ): ").strip()
    if not v: return None
    if not v.isdigit() or not lo <= int(v) <= hi:
        print(f"  ! Chỉ nhận số nguyên {lo}-{hi}."); return None
    return int(v)

# --- [2] báo lỗi về Discord ---
def _mask(url): return re.sub(r"(/webhooks/\d+/).+", r"\1********", url)

def test_via_site():
    base = (load_site().get("url") or "").rstrip("/")
    if not base.startswith("http"):
        print("  ! Chưa có địa chỉ website: vào mục [1] -> 'Địa chỉ website'."); return
    body = json.dumps({"message": f"Thử từ quan_ly.py lúc {datetime.datetime.now():%H:%M:%S}", "path": "/quan_ly-thu"}).encode()
    req = urllib.request.Request(base + "/api/report-error", data=body, method="POST", headers={"Content-Type": "application/json", "User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=25) as r: status = r.status
    except urllib.error.HTTPError as e: status = e.code
    except urllib.error.URLError as e: print(f"  ✗ Không kết nối được {base}: {e.reason}"); return
    if status == 404: print("  ✗ Web chưa có bản mới (thiếu /api/report-error). Hãy đẩy lên bằng [9] rồi thử lại."); return
    if status == 429: print("  ! Gửi quá nhanh, đợi 1 phút rồi thử lại."); return
    if status != 204: print(f"  ✗ Web trả mã {status}."); return
    rows = sb_call("GET", "/rest/v1/error_logs?select=notified&order=created_at.desc&limit=1") or []
    res = (rows[0]["notified"] if rows else {}).get("discord") or ("bỏ qua vì trùng lỗi vừa báo" if rows and rows[0]["notified"].get("skipped") else "?")
    hint = {"ok": "ĐÃ GỬI, kiểm tra kênh Discord", "no_config": "CHƯA CÓ WEBHOOK (đặt ở mục 2 hoặc biến DISCORD_WEBHOOK_URL trên Vercel)",
            "disabled": "đang TẮT (mục 1)", "error": "lỗi mạng khi gửi"}.get(res, f"Discord từ chối ({res}), webhook có thể sai/đã xóa" if res.startswith("http_") else res)
    print(f"  Kết quả kênh Discord: {hint}")

def test_webhook(hook):
    if not hook: print("  ! Chưa lưu webhook ở mục 2."); return
    req = urllib.request.Request(hook, method="POST", headers={"Content-Type": "application/json", "User-Agent": UA},
                                 data=json.dumps({"content": "Thử webhook từ quan_ly.py", "allowed_mentions": {"parse": []}}).encode())
    try:
        with urllib.request.urlopen(req, timeout=15) as r: print("  ✓ Discord nhận được, kiểm tra kênh." if r.status in (200, 204) else f"  ! Mã {r.status}")
    except urllib.error.HTTPError as e: print(f"  ✗ Discord từ chối (mã {e.code}): webhook sai hoặc đã bị xóa.")
    except urllib.error.URLError as e: print(f"  ✗ Không kết nối được: {e.reason}")

def do_alerts():
    s = get_setting("error_alerts", ALERTS_DEFAULT)
    while True:
        hook = s.get("webhookUrl") or ""
        print("\n--- BÁO LỖI VỀ DISCORD (có hiệu lực trong ~30 giây, không cần đẩy lên Vercel) ---")
        print(f"  1. Báo lỗi tự động: {'Bật' if s['discord'] else 'Tắt'}")
        print(f"  2. Webhook Discord: {_mask(hook) if hook else '(chưa đặt ở đây: web dùng biến DISCORD_WEBHOOK_URL trên Vercel)'}")
        print(f"  3. Chống trùng: {s['dedupeSeconds']} giây (cùng một lỗi trong khoảng này chỉ báo 1 lần; 0 = báo mọi lần)")
        print("  4. Gửi thử một lỗi qua web thật (kiểm tra cả chuỗi Vercel -> Discord)")
        print("  5. Gửi thử thẳng tới webhook đã lưu ở mục 2")
        c = input("Số mục (Enter = xong): ").strip()
        if not c: return
        if c == "1": s["discord"] = not s["discord"]
        elif c == "2":
            v = input("  Dán webhook mới (Enter = giữ, '-' = xóa, quay về dùng biến trên Vercel): ").strip()
            if not v: continue
            if v == "-": s["webhookUrl"] = ""
            elif WEBHOOK_RE.match(v): s["webhookUrl"] = v
            else: print("  ! Không đúng dạng webhook Discord (https://discord.com/api/webhooks/số/mã)."); continue
        elif c == "3":
            n = _int_in("Chống trùng (giây)", 0, 86400, s["dedupeSeconds"])
            if n is None: continue
            s["dedupeSeconds"] = n
        elif c == "4": test_via_site(); continue
        elif c == "5": test_webhook(hook); continue
        else: continue
        put_setting("error_alerts", s); print("  ✓ Đã lưu.")

# --- [3] khóa đăng nhập ---
def do_auth_settings():
    s = get_setting("auth", AUTH_DEFAULT)
    while True:
        lm = s["lockMinutes"]
        print("\n--- KHÓA ĐĂNG NHẬP (có hiệu lực trong ~30 giây) ---")
        print(f"  1. Số lần nhập sai tối đa: {s['maxAttempts']} (sai tới lần này thì khóa đăng nhập tài khoản đó)")
        print(f"  2. Thời gian khóa: {'đến khi admin mở khóa' if lm == 0 else f'{lm} phút (tự mở lại)'}   [0 = đến khi admin mở khóa]")
        c = input("Số mục (Enter = xong): ").strip()
        if not c: return
        if c == "1": n = _int_in("Số lần sai tối đa", 1, 20, s["maxAttempts"]); key = "maxAttempts"
        elif c == "2": n = _int_in("Số phút khóa", 0, 10080, s["lockMinutes"]); key = "lockMinutes"
        else: continue
        if n is None: continue
        s[key] = n; put_setting("auth", s); print("  ✓ Đã lưu.")

# --- [4] quản lý tài khoản ---
def _lock_state(s, lock_min):
    """Giống hàm login_begin trong DB: quá lock_min phút kể từ lúc khóa/lần thử cuối thì bộ đếm coi như làm lại."""
    if not s: return {"failed": 0, "locked": False}
    if lock_min > 0 and _ts(s["locked_at"] or s["updated_at"]) < _now() - datetime.timedelta(minutes=lock_min):
        return {"failed": 0, "locked": False}
    return {"failed": s["failed_attempts"], "locked": bool(s["locked_at"])}

def _decorate(profs):
    if not profs: return []
    lock_min = get_setting("auth", AUTH_DEFAULT)["lockMinutes"]
    names = ",".join(p["username"].lower() for p in profs)
    states = {s["username_lc"]: s for s in sb_call("GET", f"/rest/v1/login_state?username_lc=in.({names})&select=username_lc,failed_attempts,locked_at,updated_at") or []}
    admins = {a["user_id"] for a in sb_call("GET", "/rest/v1/admins?select=user_id&user_id=in.(" + ",".join(p["id"] for p in profs) + ")") or []}
    return [{"id": p["id"], "username": p["username"], "isAdmin": p["id"] in admins, **_lock_state(states.get(p["username"].lower()), lock_min)} for p in profs]

def _status(a): return "ĐANG BỊ KHÓA" if a["locked"] else f"đã sai {a['failed']} lần" if a["failed"] else "bình thường"

def audit(action, uid, name):
    try: sb_call("POST", "/rest/v1/admin_audit", {"admin_id": NIL_UUID, "action": "cli:" + action, "target_id": uid, "target_username": name}, prefer="return=minimal")
    except RuntimeError as e: print(f"  (Không ghi được nhật ký: {e})")

def unlock_name(name, uid=None):
    sb_call("DELETE", f"/rest/v1/login_state?username_lc=eq.{name.lower()}")
    audit("unlock", uid, name); print(f"  ✓ Đã mở khóa {name}.")

def reset_password(a):
    if a["isAdmin"] and input("  Đây là tài khoản quản trị. Vẫn đổi mật khẩu? (y/N): ").strip().lower() != "y": return
    while True:
        pw = input(f"  Mật khẩu mới ({PASSWORD_MIN}-{PASSWORD_MAX} ký tự; Enter = tạo ngẫu nhiên; 0 = hủy): ").strip()
        if pw == "0": return
        if not pw: pw = "".join(secrets.choice(PW_ALPHABET) for _ in range(10))
        elif not PASSWORD_MIN <= len(pw) <= PASSWORD_MAX: print(f"  ! Mật khẩu cần {PASSWORD_MIN}-{PASSWORD_MAX} ký tự."); continue
        break
    sb_call("PUT", f"/auth/v1/admin/users/{a['id']}", {"password": pw})
    sb_call("POST", "/rest/v1/rpc/admin_revoke_sessions", {"p_user": a["id"]})   # đá mọi thiết bị đang dùng mật khẩu cũ
    sb_call("DELETE", f"/rest/v1/login_state?username_lc=eq.{a['username'].lower()}")
    audit("reset-password", a["id"], a["username"]); a.update(failed=0, locked=False)
    print(f"  ✓ Đã đổi mật khẩu cho {a['username']}; mọi thiết bị đã bị đăng xuất, khóa (nếu có) đã gỡ.")
    print(f"    Mật khẩu mới: {pw}    (chỉ hiện lần này, hãy gửi cho họ)")

def toggle_admin(a):
    if a["isAdmin"]:
        if input(f"  Gỡ quyền quản trị của {a['username']}? (y/N): ").strip().lower() != "y": return
        sb_call("DELETE", f"/rest/v1/admins?user_id=eq.{a['id']}"); a["isAdmin"] = False; audit("revoke-admin", a["id"], a["username"])
        print(f"  ✓ Đã gỡ quyền quản trị của {a['username']}.")
    else:
        sb_call("POST", "/rest/v1/admins", {"user_id": a["id"]}, prefer="resolution=ignore-duplicates,return=minimal")
        a["isAdmin"] = True; audit("grant-admin", a["id"], a["username"])
        print(f"  ✓ {a['username']} đã là quản trị viên (vào /quan-tri/tai-khoan trên web).")

def account_actions(a):
    while True:
        print(f"\n  Tài khoản: {a['username']} ({_status(a)}{', quản trị viên' if a['isAdmin'] else ''})")
        print(f"   [1] Mở khóa đăng nhập\n   [2] Đổi mật khẩu\n   [3] {'Gỡ quyền quản trị' if a['isAdmin'] else 'Cấp quyền quản trị'}\n   [0] Quay lại")
        c = input("  Chọn: ").strip()
        if c == "1": unlock_name(a["username"], a["id"]); a.update(failed=0, locked=False)
        elif c == "2": reset_password(a)
        elif c == "3": toggle_admin(a)
        else: return

def pick_account(rows):
    if not rows: print("  (Không có tài khoản nào.)"); return
    for i, a in enumerate(rows, 1):
        print(f"  {i:>2}. {a['username']:<14} {_status(a)}" + ("   [quản trị]" if a["isAdmin"] else ""))
    ni = ask_nums("Số tài khoản cần thao tác (Enter = quay lại): ", len(rows))
    if ni: account_actions(rows[ni[0] - 1])

def list_locked():
    lock_min = get_setting("auth", AUTH_DEFAULT)["lockMinutes"]
    rows = sb_call("GET", "/rest/v1/login_state?locked_at=not.is.null&select=username_lc,failed_attempts,locked_at,updated_at&order=locked_at.desc&limit=50") or []
    rows = [r for r in rows if _lock_state(r, lock_min)["locked"]]
    if not rows: print("  Không có tài khoản nào đang bị khóa."); return
    for i, r in enumerate(rows, 1): print(f"  {i:>2}. {r['username_lc']:<14} khóa lúc {_ts(r['locked_at']).astimezone():%d/%m %H:%M}")
    for i in ask_nums("Số cần mở khóa (all = mở hết; Enter = quay lại): ", len(rows)): unlock_name(rows[i - 1]["username_lc"])

def do_accounts():
    while True:
        print("\n--- QUẢN LÝ TÀI KHOẢN ---\n [1] Tìm tài khoản theo tên\n [2] Tài khoản đang bị khóa đăng nhập\n [3] Danh sách quản trị viên\n [0] Quay lại")
        c = input("Chọn: ").strip()
        if c == "1":
            q = input("Tên cần tìm (Enter = 20 tài khoản đầu): ").strip()
            if not NAME_RE.match(q): print("  ! Chỉ gồm chữ không dấu, số, gạch dưới (tối đa 12 ký tự)."); continue
            path = "/rest/v1/profiles?select=id,username&order=username.asc&limit=20"
            if q: path += "&username=ilike.*" + urllib.parse.quote(q.replace("_", "\\_"), safe="") + "*"   # "_" là ký tự đại diện của LIKE: thoát nó
            pick_account(_decorate(sb_call("GET", path) or []))
        elif c == "2": list_locked()
        elif c == "3":
            ids = [r["user_id"] for r in sb_call("GET", "/rest/v1/admins?select=user_id") or []]
            if not ids: print("  Chưa có quản trị viên nào. Hãy tìm tài khoản của bạn (mục 1) rồi chọn 'Cấp quyền quản trị'."); continue
            pick_account(_decorate(sb_call("GET", "/rest/v1/profiles?select=id,username&order=username.asc&id=in.(" + ",".join(ids) + ")") or []))
        else: return

# --- [5] lỗi gần nhất ---
def do_errors():
    rows = sb_call("GET", "/rest/v1/error_logs?select=created_at,source,path,message,alerted&order=created_at.desc&limit=10") or []
    if not rows: print("  Chưa có lỗi nào được ghi."); return
    for r in rows:
        when = _ts(r["created_at"]).astimezone()
        msg = " ".join(r["message"].split())[:90]
        print(f"  {when:%d/%m %H:%M}  {'trình duyệt' if r['source'] == 'client' else 'máy chủ':<11} {'đã báo' if r['alerted'] else 'chưa báo':<8} {r['path'] or '-'}\n      {msg}")

# --- menu cmd 7 ---
CMD7_MENU = """
=== CMD 7: CÀI ĐẶT WEB & TÀI KHOẢN ===
 [1] Chữ & link trên web (tên web, Discord, Facebook, chân trang, menu...)   -> cần đẩy lên Vercel [9]
 [2] Báo lỗi về Discord (bật/tắt, webhook, chống trùng, gửi thử)             -> có hiệu lực ngay
 [3] Khóa đăng nhập (số lần sai tối đa, thời gian khóa)                      -> có hiệu lực ngay
 [4] Quản lý tài khoản (tìm, mở khóa, đổi mật khẩu, quyền quản trị)
 [5] Xem 10 lỗi hệ thống gần nhất
 [0] Quay lại"""

def do_cmd7():
    handlers = {"2": do_alerts, "3": do_auth_settings, "4": do_accounts, "5": do_errors}
    changed = False
    while True:
        print(CMD7_MENU)
        try: c = input("Chọn: ").strip()
        except EOFError: return changed
        try:
            if c == "1": changed |= bool(do_site())
            elif c in handlers:
                if sb_config(): handlers[c]()
            elif c == "0": return changed
        except RuntimeError as e: print(f"\n  ✗ {e}")
        except EOFError: return changed


MENU = """
=== MYSITE ===
 [1] Thêm game mới (kèm bước thêm ảnh)
 [2] Sửa thông tin game (tên, phiên bản, dung lượng, ngày, tag, intro, nội dung)
 [3] Quản lý link tải (Gofile, Drive...)
 [4] Thêm / đổi ảnh (ảnh chính + ảnh bổ sung)
 [5] Đổi ảnh chính / xóa ảnh bổ sung
 [6] Xóa game
 [7] Cài đặt web & tài khoản (chữ/link, báo lỗi Discord, khóa đăng nhập, quản lý tài khoản)
 [8] Kiểm tra lỗi (ảnh thiếu, link sai, git bỏ qua ảnh)
 [9] Đẩy lên Vercel
 [0] Thoát"""

def main():
    if not DATA.exists():
        sys.exit(f"Không thấy {DATA}. Hãy đặt quan_ly.py trong thư mục mysite.")
    ensure_pillow()
    backfill_visuals()
    ensure_gitignore()
    if not SITE.exists():
        write_json(SITE, SITE_DEFAULT); print("  (Đã tạo src/data/site.json)")
    else:
        s = read_json(SITE, {})
        if "facebook" not in s or "facebook" not in s.get("nav", {}):  # nâng cấp site.json cũ: web đọc thẳng file này nên khóa phải có sẵn
            s.setdefault("facebook", SITE_DEFAULT["facebook"])
            s.setdefault("nav", {}).setdefault("facebook", "Facebook")
            write_json(SITE, s); print("  (Đã thêm link Facebook vào src/data/site.json)")
    actions = {"1": do_add_game, "2": do_edit_game, "3": do_links, "4": do_images, "5": do_manage_images,
               "6": do_delete_games, "7": do_cmd7, "8": do_check}
    changed = False
    while True:
        print(MENU)
        try: c = input("Chọn: ").strip()
        except EOFError: break
        try:
            if c in actions: changed |= bool(actions[c]())
            elif c == "9":
                if do_push(): changed = False
            elif c == "0":
                if changed and input("Có thay đổi chưa đẩy lên. Đẩy luôn? (y/N): ").lower() == "y": do_push()
                break
        except KeyboardInterrupt:
            print("\n  (Đã hủy thao tác)")
        except Exception as e:  # lỗi bất ngờ không làm thoát tool và mất phiên làm việc
            print(f"\n  ✗ Lỗi: {type(e).__name__}: {e}")

if __name__ == "__main__":
    main()
