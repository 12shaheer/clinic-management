import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import Link from "next/link";
import { NewInvoiceButton } from "@/components/invoices/new-invoice-button";
import { ConfirmPaymentButton } from "@/components/invoices/confirm-payment-button";

export default async function InvoicesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: clinicUser } = await supabase
    .from("clinic_users")
    .select("role")
    .eq("auth_user_id", user!.id)
    .single();

  const isAdmin = clinicUser?.role === "admin";

  let query = supabase
    .from("invoices")
    .select("*, patients(first_name, last_name, patient_code)")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    const today = new Date().toISOString().split("T")[0];
    query = query.or(`created_at.gte.${today},status.in.(unpaid,partially_paid)`);
  }

  const { data: invoices } = await query.limit(50);

  const sorted = invoices?.sort((a, b) => {
    const priority: Record<string, number> = { unpaid: 0, partially_paid: 1, paid: 2, cancelled: 3 };
    return (priority[a.status] ?? 4) - (priority[b.status] ?? 4);
  }) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin ? "All invoices" : "Today's invoices & pending payments"}
          </p>
        </div>
        <NewInvoiceButton />
      </div>

      {/* Mobile card view */}
      <div className="mt-6 space-y-3 md:hidden">
        {sorted.length > 0 ? (
          sorted.map((inv) => {
            const patient = inv.patients as { first_name: string; last_name: string; patient_code: string } | null;
            return (
              <div
                key={inv.id}
                className={`rounded-xl border border-gray-200 bg-white p-4 ${inv.status === "paid" || inv.status === "cancelled" ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{patient?.first_name} {patient?.last_name}</p>
                    <p className="text-xs text-gray-500">{inv.invoice_code}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    inv.status === "paid" ? "bg-green-50 text-green-700" :
                    inv.status === "unpaid" ? "bg-red-50 text-red-700" :
                    inv.status === "partially_paid" ? "bg-amber-50 text-amber-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {inv.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-lg font-semibold text-gray-900">PKR {Number(inv.total).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{format(new Date(inv.issued_at), "MMM d, yyyy")}</p>
                </div>
                {(inv.status === "unpaid" || inv.status === "partially_paid") && (
                  <div className="mt-3 flex items-center gap-2">
                    <ConfirmPaymentButton invoiceId={inv.id} />
                    <Link
                      href={`/patients/${inv.patient_id}`}
                      className="text-xs font-medium text-primary-600"
                    >
                      Patient Profile
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No invoices found. Create one to get started.</p>
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="mt-6 hidden md:block rounded-xl border border-gray-200 bg-white overflow-hidden">
        {sorted.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3">Invoice ID</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((inv) => {
                const patient = inv.patients as { first_name: string; last_name: string; patient_code: string } | null;
                return (
                  <tr key={inv.id} className={`hover:bg-gray-50 ${inv.status === "paid" || inv.status === "cancelled" ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{inv.invoice_code}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{patient?.first_name} {patient?.last_name}</p>
                      <p className="text-xs text-gray-500">{patient?.patient_code}</p>
                    </td>
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
                      <div className="flex items-center gap-2">
                        {(inv.status === "unpaid" || inv.status === "partially_paid") && (
                          <ConfirmPaymentButton invoiceId={inv.id} />
                        )}
                        <Link
                          href={`/patients/${inv.patient_id}`}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700"
                        >
                          Profile
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No invoices found. Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
