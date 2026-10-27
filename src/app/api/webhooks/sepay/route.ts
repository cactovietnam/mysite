import { timingSafeEqual } from "node:crypto";
import { adminClient } from "@/lib/auth-server";
import { json } from "@/lib/admin-guard";
import { reportError } from "@/lib/notify";
import { donateConfig } from "@/data/donate";

// Webhook SePay (biến động số dư MB Bank). Cấu hình ở my.sepay.vn > Tích hợp Webhooks:
//   URL: https://<domain>/api/webhooks/sepay | Kiểu chứng thực: API Key | Header gửi: "Authorization: Apikey <SEPAY_API_KEY>"
// Việc duyệt đơn nằm trong hàm SQL process_bank_tx (một transaction, khóa dòng, idempotent theo provider_tx_id).
type Payload = {
  id?: number | string; gateway?: string; accountNumber?: string; code?: string | null; content?: string;
  transferType?: string; transferAmount?: number; referenceCode?: string; description?: string;
};

const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function POST(req: Request) {
  const secret = process.env.SEPAY_API_KEY;
  if (!secret) {
    await reportError(new Error("Thiếu SEPAY_API_KEY"), { source: "server", path: "/api/webhooks/sepay", method: "POST" });
    return json({ success: false }, 500);
  }
  const auth = req.headers.get("authorization")?.match(/^Apikey (.+)$/i)?.[1] ?? "";
  if (!auth || !safeEq(auth, secret)) return json({ success: false }, 401);

  let p: Payload;
  try { p = await req.json(); } catch { return json({ success: false }, 400); }

  // Chỉ xử lý tiền VÀO, đúng tài khoản nhận. Các giao dịch khác trả 200 để SePay không gọi lại.
  if (p.transferType !== "in") return json({ success: true, ignored: "not_in" });
  if (p.accountNumber && donateConfig.accountNumber && p.accountNumber !== donateConfig.accountNumber) {
    return json({ success: true, ignored: "other_account" });
  }
  const amount = p.transferAmount;
  if (p.id == null || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return json({ success: false }, 400);

  try {
    const { data, error } = await adminClient().rpc("process_bank_tx", {
      p_tx_id: `sepay:${p.id}`,
      p_amount: Math.round(amount),
      p_content: `${p.content ?? ""} ${p.code ?? ""}`.trim(),
      p_raw: p,
    });
    if (error) throw error;
    return json({ success: true, result: data });
  } catch (e) {
    await reportError(e, { source: "server", path: "/api/webhooks/sepay", method: "POST" });
    return json({ success: false }, 500); // 5xx để SePay tự gọi lại; idempotent nên không sợ trùng
  }
}
