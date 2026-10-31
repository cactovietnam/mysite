# -*- coding: utf-8 -*-
"""MySite - Giao diện BẢNG cho quan_ly.py (dùng chung dữ liệu, không thay thế bản CMD).

Cách dùng: đặt file này CẠNH quan_ly.py (thư mục mysite) rồi chạy:   python quan_ly_gui.py
- Bảng game: tìm kiếm, lọc engine/trạng thái, bấm tiêu đề cột để sắp xếp.
- Thêm / sửa / xóa game ngay trong cửa sổ. Kiểm tra lỗi + Đẩy lên Vercel có khung log.
- Ảnh chính + ảnh bổ sung (nén WebP, đóng dấu logo) và nội dung nhiều khổ sửa ngay trong cửa sổ.
- Nút "Key game": bảng giá key / phí / mật khẩu ZIP / bật-tắt bán (Supabase, cần .env.local).
- Nút "Voucher": tạo mã giảm giá (nhập mã bất kỳ hoặc tự sinh hàng loạt, số lượt bất kỳ, mặc định 1), đổi lượt, bật/tắt, xóa.
- Nút "Cài đặt web & tài khoản": đủ 8 mục của CMD 7 (chữ/link web, báo lỗi Discord, khóa đăng nhập, tài khoản, lỗi hệ thống,
  Donate, Key game, Voucher). Mục 1-6 chạy NGUYÊN BẢN logic của quan_ly.py: menu / danh sách số thành nút bấm, câu hỏi thành ô nhập.
"""
import builtins, contextlib, ctypes, datetime, os, queue, re, shutil, subprocess, sys, threading, unicodedata
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, simpledialog, ttk

import quan_ly as q

# ---------- giao diện ----------
BG, PANEL, CARD = "#0c111d", "#121a2b", "#1a2540"
ROW_A, ROW_B, LINE = "#121a2b", "#162036", "#2a3a5e"
TEXT, MUTED = "#e6ecf8", "#8a9bb8"
ACCENT, ACCENT_H = "#5b8cff", "#7aa2ff"
OK, WARN, BAD = "#34d399", "#fbbf24", "#f87171"
SEL = "#25427c"
FONT, FONT_B, FONT_S = ("Segoe UI", 11), ("Segoe UI", 11, "bold"), ("Segoe UI", 10)
MONO = ("Consolas", 11)

# (id, tiêu đề, độ rộng, căn lề, giãn theo cửa sổ)
COLS = [
    ("title", "Tên game", 340, "w", True),
    ("engine", "Engine", 90, "center", False),
    ("version", "Phiên bản", 90, "center", False),
    ("size", "Dung lượng", 95, "e", False),
    ("cover", "Bìa", 56, "center", False),
    ("imgs", "Ảnh phụ", 80, "center", False),
    ("links", "Link", 56, "center", False),
    ("tags", "Tag", 250, "w", True),
    ("date", "Cập nhật", 100, "center", False),
    ("status", "Trạng thái", 120, "w", False),
]
STATUS_FILTERS = ["Tất cả", "Đủ", "Thiếu bìa", "Thiếu link", "Thiếu intro"]


# ---------- hàm thuần (không đụng giao diện) ----------
def fold(t):
    """Bỏ dấu + hạ chữ thường để tìm kiếm tiếng Việt không cần gõ dấu."""
    t = unicodedata.normalize("NFD", str(t).lower().replace("đ", "d"))
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def status_of(g):
    if not g["cover"]: return "Thiếu bìa", "bad"
    if not g["links"]: return "Thiếu link", "warn"
    if not g["intro"]: return "Thiếu intro", "warn"
    return "Đủ", "ok"


def row_values(g):
    st, _ = status_of(g)
    tags = ", ".join(g["tags"][:4]) + (f" +{len(g['tags']) - 4}" if len(g["tags"]) > 4 else "")
    return (g["title"], g["engine"], g["version"], f"{g['sizeGB']:g} GB",
            "✓" if g["cover"] else "✗", f"{len(g['images'])}/{q.MAX_EXTRA}", len(g["links"]),
            tags, g.get("updatedAt", ""), "● " + st)


def sort_key(col, g):
    if col == "title": return fold(g["title"])
    if col == "engine": return fold(g["engine"])
    if col == "version": return [int(x) if x.isdigit() else 0 for x in str(g["version"]).replace("-", ".").split(".")]
    if col == "size": return float(g.get("sizeGB") or 0)
    if col == "cover": return bool(g["cover"])
    if col == "imgs": return len(g["images"])
    if col == "links": return len(g["links"])
    if col == "tags": return fold(", ".join(g["tags"]))
    if col == "date": return g.get("updatedAt", "")
    return status_of(g)[0]


def parse_links(text):
    out = []
    for line in text.splitlines():
        line = line.strip()
        if not line: continue
        label, _, url = line.rpartition("|") if "|" in line else ("", "", line)
        url = url.strip()
        if url: out.append({"label": label.strip(), "url": q.norm_url(url)})
    return out


def parse_tags(text):
    seen, out = set(), []
    for t in text.replace(";", ",").split(","):
        t = t.strip()
        if t and fold(t) not in seen:
            seen.add(fold(t)); out.append(t)
    return out


def open_path(p):
    if os.name == "nt": os.startfile(p)
    else: subprocess.Popen(["open" if sys.platform == "darwin" else "xdg-open", str(p)])


class _Out:
    """Hứng print() của quan_ly.py để đưa vào khung log."""
    def __init__(self, qu): self.q = qu
    def write(self, t): self.q.put(t); return len(t)
    def flush(self): pass


# ---------- widget nhỏ ----------
def button(parent, text, cmd, kind="ghost"):
    bg, hv, fg, edge = {"primary": (ACCENT, ACCENT_H, "#fff", ACCENT), "danger": ("#2a1519", "#7f1d1d", "#fca5a5", "#7f1d1d"),
                        "ghost": (CARD, LINE, TEXT, LINE)}[kind]
    b = tk.Button(parent, text=text, command=cmd, bg=bg, fg=fg, activebackground=hv, activeforeground="#fff",
                  relief="flat", bd=0, padx=18, pady=9, font=FONT_B if kind == "primary" else FONT, cursor="hand2",
                  highlightthickness=1, highlightbackground=edge, highlightcolor=edge, disabledforeground=MUTED)
    b.bind("<Enter>", lambda e: b.cget("state") != "disabled" and b.config(bg=hv)); b.bind("<Leave>", lambda e: b.config(bg=bg))
    return b


def entry(parent, var=None, width=None):
    return tk.Entry(parent, textvariable=var, width=width, bg=CARD, fg=TEXT, insertbackground=TEXT, relief="flat",
                    font=FONT, highlightthickness=1, highlightbackground=LINE, highlightcolor=ACCENT)


def textbox(parent, height):
    return tk.Text(parent, height=height, bg=CARD, fg=TEXT, insertbackground=TEXT, relief="flat", font=FONT,
                   wrap="word", highlightthickness=1, highlightbackground=LINE, highlightcolor=ACCENT, padx=10, pady=8)


# ---------- hộp thoại thêm / sửa ----------
class GameDialog(tk.Toplevel):
    def __init__(self, app, game=None):
        super().__init__(app, bg=PANEL)
        self.app, self.g = app, game
        self.title("Sửa game" if game else "Thêm game mới")
        self.transient(app); self.resizable(False, False)
        g = game or {"title": "", "engine": "Unity", "version": "1.0.0", "sizeGB": 0, "tags": [], "intro": "",
                     "links": [], "content": [], "contentFold": 0, "updatedAt": datetime.date.today().isoformat()}
        self.old_version, self.old_date = g["version"], g["updatedAt"]
        body = tk.Frame(self, bg=PANEL, padx=34, pady=28); body.pack()
        tk.Label(body, text=self.title(), bg=PANEL, fg=TEXT, font=("Segoe UI", 16, "bold")).grid(
            row=0, column=0, columnspan=2, sticky="w", pady=(0, 12))
        left = tk.Frame(body, bg=PANEL); left.grid(row=1, column=0, sticky="n")
        right = tk.Frame(body, bg=PANEL); right.grid(row=1, column=1, sticky="n", padx=(40, 0))
        left.columnconfigure(1, weight=1)

        self.v = {k: tk.StringVar(value=str(val)) for k, val in {
            "title": g["title"], "engine": g["engine"], "version": g["version"], "size": f"{g['sizeGB']:g}",
            "date": g["updatedAt"], "tags": ", ".join(g["tags"])}.items()}
        rows = [("Tên game *", "title"), ("Engine", "engine"), ("Phiên bản", "version"),
                ("Dung lượng (GB)", "size"), ("Ngày cập nhật", "date"), ("Tag (dấu phẩy)", "tags")]
        self.first = None
        for i, (label, key) in enumerate(rows):
            tk.Label(left, text=label, bg=PANEL, fg=MUTED, font=FONT_S).grid(row=i, column=0, sticky="w", pady=8, padx=(0, 18))
            if key == "engine":
                w = ttk.Combobox(left, textvariable=self.v[key], values=list(q.load_site()["engines"]), width=46)
            else:
                w = entry(left, self.v[key], 48)
            w.grid(row=i, column=1, sticky="ew", pady=8, ipady=7)
            self.first = self.first or w
        tk.Label(left, text="Giới thiệu ngắn", bg=PANEL, fg=MUTED, font=FONT_S).grid(row=6, column=0, sticky="nw", pady=5)
        self.intro = textbox(left, 5); self.intro.config(width=48); self.intro.grid(row=6, column=1, sticky="ew", pady=8)
        self.intro.insert("1.0", g["intro"])
        tk.Label(left, text="Link tải\n(Tên | link)", bg=PANEL, fg=MUTED, font=FONT_S, justify="left").grid(row=7, column=0, sticky="nw", pady=5)
        self.links = textbox(left, 7); self.links.config(width=48); self.links.grid(row=7, column=1, sticky="ew", pady=8)
        self.links.insert("1.0", "\n".join((f"{l['label']} | " if l["label"] else "") + l["url"] for l in g["links"]))

        tk.Label(right, text="Nội dung game: mỗi dòng = 1 khổ", bg=PANEL, fg=MUTED, font=FONT_S).pack(anchor="w", pady=(5, 5))
        self.content = textbox(right, 21); self.content.config(width=64); self.content.pack(fill="x")
        self.content.insert("1.0", "\n".join(g["content"]))
        fr = tk.Frame(right, bg=PANEL); fr.pack(fill="x", pady=(10, 0))
        self.v_fold = tk.StringVar(value=str(g["contentFold"]))
        tk.Label(fr, text="Hiện sẵn", bg=PANEL, fg=MUTED, font=FONT_S).pack(side="left")
        tk.Spinbox(fr, from_=0, to=99, width=4, textvariable=self.v_fold, bg=CARD, fg=TEXT, buttonbackground=LINE,
                   insertbackground=TEXT, relief="flat", font=FONT, highlightthickness=1,
                   highlightbackground=LINE, highlightcolor=ACCENT).pack(side="left", padx=8, ipady=5)
        tk.Label(fr, text="khổ đầu, còn lại ẩn sau nút \"Xem thêm\" (0 = hiện hết)", bg=PANEL, fg=MUTED, font=FONT_S).pack(side="left")

        bar = tk.Frame(body, bg=PANEL); bar.grid(row=2, column=0, columnspan=2, sticky="ew", pady=(24, 0))
        if game: button(bar, "🖼  Quản lý ảnh…", self.open_images).pack(side="left")
        else: tk.Label(bar, text="Lưu xong sẽ mở bước chọn ảnh.", bg=PANEL, fg=MUTED, font=FONT_S).pack(side="left")
        button(bar, "Lưu", self.save, "primary").pack(side="right")
        button(bar, "Hủy", self.destroy).pack(side="right", padx=(0, 8))
        self.bind("<Escape>", lambda e: self.destroy()); self.bind("<Control-Return>", lambda e: self.save())
        self.update_idletasks()
        self.geometry(f"+{max(0, app.winfo_x() + (app.winfo_width() - self.winfo_width()) // 2)}+{app.winfo_y() + 40}")
        self.grab_set(); self.first.focus_set()

    def open_images(self):
        d = ImagesDialog(self.app, self.g["slug"]); self.wait_window(d); self.grab_set()

    def save(self):
        title = self.v["title"].get().strip()
        if not title: return messagebox.showwarning("Thiếu tên", "Tên game không được để trống.", parent=self)
        try: size = round(float(self.v["size"].get().replace(",", ".") or 0), 2)
        except ValueError: return messagebox.showwarning("Dung lượng", "Nhập số, ví dụ 3.8", parent=self)
        date = self.v["date"].get().strip()
        try: datetime.date.fromisoformat(date)
        except ValueError: return messagebox.showwarning("Ngày", "Sai định dạng, ví dụ 2026-10-13", parent=self)
        try: fold = int(self.v_fold.get() or 0)
        except ValueError: return messagebox.showwarning("Xem thêm", "Số khổ hiện sẵn phải là số nguyên.", parent=self)
        content = [l.strip() for l in self.content.get("1.0", "end").splitlines() if l.strip()]
        if not 0 < fold < len(content): fold = 0
        version = self.v["version"].get().strip() or "1.0.0"
        if self.g and version != self.old_version and date == self.old_date:   # đổi phiên bản mà không đổi ngày -> hôm nay
            date = datetime.date.today().isoformat()
        engine = self.v["engine"].get().strip() or "Unity"
        fields = {"title": title, "engine": engine, "version": version, "sizeGB": size, "updatedAt": date,
                  "tags": parse_tags(self.v["tags"].get()), "intro": self.intro.get("1.0", "end").strip(),
                  "content": content, "contentFold": fold, "links": parse_links(self.links.get("1.0", "end"))}
        try:
            games = q.load()
            site = q.load_site()
            if engine not in site["engines"]:   # engine mới: lưu kèm màu như bản CMD
                site["engines"][engine] = q.auto_color(engine); q.write_json(q.SITE, site)
            if self.g:
                g = next((x for x in games if x["slug"] == self.g["slug"]), None)
                if g is None: return messagebox.showerror("Lỗi", "Game này không còn trong games.json.", parent=self)
                g.update(fields)
            else:
                g = {"slug": q.unique_slug(q.slugify(title), games), "cover": "", "images": [], **fields}
                games.append(g)
            q.save(games)
            if not self.g: q.queue_announce(g["slug"])
        except SystemExit as e:
            return messagebox.showerror("Lỗi dữ liệu", str(e), parent=self)
        slug, is_new = g["slug"], not self.g
        self.destroy(); self.app.reload(select=slug)
        if is_new: ImagesDialog(self.app, slug)


