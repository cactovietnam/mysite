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

KEY_CODE = r'''# --- [7] key game: giá key, phí, mật khẩu ZIP (bảng Supabase game_keys, có hiệu lực ngay, không cần đẩy Vercel) ---
def _vnd(n): return f"{int(n):,}".replace(",", ".") + "đ"

def drop_keys(slugs):
    """Game bị xóa thì xóa luôn key của nó trên Supabase (web cũng tự bỏ qua key của game không còn)."""
    if not slugs or not ENV_FILE.exists(): return
    try:
        sb_call("DELETE", "/rest/v1/game_keys?slug=in.(" + ",".join(quote(x, safe="-") for x in slugs) + ")", prefer="return=minimal")
    except Exception as e:
        print(f"  ! Chưa xóa được key trên Supabase ({e}). Không ảnh hưởng web.")

def _key_rows():
    return {r["slug"]: r for r in sb_call("GET", "/rest/v1/game_keys?select=slug,price,fee,password,enabled") or []}

def _key_show(games, rows):
    print("\n  Game | giá key | phí | trạng thái | mật khẩu")
    for i, g in enumerate(games, 1):
        r = rows.get(g["slug"])
        if not r: print(f"  {i:>2}. {g['title']}  [chưa đặt key]"); continue
        ok = r["enabled"] and r["password"] and r["price"] + r["fee"] > 0
        state = "BÁN" if ok else ("TẮT" if not r["enabled"] else "CHƯA BÁN (thiếu mật khẩu hoặc giá 0)")
        print(f"  {i:>2}. {g['title']}  | {_vnd(r['price'])} | {_vnd(r['fee'])} | {state} | {r['password'] or '(trống)'}")

def _key_int(label, cur):
    while True:
        s = input(f"  {label} [{cur}] (Enter = giữ): ").strip().replace(".", "").replace(",", "")
        if not s: return cur
        if s.isdigit() and int(s) <= 5_000_000: return int(s)
        print("  ! Nhập số nguyên 0-5.000.000.")

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
        print("\n  Khách trả = giá key + phí (+ vài đồng lẻ tự sinh để nhận diện đơn). Nhiều game cùng lúc thì đặt chung giá/phí.")
        ni = ask_nums("  Số game cần sửa (vd: 1 | 2-4 | all; Enter = xong): ", len(games))
        if not ni: return
        picked = [games[i - 1] for i in ni]
        base = rows.get(picked[0]["slug"], {"price": 0, "fee": 0, "password": "", "enabled": True})
        print(f"\n  Đang sửa: {', '.join(g['title'] for g in picked)}")
        price = _key_int("Giá key (đ)", base["price"])
        fee = _key_int("Phí (đ, cộng thêm vào giá)", base["fee"])
        enabled = base["enabled"]
        if input(f"  Đang {'BẬT' if enabled else 'TẮT'} bán. Đổi trạng thái? (y/N): ").strip().lower() == "y": enabled = not enabled
        for g in picked:
            r = dict(rows.get(g["slug"], {"password": ""}), price=price, fee=fee, enabled=enabled)
            if len(picked) == 1 or not r["password"]:
                pw = input(f"  Mật khẩu ZIP của '{g['title']}' [{r['password'] or 'trống'}] (Enter = giữ): ").strip()
                if pw: r["password"] = pw
            if not r["password"]: print(f"  ! '{g['title']}' chưa có mật khẩu: web CHƯA bán key này cho tới khi bạn đặt.")
            _key_save(g["slug"], r)
        print("  ✓ Đã lưu (có hiệu lực ngay trên web).")


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
        todo = []
        for marker, old, new in edits:
            if marker in text: print(f"  = {rel}: đã có '{marker}', bỏ qua"); continue
            old, new = old.replace("\n", eol), new.replace("\n", eol)
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
