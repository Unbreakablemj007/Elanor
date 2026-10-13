import { check, db, DbError, invalidate, iso, selectAll, str } from "./client";

export type Customer = {
  customer_id: string;
  name: string;
  phone: string;
  notes: string;
  created_at: string;
};

function toCustomer(r: Record<string, unknown>): Customer {
  return {
    customer_id: str(r.customer_id),
    name: str(r.name),
    phone: str(r.phone),
    notes: str(r.notes),
    created_at: iso(r.created_at),
  };
}

export async function listCustomers(): Promise<Customer[]> {
  return (await selectAll<Record<string, unknown>>("customers", "created_at")).map(toCustomer);
}

export async function getCustomer(id: string): Promise<Customer | null> {
  if (!id) return null;
  const supabase = await db();
  const { data, error } = await supabase.from("customers").select("*").eq("customer_id", id).maybeSingle();
  check(error, "read customer");
  return data ? toCustomer(data) : null;
}

export async function appendCustomer(c: Customer): Promise<void> {
  const supabase = await db();
  const { error } = await supabase.from("customers").insert(c);
  check(error, "add customer");
  invalidate();
}

/** Remove a customer. Their sales stay and become walk-in sales (customer_id is set to null by the database). */
export async function deleteCustomerRecord(id: string): Promise<void> {
  const supabase = await db();
  const { data, error } = await supabase.from("customers").delete().eq("customer_id", id).select("customer_id");
  check(error, "delete customer");
  if (!data?.length) throw new DbError(`${id} was not found.`, true);
  invalidate();
}

export async function updateCustomer(id: string, patch: Partial<Omit<Customer, "customer_id" | "created_at">>) {
  const supabase = await db();
  const { data, error } = await supabase.from("customers").update(patch).eq("customer_id", id).select("customer_id");
  check(error, "update customer");
  if (!data?.length) throw new DbError(`${id} was not found.`, true);
  invalidate();
}
