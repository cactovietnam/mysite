# -*- coding: utf-8 -*-
"""MySite - giao diện cửa sổ cho quan_ly.py (nền tối). Đặt CẠNH quan_ly.py rồi chạy:  python quan_ly_gui.py

- Tab Game / Key / Lỗi: bảng xem + sửa key trực tiếp (dùng lại hàm của quan_ly.py).
- Mọi thao tác còn lại (thêm/sửa game, ảnh, link, cài đặt web, tài khoản, đẩy Vercel...) chạy quan_ly.py THẬT
  trong tab Console: bấm nút là tự chọn đúng mục menu, bạn trả lời các câu hỏi ngay trong khung Console, xong tự thoát.
  => không viết lại logic nên không lệch với bản dòng lệnh.
"""
import codecs, contextlib, importlib.util, io, json, os, re, subprocess, sys, threading, tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

HERE = Path(__file__).resolve().parent
CFG = HERE / ".quan_ly_gui.json"
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")

BG, PANEL, FIELD, FG, DIM, ACC, OK, BAD = "#1b1b1f", "#25252b", "#303038", "#e8e8ee", "#8b8b99", "#4f8cff", "#4ade80", "#f87171"

# nút -> chuỗi phím gửi vào menu của quan_ly.py (menu chính, rồi menu CMD 7 nếu có)
ACTIONS = [
    ("Thêm game", ["1"]), ("Sửa game", ["2"]), ("Link tải", ["3"]), ("Thêm/đổi ảnh", ["4"]),
    ("Ảnh chính / xóa ảnh", ["5"]), ("Xóa game", ["6"]), ("Kiểm tra lỗi", ["8"]),
    ("Chữ & link web", ["7", "1"]), ("Donate", ["7", "6"]), ("Báo lỗi Discord", ["7", "2"]),
    ("Khóa đăng nhập", ["7", "3"]), ("Tài khoản", ["7", "4"]), ("Đẩy Vercel", ["9"]),
]


def load_cfg():
    try: return json.loads(CFG.read_text(encoding="utf-8"))
    except Exception: return {}

def save_cfg(d):
    try: CFG.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
    except OSError: pass

