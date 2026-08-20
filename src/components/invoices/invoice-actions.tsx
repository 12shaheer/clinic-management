"use client";

import { useState, useTransition } from "react";
import { markInvoicePaid } from "@/app/(dashboard)/invoices/actions";

interface InvoiceActionsProps {
  invoiceId: string;
  total: number;
}

export function InvoiceActions({ invoiceId, total }: InvoiceActionsProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
      >
        Mark Paid
      </button>
      {showModal && (
        <PaymentModal
          invoiceId={invoiceId}
          total={total}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function PaymentModal({ invoiceId, total, onClose }: { invoiceId: string; total: number; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const method = formData.get("payment_method") as string;

    if (!amount || amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    startTransition(async () => {
      const result = await markInvoicePaid(invoiceId, amount, method);
      if (result.error) {
        setError(result.error);
      } else if ("paymentCode" in result) {
        setSuccess(result.paymentCode);
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
            <h3 className="text-lg font-semibold text-gray-900">Payment Recorded</h3>
            <p className="mt-2 text-sm text-gray-600">
              Payment: <span className="font-mono font-semibold">{success}</span>
            </p>
            <p className="text-sm text-gray-500">Receipt generated automatically.</p>
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
        <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
        <p className="mt-1 text-sm text-gray-500">Invoice total: PKR {total.toLocaleString()}</p>

        {error && <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount (PKR) *</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="1"
              defaultValue={total}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method *</label>
            <select name="payment_method" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {isPending ? "Processing..." : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
