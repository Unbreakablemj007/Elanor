import { BottomNav, Sidebar } from "@/components/Nav";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/current";
import { getSettings } from "@/lib/db";
import { t } from "@/lib/strings";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");
  const username = staff.name;
  const shopName = await getSettings()
    .then((s) => s.shop_name)
    .catch(() => t.appName);

  return (
    <div className="flex min-h-dvh">
      <Sidebar shopName={shopName} username={username} role={staff.role} />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-10 lg:pt-8 lg:pb-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
      <BottomNav role={staff.role} />
    </div>
  );
}