# ---------- hộp thoại quản lý ảnh ----------
IMG_TYPES = [("Ảnh", "*.jpg *.jpeg *.png *.webp *.gif *.bmp *.avif *.jfif *.tif *.tiff"), ("Tất cả", "*.*")]


class ImagesDialog(tk.Toplevel):
    """Ảnh chính (bìa + nền) và tối đa 10 ảnh bổ sung. Dùng đúng hàm xử lý của quan_ly.py: nén WebP, đóng dấu logo, lưu ảnh gốc."""
    def __init__(self, app, slug):
        super().__init__(app, bg=PANEL)
        self.app, self.slug, self.busy, self.result, self.photo, self.items = app, slug, False, None, None, []
        self.title("Quản lý ảnh"); self.transient(app); self.resizable(False, False)
        self.protocol("WM_DELETE_WINDOW", self.close); self.bind("<Escape>", lambda e: self.close())
        body = tk.Frame(self, bg=PANEL, padx=34, pady=28); body.pack()
        self.head = tk.Label(body, text="", bg=PANEL, fg=TEXT, font=("Segoe UI", 16, "bold")); self.head.grid(row=0, column=0, columnspan=2, sticky="w")
        self.sub = tk.Label(body, text="", bg=PANEL, fg=MUTED, font=FONT_S); self.sub.grid(row=1, column=0, columnspan=2, sticky="w", pady=(2, 10))
        if q.Image is None:
            tk.Label(body, text="Chưa cài Pillow: ảnh sẽ không được nén / đóng dấu logo. Cài bằng:  pip install pillow",
                     bg=PANEL, fg=WARN, font=FONT_S).grid(row=2, column=0, columnspan=2, sticky="w", pady=(0, 8))
        self.lb = tk.Listbox(body, width=50, height=16, bg=CARD, fg=TEXT, selectbackground=ACCENT, selectforeground="#fff",
                             relief="flat", font=FONT, highlightthickness=1, highlightbackground=LINE, activestyle="none",
                             exportselection=False, selectmode="extended")
        self.lb.grid(row=3, column=0, sticky="n"); self.lb.bind("<<ListboxSelect>>", self.preview)
        self.prev = tk.Label(body, text="", bg=CARD, fg=MUTED, font=FONT_S, width=70, height=20)
        self.prev.grid(row=3, column=1, sticky="n", padx=(16, 0))
        bar = tk.Frame(body, bg=PANEL); bar.grid(row=4, column=0, columnspan=2, sticky="ew", pady=(14, 0))
        button(bar, "★ Chọn ảnh chính…", self.pick_cover, "primary").pack(side="left")
        button(bar, "＋ Thêm ảnh bổ sung…", self.pick_extra).pack(side="left", padx=8)
        button(bar, "Đặt làm ảnh chính", self.make_cover).pack(side="left")
        button(bar, "Xóa ảnh", self.delete, "danger").pack(side="left", padx=8)
        button(bar, "Đóng", self.close).pack(side="right")
        self.status = tk.Label(body, text="", bg=PANEL, fg=MUTED, font=FONT_S, anchor="w")
        self.status.grid(row=5, column=0, columnspan=2, sticky="w", pady=(10, 0))
        self.refresh()
        self.update_idletasks()
        self.geometry(f"+{max(0, app.winfo_x() + (app.winfo_width() - self.winfo_width()) // 2)}+{app.winfo_y() + 40}")
        self.grab_set()

    def game(self):
        games = q.load()
        return games, next((x for x in games if x["slug"] == self.slug), None)

    def refresh(self):
        try: _, g = self.game()
        except SystemExit as e: messagebox.showerror("Lỗi dữ liệu", str(e), parent=self); return self.destroy()
        if g is None: return self.destroy()
        self.items = ([g["cover"]] if g["cover"] else []) + list(g["images"])
        self.lb.delete(0, "end")
        for n, u in enumerate(self.items):
            self.lb.insert("end", ("★ Ảnh chính   " if n == 0 and g["cover"] else f"   Ảnh phụ {n if g['cover'] else n + 1}   ") + Path(u).name)
        self.head.config(text=g["title"])
        self.sub.config(text=f"Ảnh chính: {'có' if g['cover'] else 'chưa có'}   •   Ảnh bổ sung: {len(g['images'])}/{q.MAX_EXTRA}")
        self.prev.config(image="", text="Chọn một ảnh bên trái để xem trước" if self.items else "Chưa có ảnh nào")
        self.photo = None

    def preview(self, e=None):
        sel = self.lb.curselection()
        if not sel or q.Image is None: return
        try:
            from PIL import ImageTk
            with q.Image.open(q.PUBLIC / self.items[sel[0]].lstrip("/")) as im:
                im.load(); im = im.convert("RGBA"); im.thumbnail((560, 360))
            self.photo = ImageTk.PhotoImage(im); self.prev.config(image=self.photo, text="")
        except Exception:
            self.prev.config(image="", text="(Không xem trước được ảnh này)")

    def start_dir(self): return str(q.INBOX) if q.INBOX.exists() else str(Path.home())

    def pick_cover(self):
        if self.busy: return
        f = filedialog.askopenfilename(parent=self, title="Chọn ảnh chính", initialdir=self.start_dir(), filetypes=IMG_TYPES)
        if f: self.process([Path(f)], cover=True)

    def pick_extra(self):
        if self.busy: return
        _, g = self.game(); room = q.MAX_EXTRA - len(g["images"])
        if room <= 0: return messagebox.showinfo("Đã đủ", f"Đã đủ {q.MAX_EXTRA} ảnh bổ sung. Xóa bớt ảnh cũ để thêm.", parent=self)
        fs = filedialog.askopenfilenames(parent=self, title=f"Chọn ảnh bổ sung (còn {room} chỗ)", initialdir=self.start_dir(), filetypes=IMG_TYPES)
        if not fs: return
        if len(fs) > room: messagebox.showinfo("Quá nhiều ảnh", f"Chỉ còn {room} chỗ, lấy {room} ảnh đầu.", parent=self)
        self.process([Path(x) for x in fs][:room], cover=False)

    def process(self, files, cover):
        self.busy, self.result = True, None
        self.status.config(text=f"Đang xử lý {len(files)} ảnh (nén WebP + đóng dấu logo)…", fg=ACCENT_H)
        def work():
            errors, done = [], []
            try:
                games, g = self.game()
                if cover:
                    f = files[0]
                    try:
                        url = q.store(g, f, q.COVER_W); old = g["cover"]; g["cover"] = url
                        q.compute_visuals(g); q.make_thumb(g)
                        g["images"] = [u for u in g["images"] if u != url]
                        if old and old != url and old not in g["images"]: q.remove_file(old)
                        done.append(f)
                    except Exception as e: errors.append(f"{f.name}: {e}")
                else:
                    urls = []
                    for f in files:
                        try: urls.append(q.store(g, f, q.EXTRA_W)); done.append(f)
                        except Exception as e: errors.append(f"{f.name}: {e}")
                    for u in urls:
                        if u != g["cover"] and u not in g["images"]: g["images"].append(u)
                    g["images"] = g["images"][:q.MAX_EXTRA]
                if done:
                    q.save(games)
                    inbox = [f for f in done if f.resolve().parent == q.INBOX.resolve()]
                    if inbox: q.archive_files(inbox)   # ảnh lấy từ anh-moi/ thì dọn như bản CMD
            except Exception as e: errors.append(str(e))
            self.result = (len(done), errors)
        threading.Thread(target=work, daemon=True).start(); self.after(100, self.poll)

    def poll(self):
        if self.result is None: return self.after(100, self.poll)
        n, errors = self.result; self.busy = False; self.refresh()
        self.status.config(text=f"✓ Đã thêm {n} ảnh. Nhớ bấm \"Đẩy lên Vercel\" để ảnh hiện trên web." if n else "", fg=OK)
        if errors: messagebox.showwarning("Một số ảnh lỗi", "\n".join(errors[:8]), parent=self)

    def make_cover(self):
        sel = self.lb.curselection(); games, g = self.game()
        if self.busy or len(sel) != 1 or not g["images"]: return
        url = self.items[sel[0]]
        if url == g["cover"] or url not in g["images"]: return
        g["images"].remove(url)
        if g["cover"]: g["images"].insert(0, g["cover"])   # ảnh chính cũ xuống làm ảnh bổ sung
        g["cover"] = url; q.compute_visuals(g); q.make_thumb(g); q.save(games); self.refresh()

    def delete(self):
        sel = self.lb.curselection()
        if self.busy or not sel: return
        if not messagebox.askyesno("Xóa ảnh", f"Xóa {len(sel)} ảnh đã chọn?", parent=self): return
        games, g = self.game(); cover_changed = False
        for u in [self.items[i] for i in sel]:
            if u == g["cover"]: q.remove_file(u); g["cover"] = ""; cover_changed = True
            elif u in g["images"]: g["images"].remove(u); q.remove_file(u)
        if not g["cover"] and g["images"]: g["cover"] = g["images"].pop(0); cover_changed = True   # còn ảnh phụ thì ảnh đầu lên làm ảnh chính
        if cover_changed: q.compute_visuals(g); q.make_thumb(g)
        q.save(games); self.refresh()

    def close(self):
        if self.busy: return messagebox.showinfo("Đang xử lý", "Đợi xử lý ảnh xong rồi hãy đóng.", parent=self)
        self.destroy(); self.app.reload(select=self.slug)


