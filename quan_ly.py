# -*- coding: utf-8 -*-
"""MySite - Tool quản lý game: thêm / sửa / xóa game, link tải, ảnh, và đẩy lên Vercel.
Chạy:  python quan_ly.py   (đặt file này trong thư mục mysite)
Ảnh: bỏ vào thư mục  anh-moi/  rồi chọn trong tool.
"""
import datetime, hashlib, io, json, os, re, shutil, subprocess, sys, unicodedata
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "src" / "data" / "games.json"
COVERS = ROOT / "public" / "covers"
INBOX = ROOT / "anh-moi"
DONE = INBOX / "_da_xu_ly"
EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"}
ENGINES = ["Ren'Py", "RPGM", "Unity", "Unreal"]
MAX_W = 1600  # ảnh rộng hơn sẽ thu nhỏ cho web nhẹ

try:
    from PIL import Image
except ImportError:
    Image = None

if os.name == "nt":
    os.system("chcp 65001 >nul")
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass


# ---------- dữ liệu ----------
def load():
    return json.loads(DATA.read_text(encoding="utf-8"))

def save(games):
    DATA.write_text(json.dumps(games, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

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
        s = ask("Dung lượng (GB)", default).replace(",", ".")
        try: return round(float(s), 2)
        except ValueError: print("  ! Nhập số, vd 3.8")

def ask_date(default):
    while True:
        s = ask("Ngày cập nhật (YYYY-MM-DD)", default)
        try:
            datetime.date.fromisoformat(s); return s
        except ValueError: print("  ! Sai định dạng, vd 2026-10-13")

def ask_engine(default):
    print("Engine: " + "  ".join(f"[{i}] {e}" for i, e in enumerate(ENGINES, 1)) + "  (hoặc gõ tên khác)")
    s = ask("Chọn", default)
    return ENGINES[int(s) - 1] if s.isdigit() and 1 <= int(s) <= len(ENGINES) else s

def ask_tags(default):
    s = ask("Tag (cách nhau bằng dấu phẩy)", ", ".join(default))
    return [t.strip() for t in s.split(",") if t.strip()]

def parse_nums(text, n):
    """'1 2 3' / '1,3' / '3-5' / 'all' -> danh sách chỉ số 1..n, giữ thứ tự, bỏ trùng."""
    text = text.strip().lower()
    if text in ("all", "a"):
        return list(range(1, n + 1))
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
        print(f"  {i:>2}. {g['title']}  [{g['engine']}, v{g['version']}, {len(g.get('images', []))} ảnh, {len(g.get('links', []))} link]")

def pick_one(games, prompt="Chọn 1 game: "):
    if not games:
        print("  Chưa có game nào."); return None
    show_games(games)
    r = ask_nums(prompt, len(games))
    return games[r[0] - 1] if r else None


# ---------- ảnh ----------
def inbox_images():
    INBOX.mkdir(exist_ok=True)
    return sorted((p for p in INBOX.iterdir() if p.is_file() and p.suffix.lower() in EXT),
                  key=lambda p: p.name.lower())

def encode(src: Path):
    """Có Pillow: thu nhỏ + webp. Không có: giữ nguyên."""
    if Image is None or src.suffix.lower() == ".gif":
        return src.read_bytes(), src.suffix.lower().lstrip(".")
    with Image.open(src) as im:
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=85)
        return buf.getvalue(), "webp"

def add_images(game, files, replace):
    folder = COVERS / game["slug"]
    folder.mkdir(parents=True, exist_ok=True)
    if replace:
        for old in game.get("images", []):
            (ROOT / "public" / old.lstrip("/")).unlink(missing_ok=True)
        game["images"] = []
    for f in files:
        data, ext = encode(f)
        name = hashlib.md5(data).hexdigest()[:10] + "." + ext  # tên theo nội dung: không trùng, không dính cache cũ
        (folder / name).write_bytes(data)
        url = f"/covers/{game['slug']}/{name}"
        if url not in game["images"]:
            game["images"].append(url)
    if game["images"]:
        game["cover"] = game["images"][0]

def choose_inbox_files():
    files = inbox_images()
    if not files:
        print(f"\n  Chưa có ảnh nào trong: {INBOX}\n  Bỏ ảnh vào đó rồi thử lại.")
        return []
    print("\nẢnh trong anh-moi/:")
    for i, f in enumerate(files, 1): print(f"  {i:>2}. {f.name}")
    fi = ask_nums("Chọn ảnh (vd: 1 2 | all; Enter = tất cả): ", len(files)) or list(range(1, len(files) + 1))
    return [files[i - 1] for i in fi]

def archive_files(files):
    DONE.mkdir(exist_ok=True)
    for f in files:
        if (DONE / f.name).exists(): f.unlink()
        else: shutil.move(str(f), DONE / f.name)

def do_images():
    games = load()
    if not games: print("\n  Chưa có game nào."); return False
    print("\nGame:"); show_games(games)
    gi = ask_nums("Chọn game (vd: 1 2 3 | 3-5 | all; Enter = hủy): ", len(games))
    if not gi: return False
    chosen = choose_inbox_files()
    if not chosen: return False
    replace = input("Chế độ  [1] Thêm vào ảnh sẵn có (mặc định)  [2] Thay toàn bộ ảnh cũ: ").strip() == "2"
    for i in gi:
        add_images(games[i - 1], chosen, replace)
        print(f"  ✓ {games[i-1]['title']}: {len(games[i-1]['images'])} ảnh")
    save(games); archive_files(chosen)
    print("Xong. Ảnh gốc đã chuyển vào anh-moi/_da_xu_ly/")
    return True

def do_manage_images():
    games = load()
    g = pick_one(games)
    if not g: return False
    if not g.get("images"):
        print("  Game này chưa có ảnh."); return False
    for i, u in enumerate(g["images"], 1):
        print(f"  {i:>2}. {u}{'   <- ảnh bìa' if u == g['cover'] else ''}")
    act = input("[1] Đặt làm ảnh bìa  [2] Xóa ảnh: ").strip()
    ni = ask_nums("Số ảnh: ", len(g["images"]))
    if not ni or act not in ("1", "2"): return False
    if act == "1":
        u = g["images"].pop(ni[0] - 1); g["images"].insert(0, u); g["cover"] = u
    else:
        for i in sorted(ni, reverse=True):
            (ROOT / "public" / g["images"].pop(i - 1).lstrip("/")).unlink(missing_ok=True)
        g["cover"] = g["images"][0] if g["images"] else ""
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
    if inbox_images() and input("Dùng ảnh trong anh-moi/ cho game này? (Y/n): ").strip().lower() != "n":
        chosen = choose_inbox_files()
        if chosen:
            add_images(g, chosen, False); archive_files(chosen)
    games.append(g); save(games)
    print(f"  ✓ Đã thêm '{title}' (địa chỉ: /game/{g['slug']})")
    return True

def do_edit_game():
    games = load()
    g = pick_one(games)
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
def norm_url(u):
    u = u.strip()
    return u if re.match(r"^https?://", u, re.I) else "https://" + u

def host_of(url):
    return (urlparse(url).hostname or url).removeprefix("www.")

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
    games = load()
    g = pick_one(games)
    if not g: return False
    edit_links(g)
    save(games); print("  ✓ Đã lưu link.")
    return True


# ---------- git ----------
def run(*cmd):
    return subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True, encoding="utf-8")

