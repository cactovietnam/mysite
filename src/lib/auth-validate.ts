export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 12;
export const USERNAME_MAX = 12;

export const USERNAME_RE = /^[A-Za-z0-9_]{3,12}$/;

// Supabase Auth bắt buộc mỗi tài khoản có email, còn web chỉ dùng tên tài khoản nên ghép email nội bộ theo tên.
// ".invalid" là tên miền dành riêng (RFC 2606): không ai sở hữu được, không thư nào gửi đi hay nhận về.
export const AUTH_EMAIL_DOMAIN = "gsvh.invalid";
export const toEmail = (username: string) => `${username.toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;

export const validateUsername = (v: string) =>
  USERNAME_RE.test(v) ? null : "Tên tài khoản gồm 3-12 ký tự: chữ không dấu, số hoặc dấu gạch dưới.";

export const validatePassword = (v: string) =>
  v.length < PASSWORD_MIN ? `Mật khẩu cần tối thiểu ${PASSWORD_MIN} ký tự.`
  : v.length > PASSWORD_MAX ? `Mật khẩu tối đa ${PASSWORD_MAX} ký tự.`
  : null;