# ---------- key game: giá key, phí, mật khẩu ZIP (Supabase, có hiệu lực ngay) ----------
KEY_TAG = {"●": "ok", "⚠": "bad", "◌": "off", "○": "none"}
NO_SB = ("Chưa kết nối được Supabase.\nCần file .env.local cạnh quan_ly.py có NEXT_PUBLIC_SUPABASE_URL và "
         "SUPABASE_SERVICE_ROLE_KEY, và git phải bỏ qua file đó (.gitignore).")


def run_bg(widget, fn, done):
    """Chạy fn ở luồng nền (gọi mạng), xong thì gọi done(kết quả, lỗi) ở luồng giao diện."""
    box = {}
    def work():
        try: box["res"] = fn()
        except (Exception, SystemExit) as e: box["err"] = str(e) or type(e).__name__
        box["end"] = True
    def poll():
        if "end" not in box: return widget.after(100, poll)
        try:
            if widget.winfo_exists(): done(box.get("res"), box.get("err"))
        except tk.TclError: pass
    threading.Thread(target=work, daemon=True).start(); widget.after(100, poll)


def parse_money(s):
    s = str(s).strip().lower().replace(".", "").replace(",", "").rstrip("đd ")
    if s == "": return 0
    if s.isdigit() and int(s) <= 5_000_000: return int(s)
    raise ValueError


class KeyDialog(tk.Toplevel):
    def __init__(self, win, picked, rows):
        super().__init__(win, bg=PANEL)
        self.win, self.picked, self.rows = win, picked, rows
        self.title("Sửa key"); self.transient(win); self.resizable(False, False)
        base = rows.get(picked[0]["slug"], {"price": 0, "fee": 0, "password": "", "enabled": True})
        body = tk.Frame(self, bg=PANEL, padx=34, pady=28); body.pack()
        names = ", ".join(g["title"] for g in picked[:3]) + (f" … (+{len(picked) - 3})" if len(picked) > 3 else "")
        tk.Label(body, text="Đặt giá key", bg=PANEL, fg=TEXT, font=("Segoe UI", 16, "bold")).grid(row=0, column=0, columnspan=2, sticky="w")
        tk.Label(body, text=names, bg=PANEL, fg=MUTED, font=FONT_S, wraplength=460, justify="left").grid(row=1, column=0, columnspan=2, sticky="w", pady=(2, 12))
        self.v_price, self.v_fee = tk.StringVar(value=str(base["price"])), tk.StringVar(value=str(base["fee"]))
        self.v_pw, self.v_on = tk.StringVar(value=base["password"] or ""), tk.BooleanVar(value=base["enabled"])
        pw_label = "Mật khẩu ZIP" if len(picked) == 1 else "Mật khẩu ZIP\n(chỉ game chưa có)"
        for i, (label, var) in enumerate([("Giá key (đ)", self.v_price), ("Phí (đ)", self.v_fee), (pw_label, self.v_pw)], 2):
            tk.Label(body, text=label, bg=PANEL, fg=MUTED, font=FONT_S, justify="left").grid(row=i, column=0, sticky="w", pady=8, padx=(0, 18))
            entry(body, var, 38).grid(row=i, column=1, sticky="ew", pady=8, ipady=7)
        if len(picked) > 1:
            self.v_pw.set("")
        tk.Checkbutton(body, text="Đang BẬT bán key này", variable=self.v_on, bg=PANEL, fg=TEXT, selectcolor=CARD,
                       activebackground=PANEL, activeforeground=TEXT, font=FONT).grid(row=5, column=1, sticky="w", pady=4)
        self.total = tk.Label(body, text="", bg=PANEL, fg=OK, font=FONT_B); self.total.grid(row=6, column=0, columnspan=2, sticky="w", pady=(8, 0))
        for v in (self.v_price, self.v_fee): v.trace_add("write", lambda *a: self.calc())
        self.calc()
        bar = tk.Frame(body, bg=PANEL); bar.grid(row=7, column=0, columnspan=2, sticky="e", pady=(16, 0))
        button(bar, "Hủy", self.destroy).pack(side="left", padx=(0, 8)); button(bar, "Lưu", self.save, "primary").pack(side="left")
        self.bind("<Escape>", lambda e: self.destroy()); self.bind("<Return>", lambda e: self.save())
        self.update_idletasks()
        self.geometry(f"+{win.winfo_x() + (win.winfo_width() - self.winfo_width()) // 2}+{win.winfo_y() + 90}")
        self.grab_set()

    def calc(self):
        try: t = parse_money(self.v_price.get()) + parse_money(self.v_fee.get()); self.total.config(text=f"Khách trả = {q._vnd(t)}  (+ vài đồng lẻ tự sinh để nhận diện đơn)", fg=OK if t <= 5_000_000 else BAD)
        except ValueError: self.total.config(text="Nhập số nguyên từ 0 đến 5.000.000", fg=BAD)

    def save(self):
        try: price, fee = parse_money(self.v_price.get()), parse_money(self.v_fee.get())
        except ValueError: return messagebox.showwarning("Sai số", "Nhập số nguyên từ 0 đến 5.000.000 (vd 20000 hoặc 20.000).", parent=self)
        if price + fee > 5_000_000: return messagebox.showwarning("Quá lớn", "Giá + phí vượt 5.000.000đ: web sẽ từ chối tạo đơn.", parent=self)
        pw, on, picked, rows = self.v_pw.get().strip(), self.v_on.get(), self.picked, self.rows
        def job():
            out = []
            for g in picked:
                r = dict(rows.get(g["slug"], {"password": ""}), price=price, fee=fee, enabled=on)
                if (len(picked) == 1 or not r["password"]) and pw: r["password"] = pw
                q._key_save(g["slug"], r); out.append((g, r))
            return out
        def done(res, err):
            if err: return messagebox.showerror("Lưu thất bại", err, parent=self)
            bad = [g["title"] for g, r in res if not r["password"]]
            win = self.win; self.destroy(); win.load()
            if bad: messagebox.showwarning("Thiếu mật khẩu", "Chưa có mật khẩu ZIP: " + ", ".join(bad[:5]) + "\nWeb CHƯA bán key này cho tới khi bạn đặt.", parent=win)
        self.config(cursor="watch"); run_bg(self, job, done)


