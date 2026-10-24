import { adminClient, sameOrigin } from "@/lib/auth-server";
import { json } from "@/lib/admin-guard";
import { reportError } from "@/lib/notify";
import { games } from "@/data/games";

// Link tải chỉ trả cho người đã đăng nhập: token kiểm thẳng với Supabase Auth ở MÁY CHỦ.
// Link không còn nằm trong HTML/JS của trang game nên không xem được bằng "View source" khi chưa có tài khoản.
export async function GET(req: Request) {
  if (!sameOrigin(req)) return json({ code: "forbidden" }, 403);
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return json({ code: "unauthorized" }, 401);

  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const game = games.find((g) => g.slug === slug);
  if (!game) return json({ code: "not_found" }, 404);

  try {
    const { data, error } = await adminClient().auth.getUser(token);
    if (error && (error.status ?? 0) >= 500) throw error; // lỗi phía Supabase khác với token sai
    if (error || !data.user) return json({ code: "unauthorized" }, 401);
    return json({ links: game.links.filter((l) => /^https?:\/\//i.test(l.url)) });
  } catch (e) {
    await reportError(e, { source: "server", path: "/api/download", method: "GET" });
    return json({ code: "error" }, 500);
  }
}
