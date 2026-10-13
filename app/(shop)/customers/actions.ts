"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/current";
import { fail, failFromError, ok, zodMessage, type ActionResult } from "@/lib/actions/result";
import { nowIso } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { appendCustomer, updateCustomer, type Customer } from "@/lib/sheets";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\-\s]*$/, "Phone may only contain digits, spaces, +, - and brackets"),
  notes: z.string().trim().max(1000).default(""),
});

export type CustomerInput = z.input<typeof customerSchema>;

export async function createCustomer(input: CustomerInput): Promise<ActionResult<Customer>> {
  await requireUser();
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const customer: Customer = { customer_id: newId("C"), ...parsed.data, created_at: nowIso() };
  try {
    await appendCustomer(customer);
    return ok(customer);
  } catch (err) {
    return failFromError(err);
  }
}

export async function saveCustomer(customer_id: string, input: CustomerInput): Promise<ActionResult<null>> {
  await requireUser();
  const id = z.string().min(1).max(40).safeParse(customer_id);
  const parsed = customerSchema.safeParse(input);
  if (!id.success) return fail(zodMessage(id.error));
  if (!parsed.success) return fail(zodMessage(parsed.error));
  try {
    await updateCustomer(id.data, parsed.data);
    return ok(null);
  } catch (err) {
    return failFromError(err);
  }
}
