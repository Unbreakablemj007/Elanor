"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { logout } from "@/app/login/actions";
import {
  CartIcon,
  GearIcon,
  HomeIcon,
  LogoutIcon,
  MenuIcon,
  ReceiptIcon,
  TagIcon,
  UsersIcon,
  WalletIcon,
} from "./icons";
import Credit from "./Credit";
import ThemeToggle from "./ThemeToggle";
import { t } from "@/lib/strings";

type Item = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> };

const sidebarItems: Item[] = [
  { href: "/", label: t.nav.dashboard, icon: HomeIcon },
  { href: "/sell", label: t.nav.sell, icon: CartIcon },
  { href: "/products", label: t.nav.products, icon: TagIcon },
  { href: "/sales", label: t.nav.sales, icon: ReceiptIcon },
  { href: "/customers", label: t.nav.customers, icon: UsersIcon },
  { href: "/expenses", label: t.nav.expenses, icon: WalletIcon },
  { href: "/settings", label: t.nav.settings, icon: GearIcon },
];

const bottomItems: Item[] = [
  { href: "/", label: t.nav.dashboard, icon: HomeIcon },
  { href: "/sell", label: t.nav.sell, icon: CartIcon },
  { href: "/products", label: t.nav.products, icon: TagIcon },
  { href: "/sales", label: t.nav.sales, icon: ReceiptIcon },
  { href: "/more", label: t.nav.more, icon: MenuIcon },
];

const moreSections = ["/more", "/customers", "/expenses", "/settings"];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/more") return moreSections.some((p) => pathname.startsWith(p));
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ shopName, username }: { shopName: string; username: string }) {
  const pathname = usePathname();
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-6 lg:flex">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f5ede8] ring-1 ring-line">
          <img src="/brand/mark-ink.png" alt="" width={40} height={40} className="h-10 w-10" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-brand text-xl tracking-wide">{shopName}</span>
          <span className="block text-xs text-muted">{t.appTagline}</span>
        </span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {sidebarItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                active ? "bg-accent-soft text-accent-strong" : "text-ink hover:bg-bg"
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mb-4 px-1">
        <ThemeToggle compact />
      </div>
      <div className="border-t border-line px-3 pt-4 text-xs text-muted">
        <p className="mb-2">{t.settings.signedInAs(username)}</p>
        <form action={logout}>
          <button type="submit" className="flex items-center gap-2 text-sm text-ink hover:text-accent-strong">
            <LogoutIcon width={18} height={18} />
            {t.nav.logout}
          </button>
        </form>
        <Credit className="mt-4" />
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {bottomItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  active ? "text-accent-strong" : "text-muted"
                }`}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
