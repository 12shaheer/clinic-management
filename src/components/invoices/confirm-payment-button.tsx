"use client";

import { useState, useTransition } from "react";
import { confirmPayment } from "@/app/(dashboard)/invoices/actions";

export function ConfirmPaymentButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      await confirmPayment(invoiceId);
      setShowConfirm(false);
    });
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isPending ? "..." : "Yes, Paid"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 md:flex-none flex-1"
    >
      Confirm Payment
    </button>
  );
}
