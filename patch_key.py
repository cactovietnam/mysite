# -*- coding: utf-8 -*-
"""Chạy MỘT LẦN trong thư mục gốc dự án (cạnh quan_ly.py):  python patch_key.py
Làm 3 việc trên file THẬT của bạn (có tạo file .bak, chạy lại không bị chèn trùng):
  1. src/app/layout.tsx              -> thêm nút giỏ hàng <CartButton /> ở header
  2. src/app/game/[slug]/page.tsx    -> thêm nút <BuyKeyButton /> cạnh nút Yêu thích
  3. quan_ly.py                      -> thêm CMD 7 > [7] Key game + dọn key khi xóa game
"""
import shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

KEY_CODE = r'''# --- [7] key game: giá key, phí, mật khẩu ZIP (bảng Supabase game_keys, có hiệu lực ngay, không cần đẩy Vercel) --- key-ui v2
_KEY_COLOR = sys.stdout.isatty() and not os.environ.get("NO_COLOR")
if _KEY_COLOR and os.name == "nt": os.system("")   # bật màu ANSI cho cmd Windows 10+

def _c(code, s): return f"\033[{code}m{s}\033[0m" if _KEY_COLOR else s
def _vnd(n): return f"{int(n):,}".replace(",", ".") + "đ"
def _cut(s, n): return s if len(s) <= n else s[:n - 1] + "…"
def _pad(s, n): return s.ljust(n)
def _box(lines, color="36"):
    w = max(len(l) for l in lines) + 2
    print(_c(color, "  ╭" + "─" * w + "╮"))
    for l in lines: print(_c(color, "  │") + " " + l.ljust(w - 1) + _c(color, "│"))
    print(_c(color, "  ╰" + "─" * w + "╯"))

def drop_keys(slugs):
    """Game bị xóa thì xóa luôn key của nó trên Supabase (web cũng tự bỏ qua key của game không còn)."""
    if not slugs or not ENV_FILE.exists(): return
    try:
        sb_call("DELETE", "/rest/v1/game_keys?slug=in.(" + ",".join(quote(x, safe="-") for x in slugs) + ")", prefer="return=minimal")
    except Exception as e:
        print(f"  ! Chưa xóa được key trên Supabase ({e}). Không ảnh hưởng web.")

def _key_rows():
    return {r["slug"]: r for r in sb_call("GET", "/rest/v1/game_keys?select=slug,price,fee,password,enabled") or []}

def _key_stats():
    # Thông báo nhanh: đơn key đã thu / đang chờ. Lỗi mạng thì bỏ qua, không chặn việc sửa giá.
    try:
        utc = datetime.timezone.utc
        now = datetime.datetime.now(utc)
        since = (now - datetime.timedelta(days=7)).isoformat()
        paid = sb_call("GET", "/rest/v1/orders?select=amount,paid_at&kind=eq.key&status=eq.paid&paid_at=gte." + quote(since) + "&order=paid_at.desc&limit=1000") or []
        wait = sb_call("GET", "/rest/v1/orders?select=id&kind=eq.key&status=eq.pending&expires_at=gt." + quote(now.isoformat()) + "&limit=1000") or []
        def local_day(o):
            return datetime.datetime.fromisoformat(str(o["paid_at"]).replace("Z", "+00:00")).astimezone().date()
        today = [o for o in paid if o.get("paid_at") and local_day(o) == datetime.datetime.now().date()]
        return len(today), sum(o["amount"] for o in today), len(paid), sum(o["amount"] for o in paid), len(wait)
    except Exception:
        return None

def _key_state(r):
    if not r: return "○", "chưa đặt", "90"
    if not r["enabled"]: return "◌", "đang TẮT", "33"
    if not r["password"]: return "⚠", "thiếu mật khẩu", "31"
    if r["price"] + r["fee"] <= 0: return "⚠", "giá = 0", "31"
    return "●", "đang BÁN", "32"

def _key_show(games, rows):
    st = _key_stats()
    head = [_c("1;36", "KEY GAME") + "  ·  giá + phí + mật khẩu ZIP, có hiệu lực ngay trên web"]
    if st:
        head.append(f"Hôm nay: {_c('1;32', str(st[0]) + ' đơn')} / {_c('1;32', _vnd(st[1]))}   ·   7 ngày: {st[2]} đơn / {_vnd(st[3])}   ·   đang chờ thanh toán: {st[4]}")
    print(); _box(head)
    print("\n  " + _c("90", f"{'#':>3}  {_pad('Game', 28)} {'Giá':>10} {'Phí':>8} {'Khách trả':>11}  {_pad('Trạng thái', 18)} Mật khẩu"))
    print("  " + _c("90", "─" * 102))
    n_ok = n_bad = 0
    for i, g in enumerate(games, 1):
        r = rows.get(g["slug"]); icon, label, col = _key_state(r)
        n_ok += icon == "●"; n_bad += icon == "⚠"
        if r:
            line = f"{i:>3}  {_pad(_cut(g['title'], 28), 28)} {_vnd(r['price']):>10} {_vnd(r['fee']):>8} {_c('1', _vnd(r['price'] + r['fee']).rjust(11))}  "
            print("  " + line + _c(col, _pad(f"{icon} {label}", 18)) + " " + (r["password"] or _c("31", "(trống)")))
        else:
            print("  " + _c("90", f"{i:>3}  {_pad(_cut(g['title'], 28), 28)} {'–':>10} {'–':>8} {'–':>11}  {_pad(f'{icon} {label}', 18)}"))
    print("  " + _c("90", "─" * 102))
    bad_txt = _c("31", f"⚠ {n_bad} cần sửa") if n_bad else _c("90", "⚠ 0 cần sửa")
    print(f"  {_c('32', f'● {n_ok} đang bán')}   {bad_txt}   {_c('90', f'○ {len(games) - len(rows)} chưa đặt')}")
    print(_c("90", "  Khách trả = giá key + phí (+ vài đồng lẻ tự sinh để nhận diện đơn).") + "\n")

def _key_int(label, cur):
    while True:
        s = input(f"  {label} [{_vnd(cur)}] (Enter = giữ): ").strip().lower().replace(".", "").replace(",", "").rstrip("đd")
        if not s: return cur
        if s.isdigit() and int(s) <= 5_000_000: return int(s)
        print(_c("31", "  ✗ Nhập số nguyên từ 0 đến 5.000.000 (vd: 20000 hoặc 20.000)."))

def _key_save(slug, r):
    sb_call("POST", "/rest/v1/game_keys?on_conflict=slug",
            {"slug": slug, "price": r["price"], "fee": r["fee"], "password": r["password"], "enabled": r["enabled"], "updated_at": _now().isoformat()},
            prefer="resolution=merge-duplicates,return=minimal")

def do_keys():
    while True:
        games = load()
        if not games: print("  Chưa có game nào."); return
        rows = _key_rows()
        _key_show(games, rows)
        ni = ask_nums("  Số game cần sửa (vd: 1 | 2-4 | all; Enter = xong): ", len(games))
        if not ni: return
        picked = [games[i - 1] for i in ni]
        base = rows.get(picked[0]["slug"], {"price": 0, "fee": 0, "password": "", "enabled": True})
        print("\n  " + _c("1;36", "Đang sửa: ") + ", ".join(_cut(g["title"], 30) for g in picked))
        if len(picked) > 1: print(_c("90", "  (nhiều game: giá/phí đặt chung; mật khẩu chỉ hỏi game nào chưa có)"))
        price = _key_int("Giá key", base["price"])
        fee = _key_int("Phí    ", base["fee"])
        if price + fee > 5_000_000: print(_c("33", "  ! Tổng giá + phí vượt 5.000.000đ: web sẽ từ chối tạo đơn. Nhập lại.")); continue
        enabled = base["enabled"]
        if input(f"  Đang {_c('32', 'BẬT') if enabled else _c('33', 'TẮT')} bán. Đổi trạng thái? (y/N): ").strip().lower() == "y": enabled = not enabled
        done = []
        for g in picked:
            r = dict(rows.get(g["slug"], {"password": ""}), price=price, fee=fee, enabled=enabled)
            if len(picked) == 1 or not r["password"]:
                pw = input(f"  Mật khẩu ZIP của '{_cut(g['title'], 30)}' [{r['password'] or 'trống'}] (Enter = giữ): ").strip()
                if pw: r["password"] = pw
            _key_save(g["slug"], r); done.append((g, r))
        print()
        lines = [_c("1;32", f"✓ Đã lưu {len(done)} game") + _c("90", "  (có hiệu lực ngay, không cần đẩy Vercel)")]
        for g, r in done:
            icon, label, col = _key_state(r)
            lines.append(f"{_c(col, icon)} {_cut(g['title'], 26).ljust(26)} {_vnd(r['price'])} + {_vnd(r['fee'])} = {_c('1', _vnd(r['price'] + r['fee']))}  {_c(col, label)}")
        _box(lines, "32" if all(_key_state(r)[0] == "●" for _, r in done) else "33")
        bad = [g["title"] for g, r in done if not r["password"]]
        if bad: print(_c("33", f"  ! Chưa có mật khẩu: {', '.join(_cut(t, 24) for t in bad)}. Web CHƯA bán key này cho tới khi bạn đặt."))
        input(_c("90", "  Enter để quay lại danh sách… "))


'''

