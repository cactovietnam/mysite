export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 72; // giới hạn bcrypt của Supabase

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validateUsername = (v: string) =>
  USERNAME_RE.test(v) ? null : "Tên đăng nhập gồm 3-20 ký tự: chữ không dấu, số hoặc dấu gạch dưới.";

export const validateEmail = (v: string) => (EMAIL_RE.test(v) ? null : "Email không hợp lệ.");

export const validatePassword = (v: string) =>
  v.length < PASSWORD_MIN ? `Mật khẩu cần tối thiểu ${PASSWORD_MIN} ký tự.`
  : v.length > PASSWORD_MAX ? `Mật khẩu tối đa ${PASSWORD_MAX} ký tự.`
  : null;
