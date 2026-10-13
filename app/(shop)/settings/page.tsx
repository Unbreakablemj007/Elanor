import { SheetIcon } from "@/components/icons";
import ThemeToggle from "@/components/ThemeToggle";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { formatInt } from "@/lib/format";
import { getSettings } from "@/lib/db";
import { t } from "@/lib/strings";
import SettingsForm from "./SettingsForm";

export const metadata = { title: t.settings.title };

export default async function SettingsPage() {
  const [username, settings] = await Promise.all([requireUser(), getSettings()]);
  const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  const sheetUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/editor`
    : "https://supabase.com/dashboard/projects";

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={t.settings.title} subtitle={t.settings.signedInAs(username)} back="/more" />
      <div className="space-y-4">
        <SettingsForm rate={settings.exchange_rate_lbp_per_usd} lowStockDefault={settings.low_stock_default} />
        <section className="card space-y-2">
          <h2 className="font-semibold">{t.theme.title}</h2>
          <ThemeToggle />
          <p className="text-xs text-muted">{t.theme.help}</p>
        </section>
        <section className="card space-y-2 text-sm">
          <p className="flex justify-between">
            <span className="text-muted">{t.settings.lbpRounding}</span>
            <span>LBP {formatInt(settings.lbp_rounding)}</span>
          </p>
          <p className="text-muted">{t.settings.sheetHelp}</p>
          <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">
            <SheetIcon />
            {t.settings.openSheet}
          </a>
        </section>
      </div>
    </div>
  );
}
