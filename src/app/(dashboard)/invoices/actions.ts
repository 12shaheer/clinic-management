"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const patientId = formData.get("patient_id") as string;
  const subtotal = parseFloat(formData.get("subtotal") as string);
  const discount = parseFloat(formData.get("discount") as string) || 0;

  if (!patientId || !subtotal || subtotal <= 0) {
    return { error: "Patient and subtotal are required." };
  }

  const total = subtotal - discount;
  if (total <= 0) {
    return { error: "Total must be greater than zero." };
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      patient_id: patientId,
      subtotal,
      discount,
      total,
      status: "unpaid",
    })
    .select("id, invoice_code")
    .single();

  if (error) return { error: "Failed to create invoice. " + error.message };

  revalidatePath("/invoices");
  revalidatePath("/patients");
  return { invoiceCode: invoice.invoice_code };
}

export async function confirmPayment(invoiceId: string, collectedBy: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: clinicUser } = await supabase
    .from("clinic_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      payment_confirmed_at: new Date().toISOString(),
      confirmed_by: clinicUser?.id || null,
      collected_by: collectedBy,
    })
    .eq("id", invoiceId)
    .in("status", ["unpaid", "partially_paid"]);

  if (error) return { error: "Failed to confirm payment. " + error.message };

  revalidatePath("/invoices");
  revalidatePath("/patients");
  return { success: true };
}

export async function makeSumPayment(patientId: string, amount: number, collectedBy: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: clinicUser } = await supabase
    .from("clinic_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const { data: unpaidInvoices } = await supabase
    .from("invoices")
    .select("id, total")
    .eq("patient_id", patientId)
    .in("status", ["unpaid", "partially_paid"])
    .order("created_at", { ascending: true });

  if (!unpaidInvoices || unpaidInvoices.length === 0) {
    return { error: "No unpaid invoices found." };
  }

  let remaining = amount;
  const invoiceIds: string[] = [];

  for (const inv of unpaidInvoices) {
    if (remaining <= 0) break;
    const invTotal = Number(inv.total);
    if (remaining >= invTotal) {
      invoiceIds.push(inv.id);
      remaining -= invTotal;
    } else {
      invoiceIds.push(inv.id);
      remaining = 0;
    }
  }

  if (invoiceIds.length > 0) {
    const { error } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        payment_confirmed_at: new Date().toISOString(),
        confirmed_by: clinicUser?.id || null,
        collected_by: collectedBy,
      })
      .in("id", invoiceIds);

    if (error) return { error: "Failed to process payment. " + error.message };
  }

  revalidatePath("/invoices");
  revalidatePath("/patients");
  return { success: true, invoicesPaid: invoiceIds.length };
}
