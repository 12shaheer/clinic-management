import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { ConfirmPaymentButton } from "@/components/invoices/confirm-payment-button";
import { SumPaymentButton } from "@/components/invoices/sum-payment-button";
import { ApplyCreditButton } from "@/components/invoices/apply-credit-button";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();

  if (!patient) notFound();

  const [{ data: appointments }, { data: invoices }, { data: creditTransactions }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("*, physiotherapists(first_name, last_name)")
        .eq("patient_id", id)
        .order("appointment_date", { ascending: false })
        .limit(10),
      supabase
        .from("invoices")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("credit_transactions")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const totalUnpaid = invoices?.filter(inv => inv.status === "unpaid" || inv.status === "partially_paid").reduce((sum, inv) => sum + Number(inv.total), 0) ?? 0;
  const unpaidInvoices = invoices?.filter(inv => inv.status === "unpaid" || inv.status === "partially_paid") ?? [];
  const paidInvoices = invoices?.filter(inv => inv.status === "paid" || inv.status === "cancelled") ?? [];
  const creditBalance = Number(patient.credit_balance ?? 0);
  const currentBalance = totalUnpaid - creditBalance;

  return (
    <div>
      <Link href="/patients" className="text-sm text-primary-600 hover:text-primary-700">
        &larr; Back to Patients
      </Link>

      {/* Header */}
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {patient.first_name} {patient.last_name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span className="font-mono">{patient.patient_code}</span>
            <span>&middot;</span>
            <span>{patient.phone}</span>
            <span>&middot;</span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              patient.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
            }`}>
              {patient.status}
            </span>
          </div>
        </div>
      </div>

      {/* Current Balance */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className={`flex-1 rounded-xl border p-5 ${
          currentBalance > 0 ? "border-red-200 bg-red-50" :
          currentBalance < 0 ? "border-blue-200 bg-blue-50" :
          "border-green-200 bg-green-50"
        }`}>
          <p className={`text-xs font-medium ${
            currentBalance > 0 ? "text-red-700" :
            currentBalance < 0 ? "text-blue-700" :
            "text-green-700"
          }`}>Current Balance</p>
          <p className={`mt-1 text-2xl font-bold ${
            currentBalance > 0 ? "text-red-800" :
            currentBalance < 0 ? "text-blue-800" :
            "text-green-800"
          }`}>
            {currentBalance > 0
              ? `PKR ${currentBalance.toLocaleString()} due`
              : currentBalance < 0
              ? `PKR ${Math.abs(currentBalance).toLocaleString()} credit`
              : "Clear"}
          </p>
        </div>
        {creditBalance > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 sm:w-48">
            <p className="text-xs font-medium text-blue-700">Advance Credit</p>
            <p className="mt-1 text-lg font-bold text-blue-800">PKR {creditBalance.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Unpaid Invoices + Payment Actions */}
      {unpaidInvoices.length > 0 && (
        <div className="mt-6 rounded-xl border border-red-200 bg-white p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Unpaid Sessions</h2>
            <SumPaymentButton patientId={id} totalUnpaid={totalUnpaid} />
          </div>
          <div className="mt-4 space-y-3">
            {unpaidInvoices.map((inv) => (
              <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50/50 p-3">
                <div>
                  <p className="text-sm font-mono">{inv.invoice_code}</p>
                  <p className="text-xs text-gray-500">{format(new Date(inv.issued_at), "MMM d, yyyy")}</p>
                  <p className="text-sm font-semibold mt-1">PKR {Number(inv.total).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {creditBalance > 0 && (
                    <ApplyCreditButton patientId={id} invoiceId={inv.id} creditBalance={creditBalance} />
                  )}
                  <ConfirmPaymentButton invoiceId={inv.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit History */}
      {(creditTransactions && creditTransactions.length > 0) && (
        <div className="mt-6 rounded-xl border border-blue-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">Credit History</h2>
          <p className="text-xs text-gray-500 mt-1">Advance payments and credit usage</p>
          <div className="mt-4 space-y-3">
            {creditTransactions.map((tx: { id: string; amount: number; type: string; description: string | null; created_at: string }) => (
              <div key={tx.id} className={`flex items-center justify-between rounded-lg border p-3 ${
                Number(tx.amount) > 0 ? "border-blue-100 bg-blue-50/50" : "border-gray-100"
              }`}>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {tx.type === "advance_payment" ? "Advance Payment" :
                     tx.type === "credit_used" ? "Credit Used" : "Refund"}
                  </p>
                  {tx.description && <p className="text-xs text-gray-500 mt-0.5">{tx.description}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}</p>
                </div>
                <p className={`text-sm font-bold ${Number(tx.amount) > 0 ? "text-blue-700" : "text-red-700"}`}>
                  {Number(tx.amount) > 0 ? "+" : ""}PKR {Math.abs(Number(tx.amount)).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personal Information */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Email" value={patient.email} />
          <InfoItem label="Date of Birth" value={patient.date_of_birth ? format(new Date(patient.date_of_birth), "MMM d, yyyy") : null} />
          <InfoItem label="Gender" value={patient.gender} />
          <InfoItem label="Address" value={patient.address} />
          <InfoItem label="Emergency Contact" value={patient.emergency_contact_name} />
          <InfoItem label="Emergency Phone" value={patient.emergency_contact_phone} />
        </dl>
        {patient.notes && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-500">Notes</p>
            <p className="mt-1 text-sm text-gray-700">{patient.notes}</p>
          </div>
        )}
      </div>

      {/* Paid History */}
      {paidInvoices.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
          <div className="mt-4 space-y-3">
            {paidInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-mono">{inv.invoice_code}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(inv.issued_at), "MMM d, yyyy")}
                    {inv.collected_by && <span> · {inv.collected_by === "credit" ? "Paid via credit" : `Collected at ${inv.collected_by}`}</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">PKR {Number(inv.total).toLocaleString()}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appointment History */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Appointment History</h2>
        {appointments && appointments.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3 pr-4">Physiotherapist</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((apt) => {
                  const physio = apt.physiotherapists as { first_name: string; last_name: string } | null;
                  return (
                    <tr key={apt.id}>
                      <td className="py-3 pr-4 font-mono text-xs">{apt.appointment_code}</td>
                      <td className="py-3 pr-4">{format(new Date(apt.appointment_date), "MMM d, yyyy")}</td>
                      <td className="py-3 pr-4">{apt.start_time} - {apt.end_time}</td>
                      <td className="py-3 pr-4">Dr. {physio?.first_name} {physio?.last_name}</td>
                      <td className="py-3">
                        <StatusBadge status={apt.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">No appointments yet.</p>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || "—"}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: "bg-blue-50 text-blue-700",
    confirmed: "bg-indigo-50 text-indigo-700",
    checked_in: "bg-amber-50 text-amber-700",
    completed: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
    no_show: "bg-gray-100 text-gray-600",
    active: "bg-green-50 text-green-700",
    inactive: "bg-gray-100 text-gray-600",
    paid: "bg-green-50 text-green-700",
    unpaid: "bg-red-50 text-red-700",
    partially_paid: "bg-amber-50 text-amber-700",
    pending: "bg-amber-50 text-amber-700",
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
