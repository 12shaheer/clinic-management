"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function NewPaymentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        + New Payment
      </button>
      {open && <NewPaymentModal onClose={() => setOpen(false)} />}
    </>
  );
}

function NewPaymentModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<{ id: string; invoice_code: string; patient_id: string; total: number; status: string; patients: { first_name: string; last_name: string } | null }[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("invoices")
      .select("id, invoice_code, patient_id, total, status, patients(first_name, last_name)")
      .in("status", ["unpaid", "partially_paid"])
      .then(({ data }) => {
        if (data) setInvoices(data as unknown as typeof invoices);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const invoiceId = formData.get("invoice_id") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const paymentMethod = formData.get("payment_method") as string;

    if (!invoiceId || !amount || !paymentMethod) {
      setError("Please fill all required fields.");
      setLoading(false);
      return;
    }

    if (amount <= 0) {
      setError("Amount must be greater than zero.");
      setLoading(false);
      return;
    }

    const invoice = invoices.find((i) => i.id === invoiceId);
    if (!invoice) {
      setError("Invalid invoice selected.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert({
        patient_id: invoice.patient_id,
        invoice_id: invoiceId,
        amount,
        payment_method: paymentMethod,
        payment_status: "completed",
        paid_at: new Date().toISOString(),
      })
      .select("id, payment_code")
      .single();

    if (payError) {
      setError("Failed to create payment.");
      setLoading(false);
      return;
    }

    // Generate receipt
    await supabase.from("receipts").insert({
      payment_id: payment.id,
      patient_id: invoice.patient_id,
      invoice_id: invoiceId,
      amount,
    });

    // Update invoice status
    const { data: allPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("invoice_id", invoiceId)
      .eq("payment_status", "completed");

    const totalPaid = allPayments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
    const invoiceTotal = Number(invoice.total);

    await supabase
      .from("invoices")
      .update({ status: totalPaid >= invoiceTotal ? "paid" : "partially_paid" })
      .eq("id", invoiceId);

    setSuccess(payment.payment_code);
    setLoading(false);
    router.refresh();
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
              Payment ID: <span className="font-mono font-semibold">{success}</span>
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
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Invoice *</label>
            <select name="invoice_id" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="">Select invoice...</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_code} — {inv.patients?.first_name} {inv.patients?.last_name} (PKR {Number(inv.total).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Amount (PKR) *</label>
            <input name="amount" type="number" step="0.01" min="1" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method *</label>
            <select name="payment_method" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="">Select method...</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {loading ? "Processing..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
