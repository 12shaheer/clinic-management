"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getUnpaidInvoices() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_code, patient_id, total, status, patients(first_name, last_name)")
    .in("status", ["unpaid", "partially_paid"]);
  return data ?? [];
}

export async function createPayment(invoiceId: string, amount: number, paymentMethod: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (amount <= 0) return { error: "Amount must be greater than zero." };

  // Get invoice details
  const { data: invoice } = await supabase
    .from("invoices")
    .select("patient_id, total")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return { error: "Invoice not found." };

  // Create payment
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

  if (payError) return { error: "Failed to create payment. " + payError.message };

  // Generate receipt
  await supabase.from("receipts").insert({
    payment_id: payment.id,
    patient_id: invoice.patient_id,
    invoice_id: invoiceId,
    amount,
  });

  // Update invoice status
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

  revalidatePath("/payments");
  revalidatePath("/invoices");
  return { paymentCode: payment.payment_code };
}
