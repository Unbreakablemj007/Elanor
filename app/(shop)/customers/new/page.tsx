import { PageHeader } from "@/components/ui";
import { t } from "@/lib/strings";
import CustomerForm from "../CustomerForm";

export const metadata = { title: t.customers.new };

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={t.customers.new} back="/customers" />
      <CustomerForm />
    </div>
  );
}
