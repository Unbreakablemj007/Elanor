import { BottomNav, Sidebar } from "@/components/Nav";
import { requireUser } from "@/lib/auth/current";
import { getSettings } from "@/lib/db";
import { t } from "@/lib/strings";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const username = await requireUser();
  const shopName = await getSettings()
    .then((s) => s.shop_name)
    .catch(() => t.appName);

  return (
    <div className="flex min-h-dvh">
      <Sidebar shopName={shopName} username={username} />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-10 lg:pt-8 lg:pb-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
