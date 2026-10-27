// Chỉ import từ route handler. Cấu hình thanh toán QR: lấy tài khoản nhận từ site.json -> donate (cùng nguồn với trang Donate).
import { randomInt } from "node:crypto";
import { donateConfig } from "@/data/donate";

export const ORDER_PREFIX = "GSVH"; // phải khớp regex trong hàm SQL process_bank_tx
export const MIN_AMOUNT = 1000;
export const MAX_AMOUNT = 5_000_000;
export const ORDER_TTL_MIN = 30;

// Bỏ ký tự dễ nhầm (0/O, 1/I) vì khách có thể gõ tay nội dung chuyển khoản.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newOrderCode = () =>
  ORDER_PREFIX + Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

// Mã VietQR của MB là "MB" (img.vietqr.io nhận cả "MB" lẫn "MBBank"). Đổi bank ở site.json -> donate.bankName.
const bankCode = () => donateConfig.bankName.replace(/\s+/g, "") || "MB";

export function qrUrl(amount: number, code: string): string {
  const name = donateConfig.accountHolder ? `&accountName=${encodeURIComponent(donateConfig.accountHolder)}` : "";
  return `https://img.vietqr.io/image/${encodeURIComponent(bankCode())}-${encodeURIComponent(donateConfig.accountNumber)}-compact2.png` +
    `?amount=${amount}&addInfo=${encodeURIComponent(code)}${name}`;
}

export const bankInfo = () => ({
  bankName: donateConfig.bankName,
  accountNumber: donateConfig.accountNumber,
  accountHolder: donateConfig.accountHolder,
});