# (đã có rồi thì bỏ qua | đoạn cũ | đoạn mới)
EDITS = {
    "src/app/layout.tsx": [
        ("CartButton", 'import NotificationBell from "@/components/NotificationBell";\n',
         'import NotificationBell from "@/components/NotificationBell";\nimport CartButton from "@/components/CartButton";\n'),
        ("<CartButton />", "<NotificationBell notice={notice} items={latest} />",
         "<CartButton />\n              <NotificationBell notice={notice} items={latest} />"),
    ],
    "src/app/game/[slug]/page.tsx": [
        ("BuyKeyButton", 'import FavoriteButton from "@/components/FavoriteButton";\n',
         'import FavoriteButton from "@/components/FavoriteButton";\nimport BuyKeyButton from "@/components/BuyKeyButton";\n'),
        ("<BuyKeyButton slug", '<FavoriteButton slug={game.slug} variant="pill" />',
         '<FavoriteButton slug={game.slug} variant="pill" />\n            <BuyKeyButton slug={game.slug} />'),
    ],
    "quan_ly.py": [
        ("def do_keys", "# --- menu cmd 7 ---", KEY_CODE + "# --- menu cmd 7 ---"),
        ("[7] Key game", '\n [0] Quay lại"""',
         '\n [7] Key game (giá key, phí, mật khẩu ZIP, bật/tắt bán)                   -> có hiệu lực ngay\n [0] Quay lại"""'),
        ('"7": do_keys', '"5": do_errors}', '"5": do_errors, "7": do_keys}'),
        ("drop_keys(gone)", "    drop_favorites(gone)\n    return True", "    drop_favorites(gone)\n    drop_keys(gone)\n    return True"),
    ],
}


