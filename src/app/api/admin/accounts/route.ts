import { requireAdmin, json } from "@/lib/admin-guard";
import { getAuthSettings } from "@/lib/auth-server";
import { reportError } from "@/lib/notify";
import { validatePassword } from "@/lib/auth-validate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const QUERY = /^\w{0,12}$/; // tên chỉ gồm chữ không dấu, số, gạch dưới
type StateRow = { username_lc: string; failed_attempts: number; locked_at: string | null; updated_at: string };

// GET ?q=tên : tìm tài khoản (chứa chuỗi q, không phân biệt hoa thường), kèm trạng thái khóa. q rỗng = 20 tài khoản đầu.
export async function GET(req: Request) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  const { db } = g;
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!QUERY.test(q)) return json({ code: "invalid" }, 400);

  try {
    let query = db.from("profiles").select("id, username").order("username").limit(20);
    if (q) query = query.ilike("username", `%${q.replace(/_/g, "\\_")}%`); // "_" là ký tự đại diện của LIKE: thoát nó
    const { data: profs, error } = await query;
    if (error) throw error;
    const list = profs ?? [];
    if (list.length === 0) return json({ accounts: [] });

    const cfg = await getAuthSettings(db);
    const { data: states } = await db.from("login_state").select("username_lc, failed_attempts, locked_at, updated_at").in("username_lc", list.map((p) => p.username.toLowerCase()));
    const { data: admins } = await db.from("admins").select("user_id").in("user_id", list.map((p) => p.id));
    const adminIds = new Set<string>(((admins ?? []) as { user_id: string }[]).map((a) => a.user_id));
    const byName = new Map<string, StateRow>(((states ?? []) as StateRow[]).map((s) => [s.username_lc, s] as const));

    const accounts = list.map((p) => {
      const s = byName.get(p.username.toLowerCase());
      // Khớp login_begin: quá lockMinutes kể từ lúc khóa/lần thử cuối thì bộ đếm coi như đã làm lại.
      const stale = !!s && cfg.lockMinutes > 0 && Date.parse(s.locked_at ?? s.updated_at) < Date.now() - cfg.lockMinutes * 60_000;
      return { id: p.id, username: p.username, isAdmin: adminIds.has(p.id),
               failed: s && !stale ? s.failed_attempts : 0, locked: !!s && !stale && !!s.locked_at };
    });
    return json({ accounts });
  } catch (e) {
    await reportError(e, { source: "server", path: "/api/admin/accounts", method: "GET" });
    return json({ code: "error" }, 500);
  }
}

// POST {action: "reset-password" | "unlock", userId, password?}
export async function POST(req: Request) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  const { db, adminId } = g;

  let b: { action?: unknown; userId?: unknown; password?: unknown };
  try { b = await req.json(); } catch { return json({ code: "invalid" }, 400); }
  const { action, userId, password } = b;
  if ((action !== "reset-password" && action !== "unlock") || typeof userId !== "string" || !UUID.test(userId)) return json({ code: "invalid" }, 400);

  try {
    const { data: prof } = await db.from("profiles").select("id, username").eq("id", userId).maybeSingle();
    if (!prof) return json({ code: "not_found" }, 404);

    // Tool này không đổi được mật khẩu của quản trị viên khác (chỉ của chính mình): admin bị lộ tài khoản thì không kéo theo admin còn lại.
    if (userId !== adminId) {
      const { data: target } = await db.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
      if (target) return json({ code: "protected" }, 403);
    }

    if (action === "reset-password") {
      const problem = typeof password === "string" ? validatePassword(password) : "Thiếu mật khẩu.";
      if (problem) return json({ code: "policy", message: problem }, 400);
      const { error } = await db.auth.admin.updateUserById(userId, { password: password as string });
      if (error) {
        if (error.code === "weak_password") return json({ code: "weak" }, 400);
        throw error;
      }
      const rv = await db.rpc("admin_revoke_sessions", { p_user: userId }); // mật khẩu cũ có thể đang bị kẻ khác dùng: đá mọi phiên ra
      if (rv.error) throw rv.error;
    }

    await db.from("login_state").delete().eq("username_lc", prof.username.toLowerCase()); // cả hai thao tác đều gỡ khóa
    const au = await db.from("admin_audit").insert({ admin_id: adminId, action, target_id: userId, target_username: prof.username });
    if (au.error) await reportError(au.error, { source: "server", path: "/api/admin/accounts (audit)", method: "POST" });
    return json({ ok: true });
  } catch (e) {
    await reportError(e, { source: "server", path: "/api/admin/accounts", method: "POST" });
    return json({ code: "error" }, 500);
  }
}
