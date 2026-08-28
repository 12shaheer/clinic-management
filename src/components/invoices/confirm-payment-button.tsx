"use client";

import { useState, useTransition } from "react";
import { confirmPayment } from "@/app/(dashboard)/invoices/actions";

export function ConfirmPaymentButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [collectedBy, setCollectedBy] = useState("reception");

  function handleConfirm() {
    startTransition(async () => {
      await confirmPayment(invoiceId, collectedBy);
      setShowConfirm(false);
    });
  }

  if (showConfirm) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
        <p className="text-xs font-medium text-gray-700">Payment received at:</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCollectedBy("reception")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              collectedBy === "reception" ? "bg-green-600 text-white" : "bg-white text-gray-600 border border-gray-300"
            }`}
          >
            Reception
          </button>
          <button
            type="button"
            onClick={() => setCollectedBy("doctor")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              collectedBy === "doctor" ? "bg-green-600 text-white" : "bg-white text-gray-600 border border-gray-300"
            }`}
          >
            Doctor
          </button>
        </div>
        <div className="flex gap-2 mt-1">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? "..." : "Confirm Paid"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="rounded-md bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
    >
      Confirm Payment
    </button>
  );
}
