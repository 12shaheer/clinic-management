"use client";

import { useState, useTransition } from "react";
import { makeSumPayment } from "@/app/(dashboard)/invoices/actions";

export function SumPaymentButton({ patientId, totalUnpaid }: { patientId: string; totalUnpaid: number }) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [collectedBy, setCollectedBy] = useState("reception");
  const [result, setResult] = useState<string | null>(null);

  function handleSubmit() {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    startTransition(async () => {
      const res = await makeSumPayment(patientId, numAmount, collectedBy);
      if (res.error) {
        setResult(res.error);
      } else {
        setResult(`Payment applied to ${res.invoicesPaid} invoice(s)`);
        setAmount("");
        setTimeout(() => {
          setShowForm(false);
          setResult(null);
        }, 2000);
      }
    });
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        Make Sum Payment
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Sum Payment</h3>
      <p className="text-xs text-gray-500 mt-1">
        Total unpaid: PKR {totalUnpaid.toLocaleString()} — enter amount to clear dues from oldest first.
      </p>

      {result && (
        <div className="mt-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
          {result}
        </div>
      )}

      <div className="mt-3 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700">Amount (PKR)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={totalUnpaid.toString()}
            min="1"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Received at</label>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setCollectedBy("reception")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                collectedBy === "reception" ? "bg-primary-600 text-white" : "bg-white text-gray-600 border border-gray-300"
              }`}
            >
              Reception
            </button>
            <button
              type="button"
              onClick={() => setCollectedBy("doctor")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                collectedBy === "doctor" ? "bg-primary-600 text-white" : "bg-white text-gray-600 border border-gray-300"
              }`}
            >
              Doctor
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={isPending || !amount}
            className="rounded-md bg-primary-600 px-4 py-2 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending ? "Processing..." : "Apply Payment"}
          </button>
          <button
            onClick={() => { setShowForm(false); setResult(null); }}
            className="rounded-md border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
