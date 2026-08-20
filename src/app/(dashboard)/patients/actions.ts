"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPatient(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const data = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
    email: (formData.get("email") as string) || null,
    date_of_birth: (formData.get("date_of_birth") as string) || null,
    gender: (formData.get("gender") as string) || null,
    address: (formData.get("address") as string) || null,
    emergency_contact_name: (formData.get("emergency_contact_name") as string) || null,
    emergency_contact_phone: (formData.get("emergency_contact_phone") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };

  if (!data.first_name || !data.last_name || !data.phone) {
    return { error: "First name, last name, and phone are required." };
  }

  const { data: patient, error } = await supabase
    .from("patients")
    .insert(data)
    .select("patient_code")
    .single();

  if (error) {
    return { error: "Failed to create patient. " + error.message };
  }

  revalidatePath("/patients");
  return { patientCode: patient.patient_code };
}
