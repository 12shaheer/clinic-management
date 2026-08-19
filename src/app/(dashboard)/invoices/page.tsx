import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import Link from "next/link";

export default async function InvoicesPage() {
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, patients(first_name, last_name, patient_code), sessions(session_code)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="mt-1 text-sm text-gray-500">View and manage invoices</p>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
        {invoices && invoices.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3">Invoice ID</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Session</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => {
                const patient = inv.patients as { first_name: string; last_name: string; patient_code: string } | null;
                const session = inv.sessions as { session_code: string } | null;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{inv.invoice_code}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{patient?.first_name} {patient?.last_name}</p>
                      <p className="text-xs text-gray-500">{patient?.patient_code}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{session?.session_code ?? "—"}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">PKR {Number(inv.total).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        inv.status === "paid" ? "bg-green-50 text-green-700" :
                        inv.status === "unpaid" ? "bg-red-50 text-red-700" :
                        inv.status === "partially_paid" ? "bg-amber-50 text-amber-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {inv.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{format(new Date(inv.issued_at), "MMM d, yyyy")}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No invoices found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
