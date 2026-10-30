import AccountNav from "@/components/account/AccountNav";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 pt-8 sm:pt-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
      <AccountNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
