"use client";

import { useState, useEffect, useTransition } from "react";
import { getInvoiceFormData, createInvoice } from "@/app/(dashboard)/invoices/actions";

export function NewInvoiceButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        + New Invoice
      </button>
      {open && <NewInvoiceModal onClose={() => setOpen(false)} />}
    </>
  );
}

function NewInvoiceModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [patients, setPatients] = useState<{ id: string; first_name: string; last_name: string; patient_code: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");

  useEffect(() => {
    getInvoiceFormData().then(({ patients }) => {
      setPatients(patients);
    });
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createInvoice(formData);
      if (result.error) {
        setError(result.error);
      } else if ("invoiceCode" in result) {
        setSuccess(result.invoiceCode);
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
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">New Invoice</h2>
        <p className="text-sm text-gray-500">Create an invoice for a patient.</p>

        {error && <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Patient *</label>
            <select
              name="patient_id"
              required
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Subtotal (PKR) *</label>
            <input name="subtotal" type="number" step="0.01" min="1" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Discount (PKR)</label>
            <input name="discount" type="number" step="0.01" min="0" defaultValue="0" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {isPending ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
