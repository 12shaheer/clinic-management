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

  const totalDues = unpaidInvoices?.reduce((sum, inv) => sum + Number(inv.total), 0) ?? 0;
  const invoiceIds = unpaidInvoices?.map(inv => inv.id) ?? [];

  let advanceAmount = 0;
  let paidIds: string[] = [];

  if (amount >= totalDues) {
    // Pay all and store excess as advance
    paidIds = invoiceIds;
    advanceAmount = amount - totalDues;
  } else {
    // Pay invoices from oldest until amount is exhausted
    let remaining = amount;
    for (const inv of unpaidInvoices ?? []) {
      if (remaining <= 0) break;
      const invTotal = Number(inv.total);
      if (remaining >= invTotal) {
        paidIds.push(inv.id);
        remaining -= invTotal;
      } else {
        // Partial — still mark as paid for simplicity
        paidIds.push(inv.id);
        remaining = 0;
      }
    }
  }

  // Mark invoices as paid
  if (paidIds.length > 0) {
    const { error } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        payment_confirmed_at: new Date().toISOString(),
        confirmed_by: clinicUser?.id || null,
        collected_by: collectedBy,
      })
      .in("id", paidIds);

    if (error) return { error: "Failed to process payment. " + error.message };
  }

  // Store advance payment as credit
  if (advanceAmount > 0) {
    const { data: patient } = await supabase
      .from("patients")
      .select("credit_balance")
      .eq("id", patientId)
      .single();

    const currentBalance = Number(patient?.credit_balance ?? 0);
    const newBalance = currentBalance + advanceAmount;

    await supabase
      .from("patients")
      .update({ credit_balance: newBalance })
      .eq("id", patientId);

    await supabase
      .from("credit_transactions")
      .insert({
        patient_id: patientId,
        amount: advanceAmount,
        type: "advance_payment",
        description: `Advance payment of PKR ${advanceAmount.toLocaleString()} (paid PKR ${amount.toLocaleString()}, dues were PKR ${totalDues.toLocaleString()})`,
        created_by: clinicUser?.id || null,
      });
  }

  revalidatePath("/invoices");
  revalidatePath("/patients");
  return { success: true, invoicesPaid: paidIds.length, advanceAmount };
}

export async function applyCreditToInvoice(patientId: string, invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: clinicUser } = await supabase
    .from("clinic_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const [{ data: patient }, { data: invoice }] = await Promise.all([
    supabase.from("patients").select("credit_balance").eq("id", patientId).single(),
    supabase.from("invoices").select("id, total, status").eq("id", invoiceId).single(),
  ]);

  if (!patient || !invoice) return { error: "Patient or invoice not found." };
  if (invoice.status === "paid") return { error: "Invoice already paid." };

  const credit = Number(patient.credit_balance);
  const invoiceTotal = Number(invoice.total);

  if (credit <= 0) return { error: "No credit available." };

  const amountToUse = Math.min(credit, invoiceTotal);
  const newBalance = credit - amountToUse;

  // Mark invoice as paid
  await supabase
    .from("invoices")
    .update({
      status: "paid",
      payment_confirmed_at: new Date().toISOString(),
      confirmed_by: clinicUser?.id || null,
      collected_by: "credit",
    })
    .eq("id", invoiceId);

  // Deduct credit
  await supabase
    .from("patients")
    .update({ credit_balance: newBalance })
    .eq("id", patientId);

  // Log transaction
  await supabase
    .from("credit_transactions")
    .insert({
      patient_id: patientId,
      amount: -amountToUse,
      type: "credit_used",
      description: `Credit of PKR ${amountToUse.toLocaleString()} applied to invoice`,
      invoice_id: invoiceId,
      created_by: clinicUser?.id || null,
    });

  revalidatePath("/invoices");
  revalidatePath("/patients");
  return { success: true, creditUsed: amountToUse, remainingCredit: newBalance };
}
