"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AppointmentActionsProps {
  appointment: {
    id: string;
    status: string;
    patient_id: string;
    physiotherapist_id: string;
  };
}

export function AppointmentActions({ appointment }: AppointmentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCheckIn() {
    setLoading(true);
    const supabase = createClient();

    const { error: aptError } = await supabase
      .from("appointments")
      .update({ status: "checked_in" })
      .eq("id", appointment.id);

    if (aptError) {
      alert("Failed to check in patient.");
      setLoading(false);
      return;
    }

    await supabase.from("sessions").insert({
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      physiotherapist_id: appointment.physiotherapist_id,
      status: "waiting",
    });

    setLoading(false);
    router.refresh();
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setLoading(true);
    const supabase = createClient();

    await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointment.id);

    setLoading(false);
    router.refresh();
  }

  if (appointment.status === "completed" || appointment.status === "cancelled") {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
        <button
          onClick={handleCheckIn}
          disabled={loading}
          className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >
          Check In
        </button>
      )}
      {appointment.status !== "checked_in" && appointment.status !== "in_session" && (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
