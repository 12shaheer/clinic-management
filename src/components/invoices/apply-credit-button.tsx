"use client";

import { useState, useTransition } from "react";
import { applyCreditToInvoice } from "@/app/(dashboard)/invoices/actions";

export function ApplyCreditButton({ patientId, invoiceId, creditBalance }: { patientId: string; invoiceId: string; creditBalance: number }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleApply() {
    startTransition(async () => {
      await applyCreditToInvoice(patientId, invoiceId);
      setShowConfirm(false);
    });
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleApply}
          disabled={isPending}
          className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "..." : "Yes, Use Credit"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="rounded-md bg-blue-50 border border-blue-200 px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
    >
      Use Credit (PKR {creditBalance.toLocaleString()})
    </button>
  );
}