def main():
    failed = 0
    for rel, edits in EDITS.items():
        p = ROOT / rel
        if not p.is_file():
            print(f"✗ Không thấy {rel} (chạy script trong thư mục gốc dự án)"); failed += 1; continue
        with open(p, encoding="utf-8", newline="") as f: text = f.read()
        eol = "\r\n" if "\r\n" in text else "\n"
        upgraded = False
        if rel == "quan_ly.py" and "def do_keys" in text and "key-ui v2" not in text and "# --- [7] key game" in text and "# --- menu cmd 7 ---" in text:
            i, j = text.index("# --- [7] key game"), text.index("# --- menu cmd 7 ---")
            text = text[:i] + KEY_CODE.replace("\n", eol) + text[j:]   # nâng cấp bản key cũ lên giao diện mới
            upgraded = True
        todo = []
        for marker, old, new in edits:
            if marker in text: print(f"  = {rel}: đã có '{marker}', bỏ qua"); continue
            old, new = old.replace("\n", eol), new.replace("\n", eol)
            if old not in text: print(f"✗ {rel}: không tìm thấy đoạn cần sửa:\n    {old.strip()[:80]!r}"); failed += 1; continue
            todo.append((old, new))
        if not todo and not upgraded: continue
        bak = p.with_name(p.name + ".bak")
        if not bak.exists(): shutil.copy2(p, bak)
        for old, new in todo: text = text.replace(old, new, 1)
        with open(p, "w", encoding="utf-8", newline="") as f: f.write(text)
        print(f"✓ {rel}: đã sửa {len(todo)} chỗ{' + nâng cấp giao diện key' if upgraded else ''} (bản gốc: {bak.name})")
    print("\nXong." if not failed else f"\n{failed} chỗ không sửa được: file của bạn khác bản mình thấy, gửi mình file đó.")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
