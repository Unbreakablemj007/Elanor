import { PageHeader } from "@/components/ui";
import { t } from "@/lib/strings";

export default function DashboardPage() {
  return <PageHeader title={t.dashboard.title} />;
}
