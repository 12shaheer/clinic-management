"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getInvoiceFormData() {
  const supabase = await createClient();
  const { data: patients } = await supabase
    .from("patients")
    .select("id, first_name, last_name, patient_code")
    .eq("status", "active");
  return { patients: patients ?? [] };
}

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
    })
    .select("invoice_code")
    .single();

  if (error) return { error: "Failed to create invoice. " + error.message };

  revalidatePath("/invoices");
  return { invoiceCode: invoice.invoice_code };
}

export async function markInvoicePaid(invoiceId: string, amount: number, paymentMethod: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (amount <= 0) return { error: "Amount must be greater than zero." };

  const { data: invoice } = await supabase
    .from("invoices")
    .select("patient_id, total")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return { error: "Invoice not found." };

  const { data: payment, error: payError } = await supabase
    .from("payments")
    .insert({
      patient_id: invoice.patient_id,
      invoice_id: invoiceId,
      amount,
      payment_method: paymentMethod,
      payment_status: "completed",
      paid_at: new Date().toISOString(),
    })
    .select("id, payment_code")
    .single();

  if (payError) return { error: "Failed to record payment. " + payError.message };

  await supabase.from("receipts").insert({
    payment_id: payment.id,
    patient_id: invoice.patient_id,
    invoice_id: invoiceId,
    amount,
  });

  // Check total paid and update invoice status
  const { data: allPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId)
    .eq("payment_status", "completed");

  const totalPaid = allPayments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  await supabase
    .from("invoices")
    .update({ status: totalPaid >= Number(invoice.total) ? "paid" : "partially_paid" })
    .eq("id", invoiceId);

  revalidatePath("/invoices");
  return { paymentCode: payment.payment_code };
}