def load_q(folder):
    """Nạp quan_ly.py của thư mục site thành module (mỗi lần đổi thư mục nạp lại, ROOT theo thư mục đó)."""
    path = Path(folder) / "quan_ly.py"
    spec = importlib.util.spec_from_file_location("quan_ly_proj", path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m

vnd = lambda n: f"{int(n):,}".replace(",", ".") + "đ"


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("MySite • Tool quản lý 1.0")
        self.geometry("1100x720"); self.minsize(900, 560); self.configure(bg=BG)
        self.q = None; self.folder = None; self.proc = None
        self.games = []; self.keyrows = {}
        self._style(); self._build()
        cfg = load_cfg()
        start = cfg.get("folder") or (str(HERE) if (HERE / "quan_ly.py").exists() else "")
        if start: self.set_folder(start)

    # ---------- giao diện ----------
    def _style(self):
        s = ttk.Style(self); s.theme_use("clam")
        s.configure(".", background=BG, foreground=FG, fieldbackground=FIELD, font=("Segoe UI", 10))
        s.configure("TFrame", background=BG); s.configure("P.TFrame", background=PANEL)
        s.configure("TLabel", background=BG, foreground=FG)
        s.configure("Dim.TLabel", foreground=DIM); s.configure("Ok.TLabel", foreground=OK); s.configure("Bad.TLabel", foreground=BAD)
        s.configure("Title.TLabel", font=("Segoe UI", 14, "bold"))
        s.configure("TButton", background=FIELD, foreground=FG, borderwidth=0, padding=(10, 6))
        s.map("TButton", background=[("active", "#3c3c47"), ("disabled", PANEL)], foreground=[("disabled", DIM)])
        s.configure("Acc.TButton", background=ACC, foreground="white")
        s.map("Acc.TButton", background=[("active", "#6aa0ff"), ("disabled", PANEL)])
        s.configure("TEntry", fieldbackground=FIELD, foreground=FG, insertcolor=FG, borderwidth=0, padding=5)
        s.configure("TNotebook", background=BG, borderwidth=0)
        s.configure("TNotebook.Tab", background=PANEL, foreground=DIM, padding=(16, 7), borderwidth=0)
        s.map("TNotebook.Tab", background=[("selected", FIELD)], foreground=[("selected", FG)])
        s.configure("Treeview", background=PANEL, fieldbackground=PANEL, foreground=FG, rowheight=26, borderwidth=0)
        s.configure("Treeview.Heading", background=FIELD, foreground=FG, relief="flat", font=("Segoe UI", 10, "bold"))
        s.map("Treeview", background=[("selected", ACC)], foreground=[("selected", "white")])
        s.configure("TCheckbutton", background=BG, foreground=FG)

    def _build(self):
        top = ttk.Frame(self, padding=(14, 12, 14, 4)); top.pack(fill="x")
        ttk.Label(top, text="MySite • Tool quản lý", style="Title.TLabel").pack(anchor="w")
        row = ttk.Frame(top); row.pack(fill="x", pady=(8, 0))
        ttk.Label(row, text="Thư mục site").pack(side="left")
        self.folder_var = tk.StringVar()
        ttk.Entry(row, textvariable=self.folder_var, state="readonly").pack(side="left", fill="x", expand=True, padx=8)
        ttk.Button(row, text="Chọn thư mục…", command=self.pick_folder).pack(side="left")
        ttk.Button(row, text="Làm mới", command=self.refresh).pack(side="left", padx=(6, 0))

        self.btns = []
        grid = ttk.Frame(top); grid.pack(fill="x", pady=(10, 0))
        for i, (label, keys) in enumerate(ACTIONS):
            b = ttk.Button(grid, text=label, style="Acc.TButton" if label == "Đẩy Vercel" else "TButton",
                           command=lambda k=keys, l=label: self.run_menu(k, l))
            b.grid(row=i // 7, column=i % 7, sticky="ew", padx=3, pady=3); self.btns.append(b)
        for c in range(7): grid.columnconfigure(c, weight=1)

        self.status1 = ttk.Label(top, text="", style="Dim.TLabel"); self.status1.pack(anchor="w", pady=(8, 0))
        self.status2 = ttk.Label(top, text="", style="Dim.TLabel"); self.status2.pack(anchor="w")

        self.nb = ttk.Notebook(self); self.nb.pack(fill="both", expand=True, padx=14, pady=(8, 14))
        self._tab_games(); self._tab_keys(); self._tab_errors(); self._tab_console()

    def _tree(self, parent, cols):
        f = ttk.Frame(parent); f.pack(fill="both", expand=True)
        t = ttk.Treeview(f, columns=[c[0] for c in cols], show="headings", selectmode="extended")
        for cid, text, w, anchor in cols:
            t.heading(cid, text=text); t.column(cid, width=w, anchor=anchor, stretch=(cid == cols[1][0]))
        sb = ttk.Scrollbar(f, orient="vertical", command=t.yview); t.configure(yscrollcommand=sb.set)
        t.pack(side="left", fill="both", expand=True); sb.pack(side="right", fill="y")
        t.tag_configure("ok", foreground=OK); t.tag_configure("bad", foreground=BAD); t.tag_configure("dim", foreground=DIM)
        return t

    def _tab_games(self):
        f = ttk.Frame(self.nb, padding=8); self.nb.add(f, text="Game")
        self.t_games = self._tree(f, [("n", "#", 40, "e"), ("title", "Tên game", 340, "w"), ("engine", "Engine", 80, "w"),
                                      ("ver", "Phiên bản", 90, "w"), ("size", "GB", 60, "e"), ("date", "Cập nhật", 90, "w"),
                                      ("img", "Ảnh", 60, "e"), ("links", "Link", 60, "e")])

    def _tab_keys(self):
        f = ttk.Frame(self.nb, padding=8); self.nb.add(f, text="Key")
        bar = ttk.Frame(f); bar.pack(fill="x", pady=(0, 6))
        ttk.Button(bar, text="Sửa key đã chọn…", command=self.edit_keys).pack(side="left")
        ttk.Button(bar, text="Tải lại", command=self.load_keys).pack(side="left", padx=6)
        self.key_info = ttk.Label(bar, text="", style="Dim.TLabel"); self.key_info.pack(side="left", padx=10)
        self.t_keys = self._tree(f, [("n", "#", 40, "e"), ("title", "Game", 300, "w"), ("price", "Giá", 90, "e"),
                                     ("fee", "Phí", 80, "e"), ("total", "Khách trả", 100, "e"), ("st", "Trạng thái", 130, "w"),
                                     ("pw", "Mật khẩu ZIP", 170, "w")])
        self.t_keys.bind("<Double-1>", lambda e: self.edit_keys())

    def _tab_errors(self):
        f = ttk.Frame(self.nb, padding=8); self.nb.add(f, text="Lỗi hệ thống")
        bar = ttk.Frame(f); bar.pack(fill="x", pady=(0, 6))
        ttk.Button(bar, text="Tải lại", command=self.load_errors).pack(side="left")
        ttk.Label(bar, text="Bấm đúp một dòng để xem đủ nội dung", style="Dim.TLabel").pack(side="left", padx=10)
        self.t_err = self._tree(f, [("when", "Lúc", 110, "w"), ("src", "Nguồn", 90, "w"), ("alert", "Báo Discord", 90, "w"),
                                    ("path", "Đường dẫn", 200, "w"), ("msg", "Nội dung", 500, "w")])
        self.err_full = {}
        self.t_err.bind("<Double-1>", self.show_error)

    def _tab_console(self):
        f = ttk.Frame(self.nb, padding=8); self.nb.add(f, text="Console")
        self.out = tk.Text(f, bg="#121216", fg=FG, insertbackground=FG, relief="flat", wrap="word",
                           font=("Consolas", 10), state="disabled", padx=8, pady=6)
        sb = ttk.Scrollbar(f, orient="vertical", command=self.out.yview); self.out.configure(yscrollcommand=sb.set)
        bar = ttk.Frame(f); bar.pack(side="bottom", fill="x", pady=(6, 0))
        self.inp = ttk.Entry(bar); self.inp.pack(side="left", fill="x", expand=True)
        self.inp.bind("<Return>", lambda e: self.send())
        ttk.Button(bar, text="Gửi", style="Acc.TButton", command=self.send).pack(side="left", padx=(6, 0))
        ttk.Button(bar, text="Enter trống", command=lambda: self.send("")).pack(side="left", padx=(6, 0))
        ttk.Button(bar, text="Dừng", command=self.stop).pack(side="left", padx=(6, 0))
        ttk.Button(bar, text="Xóa màn hình", command=self.clear).pack(side="left", padx=(6, 0))
        sb.pack(side="right", fill="y"); self.out.pack(side="left", fill="both", expand=True)

    # ---------- thư mục / dữ liệu ----------
    def pick_folder(self):
        d = filedialog.askdirectory(title="Chọn thư mục site (có quan_ly.py)", initialdir=self.folder or str(HERE))
        if d: self.set_folder(d)

    def set_folder(self, d):
        if not (Path(d) / "quan_ly.py").exists():
            return messagebox.showerror("Thiếu file", f"Không thấy quan_ly.py trong:\n{d}")
        try: self.q = load_q(d)
        except SystemExit as e: return messagebox.showerror("Lỗi dữ liệu", str(e))
        except Exception as e: return messagebox.showerror("Không nạp được quan_ly.py", f"{type(e).__name__}: {e}")
        self.folder = d; self.folder_var.set(d); save_cfg({"folder": d})
        self.refresh()

    def refresh(self):
        if not self.q: return
        try: self.games = self.q.load()
        except SystemExit as e: return messagebox.showerror("Lỗi dữ liệu", str(e))
        t = self.t_games; t.delete(*t.get_children())
        for i, g in enumerate(self.games, 1):
            t.insert("", "end", values=(i, g.get("title", ""), g.get("engine", ""), g.get("version", ""), g.get("size", ""),
                                        g.get("updated", g.get("date", "")), (1 if g.get("cover") else 0) + len(g.get("images", [])),
                                        len(g.get("links", []))))
        env = self.q.ENV_FILE.exists()
        git = self.q.has_git()
        self.status1.config(text=f"Game: {len(self.games)}   •   Git: {'có' if git else 'chưa có'}   •   Supabase (.env.local): {'có' if env else 'CHƯA CÓ'}",
                            style="Dim.TLabel")
        self.status2.config(text="", style="Dim.TLabel")
        if env: self.load_keys(); self.load_errors()
        else:
            self.key_info.config(text=".env.local chưa có: không xem được key / lỗi")

    def sb_bg(self, fn, done):
        """Gọi Supabase ở luồng nền (không đơ cửa sổ). done(kq, lỗi) chạy ở luồng giao diện."""
        def work():
            buf = io.StringIO()
            try:
                with contextlib.redirect_stdout(buf): kq = fn()
                err = None
            except Exception as e: kq, err = None, str(e) or type(e).__name__
            if kq is None and err is None: err = " ".join(buf.getvalue().split()) or "Chưa cấu hình Supabase."
            self.after(0, lambda: done(kq, err))
        threading.Thread(target=work, daemon=True).start()

    # ---------- Key ----------
    def load_keys(self):
        if not self.q: return
        self.key_info.config(text="Đang tải…")
        def fn():
            if not self.q.sb_config(): return None
            return self.q._key_rows(), self.q._key_stats()
        def done(kq, err):
            if err: return self.key_info.config(text=err[:140])
            self.keyrows, st = kq
            t = self.t_keys; t.delete(*t.get_children()); n_ok = n_bad = 0
            for i, g in enumerate(self.games, 1):
                r = self.keyrows.get(g["slug"]); icon, label, _ = self.q._key_state(r)
                n_ok += icon == "●"; n_bad += icon == "⚠"
                tag = "ok" if icon == "●" else "bad" if icon == "⚠" else "dim"
                if r: vals = (i, g["title"], vnd(r["price"]), vnd(r["fee"]), vnd(r["price"] + r["fee"]), f"{icon} {label}", r["password"] or "(trống)")
                else: vals = (i, g["title"], "–", "–", "–", f"{icon} {label}", "")
                t.insert("", "end", iid=g["slug"], values=vals, tags=(tag,))
            msg = f"● {n_ok} đang bán   ⚠ {n_bad} cần sửa   ○ {len(self.games) - len(self.keyrows)} chưa đặt"
            if st: msg += f"   |   Hôm nay {st[0]} đơn / {vnd(st[1])}   •   7 ngày {st[2]} đơn / {vnd(st[3])}   •   chờ thanh toán {st[4]}"
            self.key_info.config(text=msg)
            self.status2.config(text=msg, style="Ok.TLabel" if not n_bad else "Bad.TLabel")
        self.sb_bg(fn, done)

    def edit_keys(self):
        slugs = list(self.t_keys.selection())
        if not slugs: return messagebox.showinfo("Chọn game", "Chọn một hoặc nhiều game trong bảng Key.")
        base = self.keyrows.get(slugs[0], {"price": 0, "fee": 0, "password": "", "enabled": True})
        many = len(slugs) > 1
        d = tk.Toplevel(self); d.title("Sửa key"); d.configure(bg=BG, padx=16, pady=14); d.transient(self); d.grab_set()
        ttk.Label(d, text=f"Đang sửa {len(slugs)} game" if many else next(g["title"] for g in self.games if g["slug"] == slugs[0]),
                  style="Title.TLabel").grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 10))
        v_price, v_fee = tk.StringVar(value=str(base["price"])), tk.StringVar(value=str(base["fee"]))
        v_pw, v_on = tk.StringVar(value="" if many else base["password"]), tk.BooleanVar(value=base["enabled"])
        for r, (lab, var) in enumerate([("Giá key (đ)", v_price), ("Phí (đ)", v_fee),
                                        ("Mật khẩu ZIP" + (" (trống = giữ nguyên)" if many else ""), v_pw)], 1):
            ttk.Label(d, text=lab).grid(row=r, column=0, sticky="w", pady=4); ttk.Entry(d, textvariable=var, width=34).grid(row=r, column=1, pady=4, padx=(10, 0))
        ttk.Checkbutton(d, text="Đang bán", variable=v_on).grid(row=4, column=1, sticky="w", pady=4, padx=(10, 0))

        def ok():
            try:
                price = int(v_price.get().replace(".", "").replace(",", "").strip() or 0); fee = int(v_fee.get().replace(".", "").replace(",", "").strip() or 0)
            except ValueError: return messagebox.showerror("Sai số", "Giá và phí phải là số nguyên.", parent=d)
            if not (0 <= price <= 5_000_000 and 0 <= fee <= 5_000_000) or price + fee > 5_000_000:
                return messagebox.showerror("Quá giới hạn", "Giá + phí tối đa 5.000.000đ (web sẽ từ chối tạo đơn).", parent=d)
            pw, on = v_pw.get().strip(), v_on.get(); d.destroy()
            def fn():
                for s in slugs:
                    r = dict(self.keyrows.get(s, {"password": ""}), price=price, fee=fee, enabled=on)
                    if pw: r["password"] = pw
                    self.q._key_save(s, r)
                return True
            def done(_, err):
                if err: messagebox.showerror("Không lưu được", err)
                self.load_keys()
            self.sb_bg(fn, done)
        ttk.Button(d, text="Lưu", style="Acc.TButton", command=ok).grid(row=5, column=1, sticky="e", pady=(12, 0))

    # ---------- Lỗi ----------
    def load_errors(self):
        if not self.q: return
        def fn():
            if not self.q.sb_config(): return None
            return self.q.sb_call("GET", "/rest/v1/error_logs?select=created_at,source,path,message,alerted&order=created_at.desc&limit=50") or []
        def done(rows, err):
            t = self.t_err; t.delete(*t.get_children()); self.err_full = {}
            if err: return t.insert("", "end", values=("", "", "", "", err[:200]), tags=("bad",))
            for r in rows:
                when = self.q._ts(r["created_at"]).astimezone()
                iid = t.insert("", "end", values=(f"{when:%d/%m %H:%M}", "trình duyệt" if r["source"] == "client" else "máy chủ",
                                                   "đã báo" if r["alerted"] else "chưa báo", r["path"] or "-", " ".join(r["message"].split())[:160]))
                self.err_full[iid] = r["message"]
        self.sb_bg(fn, done)

    def show_error(self, _):
        sel = self.t_err.selection()
        if not sel or sel[0] not in self.err_full: return
        d = tk.Toplevel(self); d.title("Chi tiết lỗi"); d.configure(bg=BG); d.geometry("760x360")
        tx = tk.Text(d, bg="#121216", fg=FG, relief="flat", wrap="word", font=("Consolas", 10), padx=8, pady=8)
        tx.insert("1.0", self.err_full[sel[0]]); tx.config(state="disabled"); tx.pack(fill="both", expand=True)

    # ---------- Console: chạy quan_ly.py thật ----------
    def log(self, text, tag=None):
        self.out.config(state="normal"); self.out.insert("end", text, tag); self.out.see("end"); self.out.config(state="disabled")

    def clear(self):
        self.out.config(state="normal"); self.out.delete("1.0", "end"); self.out.config(state="disabled")

    def set_busy(self, busy):
        for b in self.btns: b.state(["disabled"] if busy else ["!disabled"])

    def run_menu(self, keys, label):
        if not self.folder: return messagebox.showinfo("Chưa chọn thư mục", "Chọn thư mục site trước.")
        if self.proc: return messagebox.showinfo("Đang chạy", "Còn một thao tác đang chạy. Làm xong hoặc bấm Dừng ở tab Console.")
        self.nb.select(3); self.clear(); self.log(f"▶ {label}\n", None)
        env = dict(os.environ, PYTHONUNBUFFERED="1", PYTHONIOENCODING="utf-8", NO_COLOR="1")
        try:
            self.proc = subprocess.Popen([sys.executable, "-u", str(Path(self.folder) / "quan_ly.py")], cwd=self.folder, env=env,
                                         stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        except OSError as e: return messagebox.showerror("Không chạy được", str(e))
        self.set_busy(True); self.queue = list(keys); self.since = ""
        threading.Thread(target=self._reader, args=(self.proc,), daemon=True).start()
        self.inp.focus_set()

    def _reader(self, proc):
        dec = codecs.getincrementaldecoder("utf-8")("replace"); fd = proc.stdout.fileno()
        while True:
            try: b = os.read(fd, 4096)
            except OSError: b = b""
            if not b: break
            txt = ANSI.sub("", dec.decode(b)).replace("\r", "")
            self.after(0, self._on_out, proc, txt)
        proc.wait(); self.after(0, self._on_exit, proc)

    def _on_out(self, proc, txt):
        if proc is not self.proc: return
        self.log(txt); self.since += txt
        s = self.since
        # menu chính / menu CMD 7 đang chờ chọn: gửi mục đã định sẵn, hết thì tự thoát
        if s.endswith("Chọn: ") and ("=== MYSITE ===" in s or "=== CMD 7" in s):
            self.send(self.queue.pop(0) if self.queue else "0", echo=True)
        elif s.endswith("(y/N): ") and "Đẩy luôn?" in s and not self.queue:
            self.send("n", echo=True)   # thoát tool mà không hỏi lại việc đẩy: đã có nút Đẩy Vercel

    def send(self, text=None, echo=False):
        p = self.proc
        if not p or p.poll() is not None: return
        if text is None: text = self.inp.get(); self.inp.delete(0, "end")
        if not echo: self.log(text + "\n")
        else: self.log(text + "\n")
        self.since = ""
        try: p.stdin.write((text + "\n").encode("utf-8")); p.stdin.flush()
        except OSError: pass

    def stop(self):
        if self.proc and self.proc.poll() is None: self.proc.terminate(); self.log("\n■ Đã dừng.\n")

    def _on_exit(self, proc):
        if proc is not self.proc: return
        self.proc = None; self.set_busy(False); self.log("\n✔ Xong. Dữ liệu đã được nạp lại.\n")
        try: self.q = load_q(self.folder)   # nạp lại để bảng khớp với file vừa sửa
        except Exception: pass
        self.refresh()


if __name__ == "__main__":
    App().mainloop()
