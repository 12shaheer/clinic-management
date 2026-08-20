"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function startSession(sessionId: string, appointmentId: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase
    .from("sessions")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (appointmentId) {
    await supabase
      .from("appointments")
      .update({ status: "in_session" })
      .eq("id", appointmentId);
  }

  revalidatePath("/sessions");
  revalidatePath("/appointments");
  return { success: true };
}

export async function completeSession(sessionId: string, appointmentId: string | null, notes: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase
    .from("sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      session_notes: notes || null,
    })
    .eq("id", sessionId);

  if (appointmentId) {
    await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", appointmentId);
  }

  revalidatePath("/sessions");
  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  return { success: true };
}
