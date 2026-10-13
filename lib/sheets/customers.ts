import { appendRows, invalidate, readRecords, str, updateRowById, type SheetRecord } from "./client";

export type Customer = {
  customer_id: string;
  name: string;
  phone: string;
  notes: string;
  created_at: string;
};

const TAB = "Customers" as const;

function toCustomer({ data }: SheetRecord): Customer {
  return {
    customer_id: str(data.customer_id),
    name: str(data.name),
    phone: str(data.phone),
    notes: str(data.notes),
    created_at: str(data.created_at),
  };
}

export async function listCustomers(opts: { fresh?: boolean } = {}): Promise<Customer[]> {
  const records = await readRecords(TAB, opts);
  return records.map(toCustomer).filter((c) => c.customer_id);
}

export async function getCustomer(id: string): Promise<Customer | null> {
  return (await listCustomers()).find((c) => c.customer_id === id) ?? null;
}

export async function appendCustomer(c: Customer): Promise<void> {
  await appendRows(TAB, [c]);
  invalidate(TAB);
}

export async function updateCustomer(id: string, patch: Partial<Omit<Customer, "customer_id" | "created_at">>) {
  await updateRowById(TAB, id, patch);
  invalidate(TAB);
}