class KeysWindow(tk.Toplevel):
    COLS = [("n", "#", 44, "center", False), ("title", "Game", 320, "w", True), ("price", "Giá", 100, "e", False),
            ("fee", "Phí", 90, "e", False), ("total", "Khách trả", 110, "e", False),
            ("state", "Trạng thái", 150, "w", False), ("pw", "Mật khẩu ZIP", 170, "w", True)]

    def __init__(self, app):
        super().__init__(app, bg=BG)
        self.app, self.games, self.rows, self.shown = app, [], {}, []
        self.title("Key game • giá, phí, mật khẩu ZIP"); self.geometry("1240x760"); self.minsize(960, 520)
        head = tk.Frame(self, bg=BG, padx=22, pady=16); head.pack(fill="x")
        left = tk.Frame(head, bg=BG); left.pack(side="left")
        tk.Label(left, text="Key game", bg=BG, fg=TEXT, font=("Segoe UI", 24, "bold")).pack(anchor="w")
        self.stat = tk.Label(left, text="Đang tải…", bg=BG, fg=MUTED, font=FONT_S); self.stat.pack(anchor="w")
        button(head, "Làm mới", self.load).pack(side="right")

        bar = tk.Frame(self, bg=BG, padx=22, pady=4); bar.pack(fill="x")
        self.q_var = tk.StringVar(); self.q_var.trace_add("write", lambda *a: self.render())
        entry(bar, self.q_var, 30).pack(side="left", ipady=6)
        tk.Label(bar, text="  Tìm tên game", bg=BG, fg=MUTED, font=FONT_S).pack(side="left")
        button(bar, "Bật / tắt bán", self.toggle).pack(side="right", padx=(8, 0))
        button(bar, "Sửa giá / phí / mật khẩu", self.edit, "primary").pack(side="right")

        self.foot = tk.Label(self, text="", bg=BG, fg=MUTED, font=FONT_S, anchor="w", padx=22, pady=8); self.foot.pack(side="bottom", fill="x")
        wrap = tk.Frame(self, bg=BG, padx=22, pady=8); wrap.pack(fill="both", expand=True)
        box = tk.Frame(wrap, bg=PANEL, highlightthickness=1, highlightbackground=LINE); box.pack(fill="both", expand=True)
        self.tree = ttk.Treeview(box, columns=[c[0] for c in self.COLS], show="headings", selectmode="extended")
        sb = ttk.Scrollbar(box, orient="vertical", command=self.tree.yview, style="Dark.Vertical.TScrollbar")
        self.tree.configure(yscrollcommand=sb.set); sb.pack(side="right", fill="y"); self.tree.pack(side="left", fill="both", expand=True)
        for cid, label, w, anchor, stretch in self.COLS:
            self.tree.heading(cid, text=label, anchor="w" if anchor == "w" else "center")
            self.tree.column(cid, width=w, minwidth=40, anchor=anchor, stretch=stretch)
        self.tree.tag_configure("odd", background=ROW_A); self.tree.tag_configure("even", background=ROW_B)
        for tg, col in (("ok", OK), ("bad", BAD), ("off", WARN), ("none", MUTED)): self.tree.tag_configure(tg, foreground=col)
        self.tree.bind("<Double-1>", lambda e: self.edit() if self.tree.identify_row(e.y) else None)
        self.tree.bind("<Return>", lambda e: self.edit()); self.bind("<F5>", lambda e: self.load()); self.bind("<Escape>", lambda e: self.destroy())
        self.load()

    def load(self):
        self.stat.config(text="Đang tải từ Supabase…", fg=MUTED)
        def job():
            if not q.sb_config(): raise RuntimeError(NO_SB)
            return q.load(), q._key_rows(), q._key_stats()
        def done(res, err):
            if err: self.stat.config(text="✗ " + err.splitlines()[0], fg=BAD); return messagebox.showerror("Không tải được key", err, parent=self)
            self.games, self.rows, st = res
            self.stat.config(fg=MUTED, text=(f"Hôm nay: {st[0]} đơn / {q._vnd(st[1])}   •   7 ngày: {st[2]} đơn / {q._vnd(st[3])}   •   đang chờ thanh toán: {st[4]}"
                                             if st else "(Không lấy được thống kê đơn)"))
            self.render()
        run_bg(self, job, done)

    def render(self):
        kw = fold(self.q_var.get().strip())
        self.shown = [g for g in self.games if not kw or kw in fold(g["title"] + " " + g["slug"])]
        self.tree.delete(*self.tree.get_children())
        n_ok = n_bad = 0
        for i, g in enumerate(self.shown, 1):
            r = self.rows.get(g["slug"]); icon, label, _ = q._key_state(r)
            n_ok += icon == "●"; n_bad += icon == "⚠"
            vals = (i, g["title"], q._vnd(r["price"]), q._vnd(r["fee"]), q._vnd(r["price"] + r["fee"]), f"{icon} {label}",
                    (r["password"] or "(trống)")) if r else (i, g["title"], "–", "–", "–", f"{icon} {label}", "")
            self.tree.insert("", "end", iid=g["slug"], values=vals, tags=("odd" if i % 2 else "even", KEY_TAG[icon]))
        self.foot.config(text=f"●  {n_ok} đang bán     ⚠  {n_bad} cần sửa     ○  {len(self.games) - len(self.rows)} chưa đặt"
                              "     •     Có hiệu lực ngay trên web, không cần đẩy Vercel")

    def picked(self):
        by = {g["slug"]: g for g in self.games}
        return [by[i] for i in self.tree.selection() if i in by]

    def edit(self):
        p = self.picked()
        if not p: return messagebox.showinfo("Chưa chọn", "Chọn một hoặc nhiều game (Ctrl/Shift + nhấp) rồi bấm Sửa.", parent=self)
        KeyDialog(self, p, self.rows)

    def toggle(self):
        p = [g for g in self.picked() if g["slug"] in self.rows]
        if not p: return messagebox.showinfo("Chưa có key", "Chọn game đã đặt giá. Game chưa đặt: bấm Sửa để đặt giá trước.", parent=self)
        new, rows = not self.rows[p[0]["slug"]]["enabled"], self.rows
        def job():
            for g in p: q._key_save(g["slug"], dict(rows[g["slug"]], enabled=new))
        run_bg(self, job, lambda res, err: messagebox.showerror("Lỗi", err, parent=self) if err else self.load())


# ---------- voucher: mã giảm giá (Supabase, có hiệu lực ngay; cần chạy supabase/vouchers.sql một lần) ----------
VOUCHER_KINDS = {"Phần trăm (%)": "percent", "Số tiền cố định (đ)": "fixed"}


class VoucherDialog(tk.Toplevel):
    def __init__(self, win):
        super().__init__(win, bg=PANEL)
        self.win = win
        self.title("Tạo voucher"); self.transient(win); self.resizable(False, False)
        body = tk.Frame(self, bg=PANEL, padx=34, pady=28); body.pack()
        tk.Label(body, text="Tạo voucher", bg=PANEL, fg=TEXT, font=("Segoe UI", 16, "bold")).grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 10))
        self.v_code, self.v_qty, self.v_kind = tk.StringVar(), tk.StringVar(value="1"), tk.StringVar(value="Phần trăm (%)")
        self.v_value, self.v_uses, self.v_note = tk.StringVar(), tk.StringVar(value="1"), tk.StringVar()
        rows = [("code", "Mã voucher\n(trống = tự sinh ngẫu nhiên)", self.v_code), ("qty", "Số lượng mã\n(chỉ khi tự sinh)", self.v_qty),
                ("kind", "Loại giảm", self.v_kind), ("value", "Giá trị giảm\n(% hoặc đ)", self.v_value),
                ("uses", "Số lượt dùng MỖI mã", self.v_uses), ("note", "Ghi chú (tùy chọn)", self.v_note)]
        self.w = {}   # khóa là chuỗi: tkinter.Variable không hash được nên không dùng làm khóa dict
        for i, (key, label, var) in enumerate(rows, 1):
            tk.Label(body, text=label, bg=PANEL, fg=MUTED, font=FONT_S, justify="left").grid(row=i, column=0, sticky="w", pady=7, padx=(0, 18))
            if key == "kind":
                w = ttk.Combobox(body, textvariable=var, values=list(VOUCHER_KINDS), state="readonly", width=36)
                w.grid(row=i, column=1, sticky="ew", pady=7, ipady=4)
            else:
                w = entry(body, var, 38); w.grid(row=i, column=1, sticky="ew", pady=7, ipady=7)
            self.w[key] = w
        self.v_code.trace_add("write", lambda *a: self.sync())
        self.sync()
        tk.Label(body, text="Mã chỉ gồm chữ A-Z, số, gạch ngang/dưới (2-32 ký tự), tự IN HOA. Giảm 100% (hoặc số tiền ≥ giá đơn) = đơn MIỄN PHÍ, khách nhận key ngay. Giảm một phần thì sau giảm tối thiểu 1.000đ.",
                 bg=PANEL, fg=MUTED, font=FONT_S, wraplength=430, justify="left").grid(row=7, column=0, columnspan=2, sticky="w", pady=(6, 0))
        bar = tk.Frame(body, bg=PANEL); bar.grid(row=8, column=0, columnspan=2, sticky="e", pady=(16, 0))
        button(bar, "Hủy", self.destroy).pack(side="left", padx=(0, 8)); button(bar, "Tạo", self.save, "primary").pack(side="left")
        self.bind("<Escape>", lambda e: self.destroy()); self.bind("<Return>", lambda e: self.save())
        self.update_idletasks()
        self.geometry(f"+{win.winfo_x() + (win.winfo_width() - self.winfo_width()) // 2}+{win.winfo_y() + 70}")
        self.grab_set(); self.w["code"].focus_set()

    def sync(self):   # nhập mã cụ thể thì ô "số lượng" không dùng
        self.w["qty"].config(state="disabled" if self.v_code.get().strip() else "normal")

    def save(self):
        code, kind = q.voucher_norm(self.v_code.get()), VOUCHER_KINDS.get(self.v_kind.get(), "percent")
        try:
            value, uses = q.parse_voucher_value(kind, self.v_value.get()), q.parse_voucher_uses(self.v_uses.get())
            if code and not q.VOUCHER_RE.match(code): raise ValueError("Mã chỉ gồm chữ A-Z, số 0-9, gạch ngang/dưới, dài 2-32 ký tự.")
            qty = 1
            if not code:
                n = self.v_qty.get().strip()
                if not n.isdigit() or not 1 <= int(n) <= q.VOUCHER_MAX_QTY: raise ValueError(f"Số lượng mã phải là số nguyên từ 1 đến {q.VOUCHER_MAX_QTY}.")
                qty = int(n)
        except ValueError as e:
            return messagebox.showwarning("Sai dữ liệu", str(e), parent=self)
        note = self.v_note.get().strip()[:100]
        def done(res, err):
            if err: return messagebox.showerror("Tạo thất bại", err, parent=self)
            win = self.win; self.destroy(); win.load(); win.created(res)
        self.config(cursor="watch"); run_bg(self, lambda: q.make_vouchers(code, qty, kind, value, uses, note), done)


