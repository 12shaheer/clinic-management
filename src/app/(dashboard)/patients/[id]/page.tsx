import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";

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

  const [{ data: appointments }, { data: invoices }, { data: payments }] =
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
        .limit(10),
      supabase
        .from("payments")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

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
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
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

      {/* Personal Information */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
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

      {/* Appointment History */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
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

      {/* Invoices & Payments */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
          {invoices && invoices.length > 0 ? (
            <div className="mt-4 space-y-3">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="text-sm font-mono">{inv.invoice_code}</p>
                    <p className="text-xs text-gray-500">{format(new Date(inv.issued_at), "MMM d, yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">PKR {Number(inv.total).toLocaleString()}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No invoices.</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
          {payments && payments.length > 0 ? (
            <div className="mt-4 space-y-3">
              {payments.map((pay) => (
                <div key={pay.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="text-sm font-mono">{pay.payment_code}</p>
                    <p className="text-xs text-gray-500">{pay.payment_method}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">PKR {Number(pay.amount).toLocaleString()}</p>
                    <StatusBadge status={pay.payment_status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No payments.</p>
          )}
        </div>
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
