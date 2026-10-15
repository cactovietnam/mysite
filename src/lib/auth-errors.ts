import type { AuthError } from "@supabase/supabase-js";

// Đổi lỗi Supabase sang tiếng Việt. Không bao giờ hiện nguyên văn lỗi máy chủ cho người dùng.
export function authMessage(err: Pick<AuthError, "code" | "status">): string {
  if (err.status === 0) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  switch (err.code) {
    case "invalid_credentials": return "Email hoặc mật khẩu không đúng.";
    case "email_not_confirmed": return "Email này chưa được xác nhận.";
    case "weak_password": return "Mật khẩu quá yếu hoặc đã bị lộ trên mạng. Hãy chọn mật khẩu khác.";
    case "same_password": return "Mật khẩu mới phải khác mật khẩu cũ.";
    case "captcha_failed": return "Xác minh không hợp lệ hoặc đã hết hạn. Hãy làm lại bước xác minh.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit": return "Bạn thao tác quá nhanh. Đợi một lúc rồi thử lại.";
    case "signup_disabled": return "Hiện chưa mở đăng ký tài khoản.";
    case "unexpected_failure": return "Không tạo được tài khoản. Tên đăng nhập có thể đã được dùng.";
    default: return "Có lỗi xảy ra. Thử lại sau ít phút.";
  }
}
