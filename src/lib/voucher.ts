// Dùng được ở cả server lẫn client (không import gì từ server). Phải khớp ràng buộc trong supabase/vouchers.sql và quan_ly.py.
export const VOUCHER_RE = /^[A-Z0-9_-]{2,32}$/;

// Chuẩn hóa mã khách gõ: bỏ khoảng trắng đầu/cuối + IN HOA. Sai định dạng -> null (coi như không tồn tại).
export const normVoucher = (s: unknown): string | null => {
  if (typeof s !== "string") return null;
  const c = s.trim().toUpperCase();
  return VOUCHER_RE.test(c) ? c : null;
};

// Mã lỗi SQL -> {code, HTTP status} trả cho client.
export const VOUCHER_ERRORS: Record<string, { code: string; status: number }> = {
  not_found: { code: "voucher_not_found", status: 404 },
  exhausted: { code: "voucher_exhausted", status: 409 },
  not_applicable: { code: "voucher_not_applicable", status: 409 },
};
export const voucherFail = (e: unknown) => VOUCHER_ERRORS[String(e)] ?? VOUCHER_ERRORS.not_found;
