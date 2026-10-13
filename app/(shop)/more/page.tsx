import Link from "next/link";
import { logout } from "@/app/login/actions";
import { ChevronRightIcon, GearIcon, LogoutIcon, UsersIcon, WalletIcon } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { t } from "@/lib/strings";

export const metadata = { title: t.nav.more };

const links = [
  { href: "/customers", label: t.nav.customers, icon: UsersIcon },
  { href: "/expenses", label: t.nav.expenses, icon: WalletIcon },
  { href: "/settings", label: t.nav.settings, icon: GearIcon },
];

export default async function MorePage() {
  const username = await requireUser();
  return (
    <>
      <PageHeader title={t.nav.more} subtitle={t.settings.signedInAs(username)} />
      <ul className="card divide-y divide-line p-0">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-14 items-center gap-3 px-4">
              <Icon className="text-accent-strong" />
              <span className="flex-1 font-medium">{label}</span>
              <ChevronRightIcon className="text-muted" />
            </Link>
          </li>
        ))}
        <li>
          <form action={logout}>
            <button type="submit" className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-danger">
              <LogoutIcon />
              <span className="flex-1 font-medium">{t.nav.logout}</span>
            </button>
          </form>
        </li>
      </ul>
    </>
  );
}
