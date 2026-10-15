# Cài đặt tài khoản (Supabase + Cloudflare Turnstile)

## 1. Cài thư viện (1 lần)
    npm i @supabase/supabase-js

## 2. Cloudflare Turnstile
1. dash.cloudflare.com -> Turnstile -> Add widget.
2. Hostname: gsvhvn.vercel.app (và localhost để test). Mode: Managed.
3. Lấy **Site key** (đặt vào Vercel) và **Secret key** (dán vào Supabase ở bước 3.4, KHÔNG đặt vào code/Vercel).

## 3. Supabase
1. supabase.com -> New project.
2. SQL Editor -> dán toàn bộ `supabase/schema.sql` -> Run.
3. Authentication -> URL Configuration:
   - Site URL: https://gsvhvn.vercel.app
   - Redirect URLs: https://gsvhvn.vercel.app/** và http://localhost:3000/**
4. Authentication -> Attack Protection -> bật CAPTCHA, chọn Turnstile, dán Secret key.
5. Authentication -> Sign In / Providers -> Email: bật "Confirm email", đặt Minimum password length = 12.
6. **SMTP (bắt buộc)**: Authentication -> SMTP Settings -> bật Custom SMTP.
   Mail mặc định của Supabase chỉ gửi được vài mail/giờ và (project mới) chỉ tới thành viên nhóm, người lạ sẽ không nhận được mã.
   Dùng Resend / Brevo / SendGrid... Resend cần domain riêng đã xác minh (vercel.app không xác minh được).
7. Authentication -> Email Templates: đổi nội dung sang tiếng Việt (Confirm signup, Reset password).

## 4. Biến môi trường
Local: copy `.env.example` thành `.env.local` rồi điền.
Vercel: Project -> Settings -> Environment Variables, thêm 3 biến NEXT_PUBLIC_* rồi Redeploy.

## 5. Thử
/dang-ky -> nhận mail -> bấm link -> /xac-nhan.  /quen-mat-khau -> nhận mail -> /dat-lai-mat-khau.
