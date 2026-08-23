"use client";

import { useState, useTransition } from "react";
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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  function handleCheckIn() {
    startTransition(async () => {
      const result = await checkInAppointment(appointment.id);
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
    <>
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
            onClick={() => setShowInvoiceModal(true)}
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
      {showInvoiceModal && (
        <InvoiceModal
          appointmentId={appointment.id}
          patientId={appointment.patient_id}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </>
  );
}

function InvoiceModal({ appointmentId, patientId, onClose }: { appointmentId: string; patientId: string; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const subtotal = parseFloat(formData.get("subtotal") as string);
    const discount = parseFloat(formData.get("discount") as string) || 0;
    const collectedBy = formData.get("collected_by") as string;

    if (!subtotal || subtotal <= 0) {
      setError("Total amount is required.");
      return;
    }

    startTransition(async () => {
      const result = await createInvoiceForAppointment(appointmentId, patientId, subtotal, discount, collectedBy);
      if (result.error) {
        setError(result.error);
      } else if ("invoiceCode" in result) {
        setSuccess(result.invoiceCode!);
      }
    });
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Invoice Created</h3>
            <p className="mt-2 text-sm text-gray-600">
              Invoice: <span className="font-mono font-semibold">{success}</span>
            </p>
            <button onClick={onClose} className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900">Create Invoice</h3>
        <p className="mt-1 text-sm text-gray-500">Enter payment details for this appointment.</p>

        {error && <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Amount (PKR) *</label>
            <input
              name="subtotal"
              type="number"
              step="0.01"
              min="1"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Discount (PKR)</label>
            <input
              name="discount"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Collected By *</label>
            <select
              name="collected_by"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="reception">At Reception</option>
              <option value="doctor">By the Doctor</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {isPending ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
