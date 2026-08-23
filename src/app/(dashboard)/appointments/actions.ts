"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAppointment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const data = {
    patient_id: formData.get("patient_id") as string,
    physiotherapist_id: formData.get("physiotherapist_id") as string,
    appointment_date: formData.get("appointment_date") as string,
    start_time: formData.get("start_time") as string,
    end_time: (formData.get("end_time") as string) || null,
    appointment_type: (formData.get("appointment_type") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };

  if (!data.patient_id || !data.physiotherapist_id || !data.appointment_date || !data.start_time) {
    return { error: "Please fill in all required fields." };
  }

  if (data.end_time && data.end_time <= data.start_time) {
    return { error: "End time must be after start time." };
  }

  const { data: apt, error } = await supabase
    .from("appointments")
    .insert(data)
    .select("appointment_code")
    .single();

  if (error) return { error: "Failed to create appointment. " + error.message };

  revalidatePath("/appointments");
  return { appointmentCode: apt.appointment_code };
}

export async function checkInAppointment(appointmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("appointments")
    .update({ status: "checked_in" })
    .eq("id", appointmentId);

  if (error) return { error: "Failed to check in." };

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createInvoiceForAppointment(appointmentId: string, patientId: string, subtotal: number, discount: number, collectedBy: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!subtotal || subtotal <= 0) return { error: "Total amount is required." };

  const total = subtotal - discount;
  if (total <= 0) return { error: "Total after discount must be greater than zero." };

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      patient_id: patientId,
      appointment_id: appointmentId,
      subtotal,
      discount,
      total,
      status: "paid",
      collected_by: collectedBy,
    })
    .select("id, invoice_code")
    .single();

  if (error) return { error: "Failed to create invoice. " + error.message };

  await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", appointmentId);

  revalidatePath("/appointments");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { invoiceCode: invoice.invoice_code };
}

export async function cancelAppointment(appointmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId);

  if (error) return { error: "Failed to cancel." };

  revalidatePath("/appointments");
  return { success: true };
}


export async function getPhysiotherapists() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("physiotherapists")
    .select("id, first_name, last_name")
    .eq("status", "active");
  return data ?? [];
}