class VouchersWindow(tk.Toplevel):
    COLS = [("n", "#", 44, "center", False), ("code", "Mã voucher", 230, "w", True), ("desc", "Giảm", 100, "e", False),
            ("uses", "Đã dùng / Tổng", 190, "w", False), ("left", "Còn lại", 80, "e", False),
            ("state", "Trạng thái", 120, "w", False), ("note", "Ghi chú", 220, "w", True), ("at", "Tạo lúc", 110, "center", False)]

    def __init__(self, app):
        super().__init__(app, bg=BG)
        self.app, self.rows, self.shown = app, [], []
        self.title("Voucher • mã giảm giá"); self.geometry("1240x720"); self.minsize(960, 480)
        head = tk.Frame(self, bg=BG, padx=22, pady=16); head.pack(fill="x")
        left = tk.Frame(head, bg=BG); left.pack(side="left")
        tk.Label(left, text="Voucher", bg=BG, fg=TEXT, font=("Segoe UI", 24, "bold")).pack(anchor="w")
        self.stat = tk.Label(left, text="Đang tải…", bg=BG, fg=MUTED, font=FONT_S); self.stat.pack(anchor="w")
        button(head, "Làm mới", self.load).pack(side="right")

        bar = tk.Frame(self, bg=BG, padx=22, pady=4); bar.pack(fill="x")
        self.q_var = tk.StringVar(); self.q_var.trace_add("write", lambda *a: self.render())
        entry(bar, self.q_var, 30).pack(side="left", ipady=6)
        tk.Label(bar, text="  Tìm mã / ghi chú", bg=BG, fg=MUTED, font=FONT_S).pack(side="left")
        button(bar, "Xóa", self.delete, "danger").pack(side="right", padx=(8, 0))
        button(bar, "Chép mã", self.copy_codes).pack(side="right", padx=(8, 0))
        button(bar, "Bật / tắt", self.toggle).pack(side="right", padx=(8, 0))
        button(bar, "Đổi số lượt", self.set_uses).pack(side="right", padx=(8, 0))
        button(bar, "＋ Tạo voucher", lambda: VoucherDialog(self), "primary").pack(side="right")

        self.foot = tk.Label(self, text="", bg=BG, fg=MUTED, font=FONT_S, anchor="w", padx=22, pady=8); self.foot.pack(side="bottom", fill="x")
        wrap = tk.Frame(self, bg=BG, padx=22, pady=8); wrap.pack(fill="both", expand=True)
        box = tk.Frame(wrap, bg=PANEL, highlightthickness=1, highlightbackground=LINE); box.pack(fill="both", expand=True)
        self.tree = ttk.Treeview(box, columns=[c[0] for c in self.COLS], show="headings", selectmode="extended")
        sb = ttk.Scrollbar(box, orient="vertical", command=self.tree.yview, style="Dark.Vertical.TScrollbar")
        self.tree.configure(yscrollcommand=sb.set); sb.pack(side="right", fill="y"); self.tree.pack(side="left", fill="both", expand=True)
        for cid, label, w, anchor, stretch in self.COLS:
            self.tree.heading(cid, text=label, anchor="w" if anchor == "w" else "center")
            self.tree.column(cid, width=w, minwidth=40, anchor=anchor, stretch=stretch)
        self.tree.tag_configure("odd", background=ROW_A); self.tree.tag_configure("even", background=ROW_B)
        for tg, col in (("ok", OK), ("off", WARN), ("done", MUTED)): self.tree.tag_configure(tg, foreground=col)
        self.bind("<F5>", lambda e: self.load()); self.bind("<Escape>", lambda e: self.destroy())
        self.tree.bind("<Control-c>", lambda e: self.copy_codes())
        self.load()

    def load(self):
        self.stat.config(text="Đang tải từ Supabase…", fg=MUTED)
        def job():
            if not q.sb_config(): raise RuntimeError(NO_SB)
            return q.voucher_rows()
        def done(res, err):
            if err: self.stat.config(text="✗ " + err.splitlines()[0], fg=BAD); return messagebox.showerror("Không tải được voucher", err, parent=self)
            self.rows = res or []; self.render()
        run_bg(self, job, done)

    def render(self):
        kw = fold(self.q_var.get().strip())
        self.shown = [r for r in self.rows if not kw or kw in fold(r["code"] + " " + (r["note"] or ""))]
        keep = set(self.tree.selection())
        self.tree.delete(*self.tree.get_children())
        n_ok = n_done = n_off = pend = 0
        for i, r in enumerate(self.shown, 1):
            icon, label, _ = q.voucher_state(r)
            n_ok += icon == "●"; n_done += icon == "✓"; n_off += icon == "◌"; pend += r["pending"]
            left = max(0, r["max_uses"] - r["paid"] - r["pending"])
            at = str(r["created_at"])[:10]
            self.tree.insert("", "end", iid=r["id"], values=(i, r["code"], q.voucher_desc(r), q.voucher_uses_text(r), left, f"{icon} {label}", r["note"] or "", at),
                             tags=("odd" if i % 2 else "even", {"●": "ok", "◌": "off"}.get(icon, "done")))
        self.tree.selection_set([i for i in self.tree.get_children() if i in keep])
        self.stat.config(fg=MUTED, text=f"{len(self.rows)} voucher   •   đang có {pend} đơn chờ thanh toán đang giữ lượt")
        self.foot.config(text=f"●  {n_ok} còn lượt     ✓  {n_done} hết lượt     ◌  {n_off} đang tắt"
                              "     •     Lượt chỉ bị trừ khi đơn đã thanh toán / đang chờ; đơn hết hạn tự nhả lượt")

    def picked(self):
        by = {r["id"]: r for r in self.rows}
        return [by[i] for i in self.tree.selection() if i in by]

    def need(self):
        p = self.picked()
        if not p: messagebox.showinfo("Chưa chọn", "Chọn một hoặc nhiều voucher (Ctrl/Shift + nhấp) rồi thao tác.", parent=self)
        return p

    def created(self, codes):
        txt = "\n".join(codes)
        self.clipboard_clear(); self.clipboard_append(txt)
        shown = "\n".join(codes[:30]) + (f"\n… và {len(codes) - 30} mã nữa" if len(codes) > 30 else "")
        messagebox.showinfo("Đã tạo voucher", f"Đã tạo {len(codes)} voucher và chép vào clipboard (mỗi mã một dòng):\n\n{shown}", parent=self)

    def copy_codes(self):
        p = self.picked()
        if not p: return messagebox.showinfo("Chưa chọn", "Chọn voucher cần chép mã.", parent=self)
        self.clipboard_clear(); self.clipboard_append("\n".join(r["code"] for r in p)); self.stat.config(text=f"Đã chép {len(p)} mã vào clipboard.", fg=OK)

    def set_uses(self):
        p = self.need()
        if not p: return
        n = simpledialog.askinteger("Đổi số lượt", f"Tổng số lượt dùng mới cho {len(p)} voucher\n(tính cả lượt đã dùng; hiện: {p[0]['max_uses']}):",
                                    parent=self, minvalue=1, maxvalue=q.VOUCHER_MAX_USES, initialvalue=p[0]["max_uses"])
        if n is None: return
        ids = [r["id"] for r in p]
        run_bg(self, lambda: q.voucher_set(ids, max_uses=n), lambda res, err: messagebox.showerror("Lỗi", err, parent=self) if err else self.load())

    def toggle(self):
        p = self.need()
        if not p: return
        new, ids = not p[0]["enabled"], [r["id"] for r in p]
        run_bg(self, lambda: q.voucher_set(ids, enabled=new), lambda res, err: messagebox.showerror("Lỗi", err, parent=self) if err else self.load())

    def delete(self):
        p = self.need()
        if not p: return
        if not messagebox.askyesno("Xóa voucher", f"Xóa {len(p)} voucher?\nVoucher đã có đơn hàng sẽ không xóa được (hãy tắt thay vì xóa).", parent=self): return
        ids = [r["id"] for r in p]
        run_bg(self, lambda: q.voucher_delete(ids), lambda res, err: messagebox.showerror("Không xóa được", err, parent=self) if err else self.load())


# ---------- CMD 7: cài đặt web & tài khoản ----------
# Các handler của quan_ly.py (do_site, do_alerts...) là menu lồng nhau hỏi đáp bằng input(). Thay vì viết lại từng cái (dễ lệch với
# CMD), chạy NGUYÊN BẢN trong luồng nền: print() -> khung log, input() -> ô nhập + nút bấm dựng từ các dòng "[k] …" / "N. …".
ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")
OPT_RE = re.compile(r"^\s*(?:\[([0-9]{1,2}|[A-Za-z])\]|([0-9]{1,2})[.)])\s+(\S.*)$")     # "[1] Tên" | "  3. Tên: giá trị"
MAX_CHOICES = 40


def parse_options(text):
    """Khối '[k] …' / 'N. …' ở CUỐI log -> [(phím, nhãn)]. Dòng cuối (đang chờ nhập) và dòng trống bị bỏ qua; vài dòng chữ
    ngay trước prompt (vd cảnh báo ⚠ sau danh sách) được bỏ qua; gặp dòng chữ thường SAU khi đã có mục thì dừng."""
    lines = text.split("\n")
    if lines and not OPT_RE.match(lines[-1]): lines = lines[:-1]
    out, skipped = [], 0
    for ln in reversed(lines):
        if not ln.strip(): continue
        m = OPT_RE.match(ln)
        if m: out.append((m.group(1) or m.group(2), re.sub(r"\s{2,}", "  ", m.group(3)).strip()))
        elif out or skipped >= 4: break
        else: skipped += 1
    out.reverse()
    return out


class Bridge:
    """print() -> hàng đợi, input() -> hàng đợi prompt + chờ câu trả lời từ giao diện. Mỗi lần chạy dùng một Bridge mới."""
    def __init__(self): self.q, self.answers, self.tid = queue.Queue(), queue.Queue(), None

    def input(self, prompt=""):
        self.q.put(("prompt", str(prompt)))
        a = self.answers.get()
        if a is None: raise KeyboardInterrupt
        return a

    def run(self, fn, on_exit):
        def work():
            self.tid = threading.get_ident()
            old = sys.stdout, sys.stderr, builtins.input
            sys.stdout = sys.stderr = _Out(self.q); builtins.input = self.input
            res = None
            try: res = fn()
            except KeyboardInterrupt: print("  (Đã hủy)")
            except RuntimeError as e: print(f"\n  ✗ {e}")                 # cùng cách xử lý như do_cmd7 của CMD
            except SystemExit as e: print(f"  ✗ {e}")
            except BaseException as e: print(f"  ✗ Lỗi: {type(e).__name__}: {e}")
            finally:
                sys.stdout, sys.stderr, builtins.input = old
                self.tid = None; on_exit(); self.q.put(("end", res))
        threading.Thread(target=work, daemon=True).start()

    def interrupt(self, waiting_input):
        if waiting_input: self.answers.put(None)
        elif self.tid:
            ctypes.pythonapi.PyThreadState_SetAsyncExc(ctypes.c_ulong(self.tid), ctypes.py_object(KeyboardInterrupt))


class LogConsole(tk.Frame):
    def __init__(self, parent):
        super().__init__(parent, bg=PANEL)
        self.t = tk.Text(self, bg="#070c17", fg=TEXT, font=("Consolas", 11), relief="flat", wrap="word", padx=12, pady=10, height=10,
                         highlightthickness=1, highlightbackground=LINE, state="disabled", cursor="arrow", spacing1=1)
        sb = ttk.Scrollbar(self, orient="vertical", command=self.t.yview, style="Dark.Vertical.TScrollbar")
        self.t.configure(yscrollcommand=sb.set); sb.pack(side="right", fill="y"); self.t.pack(side="left", fill="both", expand=True)
        for tg, col in (("ok", OK), ("bad", BAD), ("warn", WARN), ("head", ACCENT_H), ("echo", "#67e8f9")): self.t.tag_configure(tg, foreground=col)
        self.t.tag_configure("head", font=("Consolas", 11, "bold"))
        self.t.mark_set("blk", "1.0"); self.t.mark_gravity("blk", "left")        # đầu "khối" log hiện tại (sau câu trả lời gần nhất)
        self.t.bind("<Button-1>", lambda e: self.t.focus_set(), add="+")           # để Ctrl+C chép được (vd mật khẩu mới vừa đổi)
        self.menu = tk.Menu(self, tearoff=0, bg=CARD, fg=TEXT, activebackground=ACCENT, activeforeground="#fff", bd=0, font=FONT)
        self.menu.add_command(label="Sao chép phần đã chọn", command=lambda: self.t.event_generate("<<Copy>>"))
        self.menu.add_command(label="Sao chép toàn bộ log", command=self.copy_all)
        for ev in ("<Button-3>", "<Button-2>"): self.t.bind(ev, lambda e: self.menu.tk_popup(e.x_root, e.y_root))

    def clear(self):
        self.t.config(state="normal"); self.t.delete("1.0", "end"); self.t.config(state="disabled"); self.t.mark_set("blk", "1.0")

    def copy_all(self):
        self.clipboard_clear(); self.clipboard_append(self.t.get("1.0", "end-1c"))

    def write(self, s, tag=None):
        s = ANSI_RE.sub("", s).replace("\r", "")
        stick = self.t.yview()[1] >= 0.995
        self.t.config(state="normal")
        for ln in s.splitlines(keepends=True):
            t = tag or ("ok" if "✓" in ln else "bad" if "✗" in ln else "warn" if ln.lstrip().startswith(("!", "⚠")) else "")
            self.t.insert("end", ln, t)
        self.t.config(state="disabled")
        if stick: self.t.see("end")

    def mark(self): self.t.mark_set("blk", "end-1c")
    def tail(self): return self.t.get("blk", "end-1c")


