// Nhớ trang cần quay lại sau khi đăng nhập/đăng ký (vd game đang định tải). Dùng sessionStorage để khỏi phải thêm ?next= vào URL.
const KEY = "after-auth";

export const setReturnTo = (path: string) => {
  try { sessionStorage.setItem(KEY, path); } catch { /* chế độ riêng tư chặn storage: bỏ qua, về trang chủ */ }
};

// Chỉ nhận đường dẫn nội bộ ("/game/abc"), chặn "//evil.com" và "\" để không thành open redirect.
export function takeReturnTo(fallback = "/"): string {
  try {
    const v = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (v && v.startsWith("/") && !v.startsWith("//") && !/[\\\r\n]/.test(v)) return v;
  } catch { /* như trên */ }
  return fallback;
}
