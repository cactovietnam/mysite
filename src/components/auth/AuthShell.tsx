// Khung chung cho mọi trang tài khoản: tiêu đề, mô tả, nội dung, lối tắt bên dưới.
export default function AuthShell({ title, subtitle, children, footer }: {
  title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-16">
      <div className="text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-balance">{title}</h1>
        {subtitle && <p className="mt-3 text-haze">{subtitle}</p>}
      </div>
      <div className="mt-8">{children}</div>
      {footer && <div className="mt-8 flex flex-col items-center gap-2 text-sm text-haze">{footer}</div>}
    </main>
  );
}
