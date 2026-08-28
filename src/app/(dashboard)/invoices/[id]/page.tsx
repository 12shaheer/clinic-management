import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { PrintButton } from "@/components/invoices/print-button";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, patients(first_name, last_name, patient_code, phone, email, address)")
    .eq("id", id)
    .single();

  if (!invoice) notFound();

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("invoice_id", id)
    .order("created_at", { ascending: false });

  const patient = invoice.patients as { first_name: string; last_name: string; patient_code: string; phone: string; email: string | null; address: string | null };
  const totalPaid = payments?.filter(p => p.payment_status === "completed").reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const remaining = Number(invoice.total) - totalPaid;

  return (
    <div>
      <Link href="/invoices" className="text-sm text-primary-600 hover:text-primary-700">
        &larr; Back to Invoices
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_code}</h1>
          {invoice.payment_confirmed_at && (
            <p className="mt-1 text-xs text-green-700">
              Payment confirmed on {format(new Date(invoice.payment_confirmed_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(invoice.status === "unpaid" || invoice.status === "partially_paid") && (
            <Link
              href={`/patients/${invoice.patient_id}`}
              className="rounded-md bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              Confirm Payment →
            </Link>
          )}
          <PrintButton />
        </div>
      </div>

      {/* Print-friendly invoice */}
      <div id="invoice-print" className="mt-6 rounded-xl border border-gray-200 bg-white p-8 print:border-0 print:shadow-none">
        <div className="flex justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Clinic Management</h2>
            <p className="text-sm text-gray-500">Physiotherapy Clinic</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">INVOICE</p>
            <p className="font-mono text-sm text-gray-600">{invoice.invoice_code}</p>
            <p className="text-sm text-gray-500">
              Issued: {format(new Date(invoice.issued_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">Bill To</p>
            <p className="mt-1 font-medium text-gray-900">{patient.first_name} {patient.last_name}</p>
            <p className="text-sm text-gray-600">{patient.patient_code}</p>
            <p className="text-sm text-gray-600">{patient.phone}</p>
            {patient.address && <p className="text-sm text-gray-600">{patient.address}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase text-gray-400">Details</p>
            <p className="mt-1 text-sm text-gray-600">
              Status: <span className={`font-medium ${
                invoice.status === "paid" ? "text-green-700" :
                invoice.status === "unpaid" ? "text-red-700" : "text-amber-700"
              }`}>{invoice.status.replace(/_/g, " ").toUpperCase()}</span>
            </p>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
              <th className="pb-3">Description</th>
              <th className="pb-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3">Physiotherapy Session</td>
              <td className="py-3 text-right">PKR {Number(invoice.subtotal).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>PKR {Number(invoice.subtotal).toLocaleString()}</span>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-red-600">- PKR {Number(invoice.discount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
              <span>Total</span>
              <span>PKR {Number(invoice.total).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Paid</span>
              <span className="text-green-700">PKR {totalPaid.toLocaleString()}</span>
            </div>
            {remaining > 0 && (
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-500">Remaining</span>
                <span className="text-red-600">PKR {remaining.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment History */}
      {payments && payments.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 print:hidden">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
          <div className="mt-4 space-y-3">
            {payments.map((pay) => (
              <div key={pay.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-mono">{pay.payment_code}</p>
                  <p className="text-xs text-gray-500 capitalize">{pay.payment_method.replace(/_/g, " ")} &middot; {pay.paid_at ? format(new Date(pay.paid_at), "MMM d, yyyy") : "Pending"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">PKR {Number(pay.amount).toLocaleString()}</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    pay.payment_status === "completed" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {pay.payment_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
