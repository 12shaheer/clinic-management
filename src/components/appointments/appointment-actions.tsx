"use client";

import { useTransition } from "react";
import { checkInAppointment, cancelAppointment, createInvoiceForAppointment } from "@/app/(dashboard)/appointments/actions";

interface AppointmentActionsProps {
  appointment: {
    id: string;
    status: string;
    patient_id: string;
  };
}

export function AppointmentActions({ appointment }: AppointmentActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleCheckIn() {
    startTransition(async () => {
      const result = await checkInAppointment(appointment.id);
      if (result.error) alert(result.error);
    });
  }

  function handleCreateInvoice() {
    startTransition(async () => {
      const result = await createInvoiceForAppointment(appointment.id, appointment.patient_id);
      if (result.error) alert(result.error);
    });
  }

  function handleCancel() {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    startTransition(async () => {
      const result = await cancelAppointment(appointment.id);
      if (result.error) alert(result.error);
    });
  }

  if (appointment.status === "completed" || appointment.status === "cancelled") {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
        <button
          onClick={handleCheckIn}
          disabled={isPending}
          className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >
          Check In
        </button>
      )}
      {appointment.status === "checked_in" && (
        <button
          onClick={handleCreateInvoice}
          disabled={isPending}
          className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
        >
          Create Invoice
        </button>
      )}
      {appointment.status !== "checked_in" && (
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
