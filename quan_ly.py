# -*- coding: utf-8 -*-
"""MySite - Tool quản lý: game, link tải, ảnh (chính + bổ sung), chữ/link trên web, đẩy lên Vercel.
Chạy:  python quan_ly.py   (đặt file này trong thư mục mysite)
Ảnh: bỏ vào thư mục  anh-moi/  rồi chọn trong tool.
  - Ảnh CHÍNH   (1 ảnh): hiện ngoài trang chủ + làm nền trang game.
  - Ảnh BỔ SUNG (tối đa 10): ảnh trong game để người xem hiểu thêm.
Mọi ảnh thêm vào đều được đóng dấu logo (logo/logo-xanh.png, tự tách nền xanh lá). Chỉnh góc/cỡ ở các hằng WM_*.
"""
import base64, colorsys, datetime, hashlib, importlib, io, json, os, re, shutil, subprocess, sys, unicodedata
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "src" / "data" / "games.json"
SITE = ROOT / "src" / "data" / "site.json"
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
THUMB_W = 640       # ảnh nhỏ cho thẻ game / ô tìm kiếm / game tương tự (hiện ~380px nên 640 đủ nét cho màn 1.5x-2x)

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
    "footer": "© 2026 MySite",
    "nav": {"explore": "Khám phá", "discord": "Discord"},
    "home": {"libraryTitle": "Kho game", "featuredBadge": "Mới cập nhật", "featuredButton": "Xem game",
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
    ("discord", "Link Discord (trống = ẩn nút)", "url"),
    ("footer", "Dòng chân trang", "text"),
    ("nav.explore", "Menu: chữ 'Khám phá'", "text"),
    ("nav.discord", "Menu: chữ nút Discord", "text"),
    ("home.libraryTitle", "Tiêu đề kho game", "text"),
    ("home.featuredBadge", "Nhãn game mới cập nhật", "text"),
    ("home.featuredButton", "Chữ nút 'Xem game'", "text"),
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

def ask_tags(default):
    """Sửa tag theo vòng lặp (Enter = xong). Không cần gõ lại cả danh sách khi chỉ muốn thêm/bớt 1-2 tag."""
    tags = _dedupe(default)
    presets = [t for t in load_site().get("tagPresets", []) if isinstance(t, str)]
    while True:
        have = {_fold(t) for t in tags}
        quick = "  ".join(f"[{i}] {'✓' if have & al else ' '} {lb}" for i, (lb, al) in enumerate(QUICK_TAGS, 1))
        print(f"\n  Tag hiện tại: {', '.join(tags) or '(chưa có)'}")
        print(f"  Nhãn nhanh (bấm số để bật/tắt): {quick}")
        s = input("  Enter = xong | +tag1, tag2 = thêm | -tag = bớt | p = chọn từ tag gợi ý | hoặc gõ cả danh sách mới\n  > ").strip()
        if not s: return tags
        if re.fullmatch(r"[\d\s,]+", s):                      # số: bật/tắt nhãn nhanh
            for n in re.findall(r"\d+", s):
                if 1 <= int(n) <= len(QUICK_TAGS):
                    lb, al = QUICK_TAGS[int(n) - 1]; tags = _toggle(tags, lb, al)
                else: print(f"  ! Không có nhãn nhanh số {n}")
        elif s.lower() == "p":
            if not presets: print("  (Chưa có tag gợi ý. Thêm vào src/data/site.json -> tagPresets)"); continue
            have = {_fold(t) for t in tags}
            print("  Tag gợi ý: " + "  ".join(f"[{i}]{'✓' if _fold(t) in have else ''}{t}" for i, t in enumerate(presets, 1)))
            for i in ask_nums("  Chọn số để bật/tắt (vd: 1 4 6-8; Enter = bỏ qua): ", len(presets)):
                tags = _toggle(tags, presets[i - 1])
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
        im.save(buf, "WEBP", quality=85, method=4)
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
        "description": ask("Mô tả ngắn"),
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
    g["description"] = ask("Mô tả ngắn", g["description"])
    g["updatedAt"] = ask_date(g["updatedAt"])
    if g["version"] != old_version and input("Phiên bản đổi. Đặt ngày cập nhật = hôm nay? (Y/n): ").strip().lower() != "n":
        g["updatedAt"] = datetime.date.today().isoformat()
    save(games); print("  ✓ Đã lưu.")
    return True

def do_delete_games():
    games = load()
    print("\nGame:"); show_games(games)
    gi = ask_nums("Chọn game cần XÓA (vd: 2 | 3-5; Enter = hủy): ", len(games))
    if not gi: return False
    names = ", ".join(games[i - 1]["title"] for i in gi)
    if input(f"Xóa vĩnh viễn: {names}? Gõ 'xoa' để xác nhận: ").strip().lower() != "xoa":
        print("  Đã hủy."); return False
    for i in sorted(gi, reverse=True):
        shutil.rmtree(COVERS / games[i - 1]["slug"], ignore_errors=True)
        games.pop(i - 1)
    save(games); print("  ✓ Đã xóa.")
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
    add = [x for x in ("anh-moi/", "anh-goc/", "backup/", "__pycache__/") if x not in have]
    if add:
        gi.write_text(text.rstrip("\n") + ("\n" if text else "") + "\n# quan_ly.py\n" + "\n".join(add) + "\n", encoding="utf-8")
        print(f"  (Đã thêm vào .gitignore: {', '.join(add)})")
    if has_git() and run("git", "ls-files", "--", "anh-moi", "anh-goc", "backup").stdout.strip():
        run("git", "rm", "-r", "--cached", "-q", "--", "anh-moi", "anh-goc", "backup")
        print("  (Đã gỡ anh-moi/ và backup/ khỏi git; chúng vẫn nằm trên máy bạn)")

def do_push():
    if not has_git():
        print("\n  Thư mục này chưa phải git repo."); return False
    status = run("git", "status", "--porcelain").stdout.strip().splitlines()
    if not status:
        print("\n  Không có thay đổi nào để đẩy."); return False
    imgs = sum(1 for l in status if "public/covers" in l)
    print(f"\n  Sẽ đẩy {len(status)} thay đổi ({imgs} thuộc ảnh):")
    for l in status[:15]: print("   ", l)
    if len(status) > 15: print(f"    ... và {len(status) - 15} mục nữa")
    msg = ask("Ghi chú commit", "cap nhat game")
    for cmd in (("git", "add", "-A"), ("git", "commit", "-m", msg)):
        r = run(*cmd)
        if r.returncode != 0:
            print(f"\n  ✗ Lỗi ở '{' '.join(cmd[:2])}':\n{r.stderr or r.stdout}"); return False
    if run("git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}").returncode == 0:
        r = run("git", "pull", "--rebase")  # lấy commit mới từ GitHub trước khi đẩy
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


MENU = """
=== MYSITE ===
 [1] Thêm game mới (kèm bước thêm ảnh)
 [2] Sửa thông tin game (tên, phiên bản, dung lượng, ngày, tag, mô tả)
 [3] Quản lý link tải (Gofile, Drive...)
 [4] Thêm / đổi ảnh (ảnh chính + ảnh bổ sung)
 [5] Đổi ảnh chính / xóa ảnh bổ sung
 [6] Xóa game
 [7] Chữ & link trên web (tên web, Discord, chân trang, menu...)
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
    actions = {"1": do_add_game, "2": do_edit_game, "3": do_links, "4": do_images, "5": do_manage_images,
               "6": do_delete_games, "7": do_site, "8": do_check}
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
