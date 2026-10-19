"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authConfigured, getSupabase } from "@/lib/supabase";
import { useAuthUser } from "@/lib/auth-store";
import { validatePassword } from "@/lib/auth-validate";
import PasswordField from "@/components/auth/PasswordField";
import { btnCls, fieldCls, linkCls } from "@/components/auth/ui";

type Row = { id: string; username: string; failed: number; locked: boolean; isAdmin: boolean };
type Reply = { accounts?: Row[]; code?: string; message?: string };

// Bỏ ký tự dễ nhầm (0/O, 1/l/I) vì mật khẩu sẽ được đọc/nhắn lại cho người dùng.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomPassword(len = 10) {
  const limit = 256 - (256 % ALPHABET.length); // loại byte lệch để mọi ký tự có xác suất như nhau
  let out = "";
  while (out.length < len) {
    for (const b of crypto.getRandomValues(new Uint8Array(len * 2))) {
      if (b < limit && out.length < len) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

async function call(path: string, init?: { method: "POST"; body: string }): Promise<{ status: number; body: Reply }> {
  const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
  if (!token) return { status: 401, body: {} };
  try {
    const res = await fetch(path, { ...init, cache: "no-store", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as Reply };
  } catch {
    return { status: 0, body: {} };
  }
}

function errText(status: number, b: Reply): string {
  if (status === 0) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.";
  if (b.code === "protected") return "Tool này không đổi được mật khẩu của quản trị viên khác.";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status === 404) return "Không tìm thấy tài khoản.";
  if (b.code === "weak") return "Supabase từ chối mật khẩu này (quá yếu hoặc ngắn hơn mức tối thiểu trong cài đặt Auth). Hãy chọn mật khẩu khác.";
  if (b.code === "policy" && b.message) return b.message;
  return "Có lỗi xảy ra, lỗi đã được báo về Discord.";
}

const smallBtn = "rounded-full bg-white/10 px-4 py-2 text-sm transition hover:bg-white/[0.16] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";

export default function AccountTool() {
  const user = useAuthUser();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState(""); // từ khóa đã tìm (để tải lại sau mỗi thao tác)
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "denied" | "error">("idle");
  const [target, setTarget] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (t: string) => {
    setState("loading");
    const { status, body } = await call(`/api/admin/accounts?q=${encodeURIComponent(t)}`);
    if (status === 200) { setRows(body.accounts ?? []); setState("idle"); }
    else setState(status === 403 ? "denied" : "error");
  }, []);

  useEffect(() => { if (user) void load(""); }, [user, load]);

  if (!authConfigured) return <p className="glass rounded-2xl px-5 py-4 text-haze">Tính năng tài khoản chưa được cấu hình.</p>;
  if (user === undefined) return <p role="status" className="text-haze">Đang tải…</p>;
  if (user === null) {
    return <p className="glass rounded-2xl px-5 py-4 text-haze">Bạn cần <Link href="/dang-nhap" className={linkCls}>đăng nhập</Link> bằng tài khoản quản trị viên.</p>;
  }
  if (state === "denied") return <p role="alert" className="glass rounded-2xl px-5 py-4 text-haze">Tài khoản này không có quyền quản trị.</p>;

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    if (!/^\w{0,12}$/.test(t)) { setNote({ ok: false, text: "Tên tài khoản chỉ gồm chữ không dấu, số, gạch dưới (tối đa 12 ký tự)." }); return; }
    setNote(null); setTerm(t); void load(t);
  };

  const act = async (row: Row, action: "unlock" | "reset-password") => {
    if (busy) return;
    if (action === "reset-password") {
      const problem = validatePassword(pw);
      if (problem) { setNote({ ok: false, text: problem }); return; }
    }
    setBusy(true); setNote(null);
    const { status, body } = await call("/api/admin/accounts", {
      method: "POST",
      body: JSON.stringify({ action, userId: row.id, password: action === "reset-password" ? pw : undefined }),
    });
    setBusy(false);
    if (status === 200) {
      if (action === "reset-password") { setIssued({ username: row.username, password: pw }); setCopied(false); setPw(""); setTarget(null); }
      setNote({ ok: true, text: action === "unlock" ? `Đã mở khóa ${row.username}.` : `Đã đặt lại mật khẩu cho ${row.username}. Mọi thiết bị của tài khoản này đã bị đăng xuất.` });
      await load(term);
      return;
    }
    setNote({ ok: false, text: errText(status, body) });
  };

  return (
    <div className="space-y-5">
      <form onSubmit={search} className="flex gap-2" role="search">
        <label htmlFor="acct-q" className="sr-only">Tên tài khoản</label>
        <input id="acct-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nhập tên tài khoản cần tìm" maxLength={12} autoComplete="off" className={fieldCls} />
        <button type="submit" disabled={state === "loading"} className={`${btnCls} !w-auto shrink-0`}>Tìm</button>
      </form>

      {note && <p role={note.ok ? "status" : "alert"} className={`rounded-2xl px-4 py-3 text-sm ${note.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{note.text}</p>}

      {issued && (
        <div role="status" className="glass space-y-3 rounded-2xl px-5 py-4">
          <p className="text-sm text-haze">Mật khẩu mới của <b className="text-mist">{issued.username}</b> (chỉ hiện lúc này, hãy gửi cho họ rồi đóng):</p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-xl bg-black/30 px-4 py-2 font-mono text-lg tracking-wide">{issued.password}</code>
            <button type="button" className={smallBtn}
                    onClick={() => { void navigator.clipboard?.writeText(issued.password).then(() => setCopied(true)); }}>
              {copied ? "Đã chép" : "Sao chép"}
            </button>
            <button type="button" className={smallBtn} onClick={() => setIssued(null)}>Đóng</button>
          </div>
        </div>
      )}

      {state === "error" && <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">Không tải được danh sách. Thử lại sau ít phút.</p>}
      {state !== "error" && rows.length === 0 && state !== "loading" && <p className="text-haze">Không có tài khoản nào khớp.</p>}

      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="glass rounded-2xl px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {r.username}
                  {r.isAdmin && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-normal text-haze">Quản trị</span>}
                </p>
                <p className="text-xs text-haze">
                  {r.locked ? <span className="text-red-300">Đang bị khóa đăng nhập</span> : r.failed > 0 ? `Đã nhập sai ${r.failed} lần` : "Bình thường"}
                </p>
              </div>
              <div className="flex gap-2">
                {(r.locked || r.failed > 0) && <button type="button" disabled={busy} onClick={() => void act(r, "unlock")} className={smallBtn}>Mở khóa</button>}
                <button type="button" disabled={busy || (r.isAdmin && r.id !== user.id)} aria-expanded={target === r.id}
                        onClick={() => { setTarget(target === r.id ? null : r.id); setPw(""); setNote(null); }} className={smallBtn}>
                  Đổi mật khẩu
                </button>
              </div>
            </div>

            {target === r.id && (
              <div className="mt-4 space-y-3">
                <PasswordField label={`Mật khẩu mới cho ${r.username}`} value={pw} onChange={setPw} placeholder="Mật khẩu mới" autoComplete="new-password" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={smallBtn} onClick={() => setPw(randomPassword())}>Tạo ngẫu nhiên</button>
                  <button type="button" disabled={busy || !pw} onClick={() => void act(r, "reset-password")} className={`${btnCls} !w-auto`}>
                    {busy ? "Đang lưu…" : "Lưu mật khẩu mới"}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
