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
  const collectedBy = (formData.get("collected_by") as string) || "reception";

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
      status: "paid",
      collected_by: collectedBy,
    })
    .select("id, invoice_code")
    .single();

  if (error) return { error: "Failed to create invoice. " + error.message };

  revalidatePath("/invoices");
  return { invoiceCode: invoice.invoice_code };
}