class ChoiceBar(tk.Frame):
    """Lưới nút bấm cho menu của tool: tự chia cột theo chiều rộng, cao tối đa maxh px rồi mới hiện thanh cuộn."""
    def __init__(self, parent, on_pick, before, maxh=96):
        super().__init__(parent, bg=PANEL)
        self.on_pick, self.before, self.btns, self.cols, self.sb_on = on_pick, before, [], 0, False
        self.maxh = int(maxh * self.winfo_fpixels("1i") / 96)
        self.cv = tk.Canvas(self, bg=PANEL, highlightthickness=0, bd=0, height=1, yscrollincrement=24)
        self.sb = ttk.Scrollbar(self, orient="vertical", command=self.cv.yview, style="Dark.Vertical.TScrollbar")
        self.cv.configure(yscrollcommand=self.sb.set); self.cv.pack(side="left", fill="both", expand=True)
        self.inner = tk.Frame(self.cv, bg=PANEL); self.win = self.cv.create_window((0, 0), window=self.inner, anchor="nw")
        self.cv.bind("<Configure>", self._resize); self.inner.bind("<Configure>", lambda e: self._fit())
        for ev in ("<MouseWheel>", "<Button-4>", "<Button-5>"): self.bind_all(ev, self._wheel, add="+")

    def set(self, items):
        self.clear()
        if not items: return
        for key, label in items[:MAX_CHOICES]:
            short = label if len(label) <= 34 else label[:33].rstrip() + "…"   # đủ nhận ra; nội dung đầy đủ đã in trong console
            b = button(self.inner, f"{key}. {short}", lambda k=key: self.on_pick(k))
            b.config(anchor="w", justify="left", padx=10, pady=3, font=FONT_S); self.btns.append(b)
        self.pack(fill="x", pady=(0, 4), before=self.before)
        self.cv.yview_moveto(0); self.update_idletasks(); self._grid(self._cols_for(self.master.winfo_width()))

    def clear(self):
        for b in self.btns: b.destroy()
        self.btns, self.cols = [], 0
        self.pack_forget()

    def _cols_for(self, w): return max(1, min(6, w // 210))

    def _grid(self, cols):
        self.cols = cols
        for i, b in enumerate(self.btns): b.grid(row=i // cols, column=i % cols, sticky="ew", padx=3, pady=3)
        for c in range(4): self.inner.columnconfigure(c, weight=1 if c < cols else 0, uniform="ch" if c < cols else "")

    def _resize(self, e):
        self.cv.itemconfigure(self.win, width=e.width)
        cols = self._cols_for(e.width)
        if self.btns and cols != self.cols: self._grid(cols)
        for b in self.btns: b.config(wraplength=0)

    def _fit(self):
        h = self.inner.winfo_reqheight(); need = h > self.maxh
        self.cv.configure(height=min(h, self.maxh), scrollregion=(0, 0, 1, h))
        if need != self.sb_on:
            self.sb_on = need
            if need: self.sb.pack(side="right", fill="y", padx=(4, 0))
            else: self.sb.pack_forget()

    def _wheel(self, e):
        try: w = self.winfo_containing(e.x_root, e.y_root)
        except KeyError: return
        while w is not None and w is not self: w = w.master
        if w is None or not self.sb_on: return
        up = e.delta > 0 if e.num not in (4, 5) else e.num == 4
        self.cv.yview_scroll(-2 if up else 2, "units")


class Cmd7Window(tk.Toplevel):
    # (phím, tên, mô tả, hiệu lực, tên hàm trong quan_ly.py, cần Supabase)  -- khớp CMD7_MENU của quan_ly.py
    ITEMS = [
        ("1", "Chữ & link trên web", "Tên web, Discord, Facebook, chân trang, menu, bảng thông báo", "push", "do_site", False),
        ("2", "Báo lỗi về Discord", "Bật/tắt, webhook, chống trùng, gửi thử", "live", "do_alerts", True),
        ("3", "Khóa đăng nhập", "Số lần sai tối đa, thời gian khóa", "live", "do_auth_settings", True),
        ("4", "Quản lý tài khoản", "Tìm, mở khóa, đổi mật khẩu, quyền quản trị", "", "do_accounts", True),
        ("5", "Xem 10 lỗi hệ thống gần nhất", "Lỗi ghi nhận từ web (trình duyệt / máy chủ)", "", "do_errors", True),
        ("6", "Trang Donate", "QR, ngân hàng, STK, nội dung chuyển khoản", "push", "do_donate", False),
        ("7", "Key game", "Giá key, phí, mật khẩu ZIP, bật/tắt bán", "live", None, True),
        ("8", "Voucher", "Mã giảm giá: tạo mã bất kỳ, số lượt bất kỳ, bật/tắt", "live", None, True),
    ]
    BADGE = {"push": ("cần đẩy lên Vercel", WARN), "live": ("có hiệu lực ngay", OK), "": ("", MUTED)}

    def __init__(self, app):
        super().__init__(app, bg=BG)
        self.app, self.bridge, self.running, self.awaiting, self.kind, self.cards = app, Bridge(), False, False, "", []
        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        w, h = min(1440, sw - 60), min(860, sh - 90)
        self.title("Cài đặt web & tài khoản • CMD 7"); self.geometry(f"{w}x{h}+{max(0, (sw - w) // 2)}+{max(0, (sh - h) // 2 - 20)}")
        self.minsize(min(1000, w), min(580, h))
        head = tk.Frame(self, bg=BG, padx=22, pady=14); head.pack(fill="x")
        left = tk.Frame(head, bg=BG); left.pack(side="left")
        tk.Label(left, text="Cài đặt web & tài khoản", bg=BG, fg=TEXT, font=("Segoe UI", 24, "bold")).pack(anchor="w")
        self.hint = tk.Label(left, text="Chọn một mục ở cột trái (giống CMD 7).", bg=BG, fg=MUTED, font=FONT_S); self.hint.pack(anchor="w")
        self.b_push = button(head, "⬆  Đẩy lên Vercel", app.do_push, "primary")          # chỉ hiện khi có thay đổi cần đẩy

        body = tk.Frame(self, bg=BG, padx=22); body.pack(fill="both", expand=True, pady=(0, 14))
        side = tk.Frame(body, bg=BG, width=360); side.pack(side="left", fill="y"); side.pack_propagate(False)
        for key, name, desc, kind, fn, sb in self.ITEMS: self._card(side, key, name, desc, kind)

        right = tk.Frame(body, bg=PANEL); right.pack(side="left", fill="both", expand=True, padx=(14, 0))
        self.console = LogConsole(right)
        # Thanh nhập pack TRƯỚC (side=bottom) để luôn nằm trong tầm nhìn; console co lại khi cửa sổ thấp.
        self.askbar = tk.Frame(right, bg=PANEL, padx=10, pady=8); self.askbar.pack(side="bottom", fill="x")
        self.inrow = tk.Frame(self.askbar, bg=PANEL); self.inrow.pack(side="bottom", fill="x")
        self.choices = ChoiceBar(self.askbar, self.send, self.inrow)
        button(self.inrow, "Xóa log", self.console.clear).pack(side="right", padx=(8, 0))
        self.b_stop = button(self.inrow, "■ Dừng", self.stop, "danger"); self.b_stop.pack(side="right", padx=(8, 0)); self.b_stop.config(state="disabled")
        self.b_send = button(self.inrow, "Gửi", self.send, "primary"); self.b_send.pack(side="right")
        self.quick = tk.Frame(self.inrow, bg=PANEL); self.quick.pack(side="left")
        self.v_in = tk.StringVar(); self.ent = tk.Entry(self.inrow, textvariable=self.v_in, bg=CARD, fg=TEXT, insertbackground=TEXT, relief="flat", font=FONT,
                                                         highlightthickness=1, highlightbackground=LINE, highlightcolor=ACCENT, disabledbackground=PANEL, disabledforeground=MUTED)
        self.ent.pack(side="left", fill="x", expand=True, ipady=6, padx=(0, 8))
        self.ent.bind("<Return>", lambda e: self.send()); self.ent.config(state="disabled")
        self.console.pack(side="top", fill="both", expand=True, padx=10, pady=(10, 4))
        self.console.write("Mục 1-6 chạy đúng logic của CMD: bấm số trong danh sách (hoặc gõ vào ô nhập), Enter = xong.\n"
                           "Mục 7 và 8 mở bảng Key game / Voucher riêng.\n", "head")
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        self.after(40, self.pump)

    # --- cột trái ---
    def _card(self, parent, key, name, desc, kind):
        strip = tk.Frame(parent, bg=self.BADGE[kind][1]); strip.pack(fill="x", pady=5)
        f = tk.Frame(strip, bg=CARD, padx=16, pady=12, cursor="hand2"); f.pack(fill="x", padx=(3, 0))
        l1 = tk.Label(f, text=f"{key}   {name}", bg=CARD, fg=TEXT, font=FONT_B, anchor="w", cursor="hand2"); l1.pack(fill="x")
        l2 = tk.Label(f, text=desc, bg=CARD, fg=MUTED, font=FONT_S, anchor="w", justify="left", wraplength=310, cursor="hand2"); l2.pack(fill="x")
        txt, col = self.BADGE[kind]
        l3 = tk.Label(f, text=txt, bg=CARD, fg=col, font=FONT_S, anchor="w", cursor="hand2")
        if txt: l3.pack(fill="x")
        ws = (f, l1, l2, l3)
        for w in ws:
            w.bind("<Button-1>", lambda e, k=key: self.open(k))
            w.bind("<Enter>", lambda e, ws=ws: not self.running and [x.config(bg=LINE) for x in ws])
            w.bind("<Leave>", lambda e, ws=ws: [x.config(bg=CARD) for x in ws])
        self.cards.append(l1)

    def _paint(self):
        for l1 in self.cards: l1.config(fg=MUTED if self.running else TEXT)
        self.b_stop.config(state="normal" if self.running else "disabled")

    # --- chạy một mục ---
    def open(self, key):
        item = next(i for i in self.ITEMS if i[0] == key)
        if key == "7": return self.app.open_keys()
        if key == "8": return self.app.open_vouchers()
        if self.running or self.app.busy:
            return messagebox.showinfo("Đang bận", "Đang chạy một tác vụ khác. Thoát mục hiện tại (Enter / 0) hoặc bấm Dừng.", parent=self)
        _, name, _, kind, fname, need_sb = item
        fn = getattr(q, fname)
        def job():
            if need_sb and not q.sb_config(): return None      # in hướng dẫn tạo .env.local, giống do_cmd7
            return fn()
        self.bridge, self.running, self.kind = Bridge(), True, kind
        self.app.busy = True                                    # chặn run_task của cửa sổ chính: cả hai đều đổi stdout/input toàn cục
        self.console.write(f"\n▶ {name}\n", "head"); self.console.mark(); self.hint.config(text=name); self._paint()
        self.bridge.run(job, lambda: setattr(self.app, "busy", False))

    def finish(self, res):
        self.running = False; self.end_ask(); self.console.write("■ Xong.\n", "head"); self.console.mark(); self._paint()
        if res and self.kind == "push":
            self.console.write("  ! Đã đổi chữ/link: bấm “Đẩy lên Vercel” để web đổi theo.\n", "warn")
            self.b_push.pack(side="right")

    def stop(self):
        if self.running: self.console.write("\n  ! Đang yêu cầu dừng…\n", "warn"); self.bridge.interrupt(self.awaiting)

    def pump(self):
        if not self.winfo_exists(): return
        try:
            for _ in range(300):
                item = self.bridge.q.get_nowait()
                if isinstance(item, str): self.console.write(item)
                elif item[0] == "prompt": self.ask(item[1])
                else: self.finish(item[1])
        except queue.Empty: pass
        self.after(40, self.pump)

    # --- câu hỏi từ handler ---
    def _clear_ask_ui(self):
        for w in self.quick.winfo_children(): w.destroy()
        self.choices.clear()

    def ask(self, prompt):
        opts = parse_options(self.console.tail() + prompt)        # tìm menu TRƯỚC khi ghi prompt (prompt nhiều dòng có thể chứa nhãn mục)
        self.console.write(prompt); self.console.t.see("end")
        self.awaiting = True; self.ent.config(state="normal"); self.ent.focus_set(); self._clear_ask_ui()
        low = prompt.lower()
        if "(y/n)" in low:
            for label, val, kind in (("Có (y)", "y", "primary"), ("Không (n)", "n", "ghost")):
                button(self.quick, label, lambda v=val: self.send(v), kind).pack(side="left", padx=(0, 6))
            return
        if "enter" in low: button(self.quick, "Enter ↵", lambda: self.send(""), "primary").pack(side="left", padx=(0, 6))
        if "all =" in low: button(self.quick, "Tất cả", lambda: self.send("all")).pack(side="left", padx=(0, 6))
        if "ảnh mã qr" in low: button(self.quick, "📁 Chọn ảnh…", self.pick_image).pack(side="left", padx=(0, 6))
        if len(opts) >= 2: self.choices.set(opts)

    def pick_image(self):
        f = filedialog.askopenfilename(parent=self, title="Chọn ảnh mã QR", filetypes=[("Ảnh", "*.png *.jpg *.jpeg *.webp *.gif *.bmp *.avif"), ("Tất cả", "*.*")])
        if f: self.send(f)

    def end_ask(self):
        self.awaiting = False; self.v_in.set(""); self.ent.config(state="disabled"); self._clear_ask_ui()

    def send(self, value=None):
        if not self.awaiting: return
        text = self.v_in.get() if value is None else value
        self.console.write(f"{text}\n", "echo"); self.console.mark()
        self.awaiting = False; self.v_in.set(""); self.ent.config(state="disabled"); self._clear_ask_ui()
        self.bridge.answers.put(text)

    def on_close(self):
        if self.running:
            if not messagebox.askyesno("Đang chạy", "Mục này đang chạy. Đóng cửa sổ sẽ hủy phần đang làm dở (dữ liệu đã lưu vẫn giữ). Đóng?", parent=self): return
            self.bridge.interrupt(self.awaiting)
        self.destroy()


# ---------- cửa sổ chính ----------
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("MySite • Quản lý game"); self.configure(bg=BG)
        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        self.geometry(f"{min(1560, sw - 60)}x{min(900, sh - 90)}+{max(0, (sw - min(1560, sw - 60)) // 2)}+{max(0, (sh - min(900, sh - 90)) // 2 - 20)}"); self.minsize(1100, 640)
        self.games, self.shown = [], []
        self.sort_col, self.sort_desc = "date", True
        self.busy, self.out, self.cli = False, queue.Queue(), None
        self.option_add("*TCombobox*Listbox.background", CARD); self.option_add("*TCombobox*Listbox.foreground", TEXT)
        self.option_add("*TCombobox*Listbox.selectBackground", ACCENT); self.option_add("*TCombobox*Listbox.font", FONT)
        self._style(); self._build()
        self.bind("<F5>", lambda e: self.reload()); self.bind("<Control-f>", lambda e: self.search.focus_set())
        self.reload()

    # --- kiểu ---
    def _style(self):
        s = ttk.Style(self); s.theme_use("clam")
        rh = int(46 * self.winfo_fpixels("1i") / 96)
        s.configure("Treeview", background=ROW_A, fieldbackground=ROW_A, foreground=TEXT, rowheight=rh,
                    borderwidth=0, font=FONT)
        s.layout("Treeview", [("Treeview.treearea", {"sticky": "nswe"})])    # bỏ viền trắng mặc định
        s.map("Treeview", background=[("selected", SEL)], foreground=[("selected", "#fff")])
        s.configure("Treeview.Heading", background=CARD, foreground=MUTED, relief="flat", borderwidth=0,
                    padding=(12, 12), font=FONT_B)
        s.map("Treeview.Heading", background=[("active", LINE)], foreground=[("active", TEXT)])
        s.layout("Dark.Vertical.TScrollbar", [("Vertical.Scrollbar.trough", {"sticky": "ns", "children": [
            ("Vertical.Scrollbar.thumb", {"expand": "1", "sticky": "nswe"})]})])
        s.configure("Dark.Vertical.TScrollbar", troughcolor=PANEL, background=LINE, bordercolor=PANEL,
                    lightcolor=LINE, darkcolor=LINE, gripcount=0, width=10)
        s.map("Dark.Vertical.TScrollbar", background=[("active", MUTED)])
        s.configure("TCombobox", fieldbackground=CARD, background=CARD, foreground=TEXT, arrowcolor=MUTED,
                    bordercolor=LINE, lightcolor=CARD, darkcolor=CARD, padding=5, font=FONT)
        s.map("TCombobox", fieldbackground=[("readonly", CARD)], foreground=[("readonly", TEXT)],
              selectbackground=[("readonly", CARD)], selectforeground=[("readonly", TEXT)])

    def _build(self):
        head = tk.Frame(self, bg=BG, padx=28, pady=20); head.pack(fill="x")
        left = tk.Frame(head, bg=BG); left.pack(side="left")
        tk.Label(left, text="Quản lý game", bg=BG, fg=TEXT, font=("Segoe UI Semibold", 24)).pack(anchor="w")
        tk.Frame(left, bg=ACCENT, height=3, width=56).pack(anchor="w", pady=(4, 6))
        tk.Label(left, text=str(q.ROOT), bg=BG, fg=MUTED, font=FONT_S).pack(anchor="w")
        self.info = tk.Label(head, text="", bg=BG, fg=MUTED, font=FONT_S, justify="right"); self.info.pack(side="right")

        tools = tk.Frame(self, bg=BG, padx=28); tools.pack(fill="x", pady=(0, 14))
        button(tools, "⬆  Đẩy lên Vercel", self.do_push, "primary").pack(side="right")
        button(tools, "Mở CMD đầy đủ", self.open_cli).pack(side="right", padx=(0, 10))
        button(tools, "🔑 Key game", self.open_keys).pack(side="left")
        button(tools, "🎟 Voucher", self.open_vouchers).pack(side="left", padx=(10, 0))
        button(tools, "⚙ Cài đặt web & tài khoản", self.open_cmd7).pack(side="left", padx=10)
        button(tools, "Kiểm tra lỗi", self.do_check).pack(side="left")
        button(tools, "Làm mới (F5)", self.reload).pack(side="left", padx=10)

        self.cards = {}
        row = tk.Frame(self, bg=BG, padx=22); row.pack(fill="x")
        for key, label, color in [("total", "Tổng số game", TEXT), ("size", "Tổng dung lượng", TEXT),
                                  ("nocover", "Thiếu bìa", BAD), ("nolink", "Thiếu link / intro", WARN)]:
            o = tk.Frame(row, bg=color if color != TEXT else ACCENT); o.pack(side="left", fill="x", expand=True, padx=6)
            c = tk.Frame(o, bg=PANEL, padx=24, pady=16); c.pack(fill="both", expand=True, padx=(4, 0))
            tk.Label(c, text=label, bg=PANEL, fg=MUTED, font=FONT_S).pack(anchor="w")
            self.cards[key] = tk.Label(c, text="0", bg=PANEL, fg=color, font=("Segoe UI", 22, "bold"))
            self.cards[key].pack(anchor="w")

        bar = tk.Frame(self, bg=BG, padx=28, pady=18); bar.pack(fill="x")
        self.q_var = tk.StringVar(); self.q_var.trace_add("write", lambda *a: self.apply())
        self.search = entry(bar, self.q_var, 34); self.search.pack(side="left", ipady=6)
        tk.Label(bar, text="  Tìm tên, tag, engine…  (Ctrl+F)", bg=BG, fg=MUTED, font=FONT_S).pack(side="left")
        self.eng_var, self.st_var = tk.StringVar(value="Tất cả engine"), tk.StringVar(value="Tất cả")
        self.eng = ttk.Combobox(bar, textvariable=self.eng_var, state="readonly", width=16)
        self.stc = ttk.Combobox(bar, textvariable=self.st_var, state="readonly", width=14, values=STATUS_FILTERS)
        for w in (self.stc, self.eng):
            w.pack(side="right", padx=(8, 0)); w.bind("<<ComboboxSelected>>", lambda e: self.apply())
        button(bar, "Xóa", self.delete, "danger").pack(side="right", padx=(8, 0))
        button(bar, "Sửa", self.edit).pack(side="right", padx=(8, 0))
        button(bar, "🖼 Ảnh", self.images).pack(side="right", padx=(8, 0))
        button(bar, "＋ Thêm game", self.add, "primary").pack(side="right", padx=(8, 0))

        self.foot = tk.Label(self, text="", bg=BG, fg=MUTED, font=FONT_S, anchor="w", padx=28, pady=12)
        self.foot.pack(side="bottom", fill="x")
        self.logbox = tk.Frame(self, bg=BG, padx=28)   # chỉ hiện khi chạy kiểm tra / đẩy
        self.log = tk.Text(self.logbox, height=11, bg="#070c17", fg=TEXT, font=MONO, relief="flat", wrap="word",
                           highlightthickness=1, highlightbackground=LINE, padx=10, pady=8, state="disabled")
        self.log.pack(fill="x", pady=(0, 6))
        for tg, col in (("ok", OK), ("bad", BAD), ("warn", WARN), ("head", ACCENT_H)): self.log.tag_configure(tg, foreground=col)

        wrap = tk.Frame(self, bg=BG, padx=28); wrap.pack(fill="both", expand=True)
        box = tk.Frame(wrap, bg=PANEL, highlightthickness=1, highlightbackground=LINE); box.pack(fill="both", expand=True)
        self.tree = ttk.Treeview(box, columns=[c[0] for c in COLS], show="headings", selectmode="extended")
        sb = ttk.Scrollbar(box, orient="vertical", command=self.tree.yview, style="Dark.Vertical.TScrollbar")
        self.tree.configure(yscrollcommand=sb.set)
        sb.pack(side="right", fill="y"); self.tree.pack(side="left", fill="both", expand=True)
        for cid, label, w, anchor, stretch in COLS:
            self.tree.heading(cid, text=label, anchor="w" if anchor == "w" else "center", command=lambda c=cid: self.sort_by(c))
            self.tree.column(cid, width=w, minwidth=48, anchor=anchor, stretch=stretch)
        self.tree.tag_configure("odd", background=ROW_A); self.tree.tag_configure("even", background=ROW_B)
        for tg, col in (("ok", OK), ("warn", WARN), ("bad", BAD)): self.tree.tag_configure(tg, foreground=col)
        self.tree.bind("<Double-1>", lambda e: self.edit() if self.tree.identify_row(e.y) else None)
        self.tree.bind("<Return>", lambda e: self.edit()); self.tree.bind("<Delete>", lambda e: self.delete())
        self.tree.bind("<Button-3>", self.menu); self.tree.bind("<Button-2>", self.menu)
        self.ctx = tk.Menu(self, tearoff=0, bg=CARD, fg=TEXT, activebackground=ACCENT, activeforeground="#fff", bd=0, font=FONT)
        for label, fn in (("Sửa…", self.edit), ("Quản lý ảnh…", self.images), ("Mở thư mục ảnh", self.open_covers), ("Sao chép link trên web", self.copy_link)):
            self.ctx.add_command(label=label, command=fn)
        self.ctx.add_separator(); self.ctx.add_command(label="Xóa…", command=self.delete)

    # --- dữ liệu ---
    def reload(self, select=None):
        try: self.games = q.load()
        except SystemExit as e: return messagebox.showerror("Lỗi dữ liệu", str(e))
        self.eng.config(values=["Tất cả engine"] + sorted({g["engine"] for g in self.games}, key=fold))
        if self.eng_var.get() not in self.eng.cget("values"): self.eng_var.set("Tất cả engine")
        self.apply(select)
        g = self.games
        self.info.config(text=f"Git: {'có' if q.has_git() else 'chưa có'}   •   Supabase (.env.local): {'có' if q.ENV_FILE.exists() else 'CHƯA CÓ'}")
        miss_text = sum(1 for x in g if x["cover"] and (not x["links"] or not x["intro"]))
        self.cards["total"].config(text=str(len(g)))
        self.cards["size"].config(text=f"{sum(float(x.get('sizeGB') or 0) for x in g):,.1f} GB")
        self.cards["nocover"].config(text=str(sum(1 for x in g if not x["cover"])))
        self.cards["nolink"].config(text=str(miss_text))

    def apply(self, select=None):
        kw, eng, st = fold(self.q_var.get().strip()), self.eng_var.get(), self.st_var.get()
        def ok(g):
            if eng != "Tất cả engine" and g["engine"] != eng: return False
            if st != "Tất cả" and status_of(g)[0] != st: return False
            return not kw or kw in fold(" ".join([g["title"], g["engine"], g["slug"], *g["tags"]]))
        keep = select or None
        sel = {self.shown[self.tree.index(i)]["slug"] for i in self.tree.selection()} if not keep and self.shown else set()
        self.shown = sorted((g for g in self.games if ok(g)), key=lambda g: sort_key(self.sort_col, g), reverse=self.sort_desc)
        self.tree.delete(*self.tree.get_children())
        for n, g in enumerate(self.shown):
            self.tree.insert("", "end", iid=g["slug"], values=row_values(g), tags=("odd" if n % 2 else "even", status_of(g)[1]))
        want = [keep] if keep else [s for s in sel]
        want = [s for s in want if self.tree.exists(s)]
        if want: self.tree.selection_set(want); self.tree.see(want[0])
        for cid, label, *_ in COLS:
            arrow = (" ▼" if self.sort_desc else " ▲") if cid == self.sort_col else ""
            self.tree.heading(cid, text=label + arrow)
        self.foot.config(text=f"Đang hiển thị {len(self.shown)}/{len(self.games)} game  •  Nhấp đúp để sửa  •  Chuột phải để xem thêm")

    def sort_by(self, col):
        self.sort_desc = not self.sort_desc if col == self.sort_col else col in ("date", "size", "imgs", "links")
        self.sort_col = col; self.apply()

    def selected(self):
        by = {g["slug"]: g for g in self.games}
        return [by[i] for i in self.tree.selection() if i in by]

    # --- thao tác ---
    def menu(self, e):
        row = self.tree.identify_row(e.y)
        if row:
            if row not in self.tree.selection(): self.tree.selection_set(row)
            self.ctx.tk_popup(e.x_root, e.y_root)

    def add(self): GameDialog(self)

    def edit(self):
        s = self.selected()
        if not s: return messagebox.showinfo("Chưa chọn", "Hãy chọn một game trong bảng.")
        GameDialog(self, s[0])

    def images(self):
        s = self.selected()
        if not s: return messagebox.showinfo("Chưa chọn", "Hãy chọn một game trong bảng.")
        ImagesDialog(self, s[0]["slug"])

    def delete(self):
        s = self.selected()
        if not s: return
        names = "\n".join("• " + g["title"] for g in s[:8]) + (f"\n… và {len(s) - 8} game nữa" if len(s) > 8 else "")
        if not messagebox.askyesno("Xóa vĩnh viễn?", f"Xóa {len(s)} game cùng ảnh của chúng:\n\n{names}\n\nKhông hoàn tác được.", icon="warning"):
            return
        gone = {g["slug"] for g in s}
        games = [g for g in q.load() if g["slug"] not in gone]
        for slug in gone: shutil.rmtree(q.COVERS / slug, ignore_errors=True)
        q.save(games); self.reload()
        self.run_task("Dọn dữ liệu liên quan", lambda: (q.drop_favorites(sorted(gone)), q.drop_keys(sorted(gone))))

    def open_covers(self):
        s = self.selected()
        if not s: return
        p = q.COVERS / s[0]["slug"]
        open_path(p) if p.exists() else messagebox.showinfo("Chưa có ảnh", "Game này chưa có thư mục ảnh.")

    def copy_link(self):
        s = self.selected()
        if not s: return
        self.clipboard_clear(); self.clipboard_append(q.load_site()["url"].rstrip("/") + "/game/" + s[0]["slug"])
        self.foot.config(text="Đã sao chép link game vào clipboard.")

    def open_keys(self):
        if getattr(self, "keys_win", None) and self.keys_win.winfo_exists(): return self.keys_win.lift()
        self.keys_win = KeysWindow(self)

    def open_vouchers(self):
        if getattr(self, "vouchers_win", None) and self.vouchers_win.winfo_exists(): return self.vouchers_win.lift()
        self.vouchers_win = VouchersWindow(self)

    def open_cmd7(self):
        if getattr(self, "cmd7_win", None) and self.cmd7_win.winfo_exists(): return self.cmd7_win.lift()
        self.cmd7_win = Cmd7Window(self)

    def open_cli(self):
        exe = sys.executable
        if exe.lower().endswith("pythonw.exe"): exe = exe[:-11] + "python.exe"   # cần bản có cửa sổ CMD
        flags = subprocess.CREATE_NEW_CONSOLE if os.name == "nt" else 0
        self.cli = subprocess.Popen([exe, str(Path(q.__file__).resolve())], cwd=q.ROOT, creationflags=flags)
        self.foot.config(text="Đã mở CMD. Đóng CMD xong bảng sẽ tự làm mới.")
        self.after(1000, self.watch_cli)

    def watch_cli(self):
        if self.cli and self.cli.poll() is None: self.after(1000, self.watch_cli)
        elif self.cli: self.cli = None; self.reload()

    def do_check(self): self.run_task("Kiểm tra lỗi", q.do_check)

    def do_push(self):
        if not q.has_git(): return messagebox.showinfo("Chưa có git", "Thư mục này chưa phải git repo.")
        msg = simpledialog.askstring("Đẩy lên Vercel", "Ghi chú commit:", initialvalue="cap nhat game", parent=self)
        if msg is None: return
        def job():
            old, q.ask = q.ask, (lambda prompt, default=None: msg.strip() or default or "cap nhat game")
            try: q.do_push()
            finally: q.ask = old
        self.run_task("Đẩy lên GitHub / Vercel", job)

    # --- chạy việc nền + khung log ---
    def run_task(self, title, fn):
        if self.busy: return messagebox.showinfo("Đang bận", "Đang chạy một tác vụ khác, đợi xong nhé.")
        self.busy = True
        self.logbox.pack(fill="x", side="bottom", before=self.foot)
        self.log_write(f"\n▶ {title}\n", "head")
        def work():
            old_input = builtins.input; builtins.input = lambda *a, **k: ""   # mọi câu hỏi y/N trong CMD -> mặc định "không"
            try:
                with contextlib.redirect_stdout(_Out(self.out)), contextlib.redirect_stderr(_Out(self.out)):
                    try: fn()
                    except SystemExit as e: print(f"✗ {e}")
                    except Exception as e: print(f"✗ Lỗi: {type(e).__name__}: {e}")
            finally:
                builtins.input = old_input; self.out.put(None)
        threading.Thread(target=work, daemon=True).start(); self.after(80, self.poll)

    def poll(self):
        try:
            while True:
                t = self.out.get_nowait()
                if t is None:
                    self.busy = False; self.log_write("■ Xong.\n", "head"); self.reload(); return
                tag = "ok" if "✓" in t else "bad" if "✗" in t else "warn" if t.lstrip().startswith("!") else None
                self.log_write(t, tag)
        except queue.Empty: pass
        self.after(80, self.poll)

    def log_write(self, text, tag=None):
        self.log.config(state="normal"); self.log.insert("end", text, tag or ""); self.log.see("end"); self.log.config(state="disabled")


def main():
    if not q.DATA.exists():
        sys.exit(f"Không thấy {q.DATA}. Hãy đặt quan_ly_gui.py cạnh quan_ly.py trong thư mục mysite.")
    if os.name == "nt":
        try:
            import ctypes; ctypes.windll.shcore.SetProcessDpiAwareness(1)   # chữ nét, không bị mờ trên màn 125-150%
        except Exception: pass
    App().mainloop()


if __name__ == "__main__":
    main()
