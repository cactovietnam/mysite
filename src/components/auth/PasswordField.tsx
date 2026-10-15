"use client";
import { useId, useState } from "react";
import { PASSWORD_MAX } from "@/lib/auth-validate";
import { fieldCls } from "./ui";

export default function PasswordField({ label, value, onChange, placeholder, autoComplete }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; autoComplete: "new-password" | "current-password";
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
             placeholder={placeholder} autoComplete={autoComplete} maxLength={PASSWORD_MAX} required
             className={`${fieldCls} pr-14`} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}
              aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-haze transition hover:bg-white/10 hover:text-mist">
        <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" /><circle cx="10" cy="10" r="2.5" />
          {show && <path d="m3 17 14-14" />}
        </svg>
      </button>
    </div>
  );
}
