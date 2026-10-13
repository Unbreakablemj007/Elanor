import { t } from "@/lib/strings";

export const CREDIT_URL = "https://mj-automations.vercel.app";

/** "Developed by MJ Automations" line with a link to the developer's site. */
export default function Credit({ className = "" }: { className?: string }) {
  return (
    <p className={`no-print text-xs text-muted ${className}`}>
      {t.credit.prefix}{" "}
      <a href={CREDIT_URL} target="_blank" rel="noopener" className="font-medium underline-offset-2 hover:text-accent-strong hover:underline">
        {t.credit.name}
      </a>
    </p>
  );
}
