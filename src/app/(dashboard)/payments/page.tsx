import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { NewPaymentButton } from "@/components/payments/new-payment-button";

export default async function PaymentsPage() {
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("*, patients(first_name, last_name, patient_code), invoices(invoice_code)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">Track payment records</p>
        </div>
        <NewPaymentButton />
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
        {payments && payments.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3">Payment ID</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Invoice</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((pay) => {
                const patient = pay.patients as { first_name: string; last_name: string; patient_code: string } | null;
                const invoice = pay.invoices as { invoice_code: string } | null;
                return (
                  <tr key={pay.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{pay.payment_code}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{patient?.first_name} {patient?.last_name}</p>
                      <p className="text-xs text-gray-500">{patient?.patient_code}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{invoice?.invoice_code ?? "—"}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">PKR {Number(pay.amount).toLocaleString()}</td>
                    <td className="px-6 py-4 capitalize text-gray-700">{pay.payment_method.replace(/_/g, " ")}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        pay.payment_status === "completed" ? "bg-green-50 text-green-700" :
                        pay.payment_status === "pending" ? "bg-amber-50 text-amber-700" :
                        pay.payment_status === "failed" ? "bg-red-50 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {pay.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {pay.paid_at ? format(new Date(pay.paid_at), "MMM d, yyyy") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No payments found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
