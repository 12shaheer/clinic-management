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
        let msg = `Payment applied to ${res.invoicesPaid} invoice(s).`;
        if (res.advanceAmount && res.advanceAmount > 0) {
          msg += ` PKR ${res.advanceAmount.toLocaleString()} added as advance credit.`;
        }
        setResult(msg);
        setAmount("");
        setTimeout(() => {
          setShowForm(false);
          setResult(null);
        }, 3000);
      }
    });
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        Collect Payment
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 w-full sm:w-auto">
      <h3 className="text-sm font-semibold text-gray-900">Collect Payment</h3>
      <p className="text-xs text-gray-500 mt-1">
        {totalUnpaid > 0
          ? `Total unpaid: PKR ${totalUnpaid.toLocaleString()}. Any excess will be stored as advance credit.`
          : "No unpaid invoices. Payment will be stored as advance credit."}
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
            placeholder={totalUnpaid > 0 ? totalUnpaid.toString() : "Enter amount"}
            min="1"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {parseFloat(amount) > 0 && (totalUnpaid === 0 || parseFloat(amount) > totalUnpaid) && (
            <p className="mt-1 text-xs text-blue-600">
              PKR {(parseFloat(amount) - totalUnpaid > 0 ? parseFloat(amount) - totalUnpaid : parseFloat(amount)).toLocaleString()} will be stored as advance credit
            </p>
          )}
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