def do_push():
    if run("git", "status", "--porcelain").stdout.strip() == "":
        print("\n  Không có thay đổi nào để đẩy."); return
    msg = ask("Ghi chú commit", "cap nhat game")
    for cmd in (("git", "add", "-A"), ("git", "commit", "-m", msg), ("git", "push")):
        r = run(*cmd)
        if r.returncode != 0:
            print(f"\n  ✗ Lỗi ở '{' '.join(cmd[:2])}':\n{r.stderr or r.stdout}"); return
    print("\n  ✓ Đã đẩy lên GitHub. Vercel build ~1 phút rồi tự cập nhật site.")

MENU = """
=== MYSITE ===
 [1] Thêm game mới
 [2] Sửa thông tin game (tên, phiên bản, dung lượng, ngày, tag, mô tả)
 [3] Quản lý link tải (Gofile, Drive...)
 [4] Thêm / đổi ảnh cho game
 [5] Xóa ảnh / đặt ảnh bìa
 [6] Xóa game
 [7] Đẩy lên Vercel
 [0] Thoát"""

def main():
    if not DATA.exists():
        sys.exit(f"Không thấy {DATA}. Hãy đặt quan_ly.py trong thư mục mysite.")
    if Image is None:
        print("Mẹo: chạy  pip install pillow  để tool tự nén/thu nhỏ ảnh (web nhanh hơn).")
    actions = {"1": do_add_game, "2": do_edit_game, "3": do_links, "4": do_images, "5": do_manage_images, "6": do_delete_games}
    changed = False
    while True:
        print(MENU)
        try: c = input("Chọn: ").strip()
        except EOFError: break
        if c in actions: changed |= bool(actions[c]())
        elif c == "7": do_push(); changed = False
        elif c == "0":
            if changed and input("Có thay đổi chưa đẩy lên. Đẩy luôn? (y/N): ").lower() == "y": do_push()
            break

if __name__ == "__main__":
    main()
