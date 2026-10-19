// Chỉ import từ route handler. Quyền admin kiểm ở MÁY CHỦ mỗi request: token hợp lệ + có dòng trong bảng admins.
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, sameOrigin } from "./auth-server";

export const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function requireAdmin(req: Request): Promise<{ db: SupabaseClient; adminId: string } | NextResponse> {
  if (!sameOrigin(req)) return json({ code: "forbidden" }, 403);
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1]; // Bearer, không cookie: không dính CSRF
  if (!token) return json({ code: "unauthorized" }, 401);

  const db = adminClient();
  const { data, error } = await db.auth.getUser(token); // hỏi thẳng Supabase Auth, không tự tin vào nội dung token
  if (error || !data.user) return json({ code: "unauthorized" }, 401);

  const { data: row } = await db.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!row) return json({ code: "forbidden" }, 403);
  return { db, adminId: data.user.id };
}
