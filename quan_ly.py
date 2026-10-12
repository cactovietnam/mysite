# -*- coding: utf-8 -*-
"""MySite - Tool quản lý ảnh game + đẩy lên Vercel.
Chạy:  python quan_ly.py   (đặt file này trong thư mục mysite)
Cách dùng: bỏ ảnh vào thư mục  anh-moi/  -> chạy tool -> chọn game -> chọn ảnh.
"""
import hashlib, json, os, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "src" / "data" / "games.json"
COVERS = ROOT / "public" / "covers"
INBOX = ROOT / "anh-moi"
DONE = INBOX / "_da_xu_ly"
EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"}
MAX_W = 1600  # ảnh rộng hơn sẽ thu nhỏ để web nhẹ

try:
    from PIL import Image
except ImportError:
    Image = None

if os.name == "nt":
    os.system("chcp 65001 >nul")
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass


def load():
    return json.loads(DATA.read_text(encoding="utf-8"))

def save(games):
    DATA.write_text(json.dumps(games, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def parse_nums(text, n):
    """'1 2 3' / '1,3' / '3-5' / 'all' -> danh sách chỉ số 1..n, giữ thứ tự, bỏ trùng."""
    text = text.strip().lower()
    if text in ("all", "a", "tat ca", "tất cả"):
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
    for i, g in enumerate(games, 1):
        print(f"  {i:>2}. {g['title']}  ({len(g.get('images', []))} ảnh)")

def inbox_images():
    INBOX.mkdir(exist_ok=True)
    return sorted((p for p in INBOX.iterdir() if p.is_file() and p.suffix.lower() in EXT),
                  key=lambda p: p.name.lower())

def encode(src: Path):
    """Trả về (bytes, đuôi). Có Pillow: thu nhỏ + webp; không có: giữ nguyên."""
    if Image is None or src.suffix.lower() == ".gif":
        return src.read_bytes(), src.suffix.lower().lstrip(".")
    import io
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
        name = hashlib.md5(data).hexdigest()[:10] + "." + ext  # tên theo nội dung: tránh trùng, tránh cache cũ
        (folder / name).write_bytes(data)
        url = f"/covers/{game['slug']}/{name}"
        if url not in game["images"]:
            game["images"].append(url)
    if game["images"]:
        game["cover"] = game["images"][0]

def do_add():
    games = load()
    files = inbox_images()
    if not files:
        print(f"\n  Chưa có ảnh nào trong: {INBOX}\n  Bỏ ảnh vào đó rồi chạy lại.")
        return False
    print("\nGame:"); show_games(games)
    gi = ask_nums("Chọn game (vd: 1 2 3 | 3-5 | all; Enter = hủy): ", len(games))
    if not gi: return False
    print("\nẢnh trong anh-moi/:")
    for i, f in enumerate(files, 1): print(f"  {i:>2}. {f.name}")
    fi = ask_nums("Chọn ảnh (vd: 1 2 | all; Enter = tất cả): ", len(files)) or list(range(1, len(files) + 1))
    mode = input("Chế độ  [1] Thêm vào ảnh sẵn có (mặc định)  [2] Thay toàn bộ ảnh cũ: ").strip()
    replace = mode == "2"
    chosen = [files[i - 1] for i in fi]
    for i in gi:
        add_images(games[i - 1], chosen, replace)
        print(f"  ✓ {games[i-1]['title']}: {len(games[i-1]['images'])} ảnh")
    save(games)
    DONE.mkdir(exist_ok=True)
    for f in chosen:
        shutil.move(str(f), DONE / f.name) if not (DONE / f.name).exists() else f.unlink()
    print("Xong. Ảnh gốc đã chuyển vào anh-moi/_da_xu_ly/")
    return True

def do_manage():
    games = load()
    print("\nGame:"); show_games(games)
    gi = ask_nums("Chọn 1 game: ", len(games))
    if not gi: return False
    g = games[gi[0] - 1]
    if not g.get("images"):
        print("  Game này chưa có ảnh trong thư viện."); return False
    for i, u in enumerate(g["images"], 1):
        print(f"  {i:>2}. {u}{'   <- ảnh bìa' if u == g['cover'] else ''}")
    act = input("[1] Đặt làm ảnh bìa  [2] Xóa ảnh: ").strip()
    ni = ask_nums("Số ảnh: ", len(g["images"]))
    if not ni or act not in ("1", "2"): return False
    if act == "1":
        u = g["images"].pop(ni[0] - 1); g["images"].insert(0, u); g["cover"] = u
    else:
        for i in sorted(ni, reverse=True):
            u = g["images"].pop(i - 1)
            (ROOT / "public" / u.lstrip("/")).unlink(missing_ok=True)
        if g["images"]: g["cover"] = g["images"][0]
    save(games); print("  ✓ Đã cập nhật.")
    return True

def run(*cmd):
    return subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True, encoding="utf-8")

def do_push():
    if run("git", "status", "--porcelain").stdout.strip() == "":
        print("\n  Không có thay đổi nào để đẩy."); return
    msg = input("Ghi chú commit (Enter = 'cap nhat anh game'): ").strip() or "cap nhat anh game"
    for cmd in (("git", "add", "-A"), ("git", "commit", "-m", msg), ("git", "push")):
        r = run(*cmd)
        if r.returncode != 0:
            print(f"\n  ✗ Lỗi ở '{' '.join(cmd[:2])}':\n{r.stderr or r.stdout}"); return
    print("\n  ✓ Đã đẩy lên GitHub. Vercel build ~1 phút rồi tự cập nhật site.")

def main():
    if not DATA.exists():
        sys.exit(f"Không thấy {DATA}. Hãy đặt quan_ly.py trong thư mục mysite.")
    if Image is None:
        print("Mẹo: chạy  pip install pillow  để tool tự nén/thu nhỏ ảnh (web nhanh hơn).")
    changed = False
    while True:
        print("\n=== MYSITE ===\n [1] Thêm / đổi ảnh cho game\n [2] Xóa ảnh / đặt ảnh bìa\n [3] Đẩy lên Vercel\n [0] Thoát")
        c = input("Chọn: ").strip()
        if c == "1": changed |= bool(do_add())
        elif c == "2": changed |= bool(do_manage())
        elif c == "3": do_push(); changed = False
        elif c == "0":
            if changed and input("Có thay đổi chưa đẩy lên. Đẩy luôn? (y/N): ").lower() == "y": do_push()
            break

if __name__ == "__main__":
    main()
