"use client";

import { useState, useTransition } from "react";

import { generateReport, type DateRange } from "@/app/(dashboard)/reports/actions";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "last_year", label: "Last Year" },
  { value: "all_time", label: "All Time" },
];

interface ReportData {
  summary: {
    totalPatients: number;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    checkedIn: number;
    totalInvoices: number;
    unpaidInvoices: number;
    totalInvoiced: number;
    totalRevenue: number;
    outstandingAmount: number;
  };
  patients: any[];
  appointments: any[];
  invoices: any[];
}

export function ReportsClient() {
  const [range, setRange] = useState<DateRange>("today");
  const [report, setReport] = useState<ReportData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  function handleGenerate() {
    setError("");
    startTransition(async () => {
      const result = await generateReport(range);
      if ("error" in result) {
        setError(result.error!);
      } else {
        setReport(result as ReportData);
      }
    });
  }

  function handleDownload() {
    setError("");
    setIsDownloading(true);
    window.open(`/api/reports/download?range=${range}`, "_blank");
    setTimeout(() => setIsDownloading(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Date Range</label>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as DateRange)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {DATE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isPending ? "Generating..." : "Generate Report"}
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading || isPending}
              className="rounded-lg border border-primary-600 bg-white px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-50"
            >
              {isDownloading ? "Preparing..." : "Download Excel"}
            </button>
          </div>
        </div>

        {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Patients" value={report.summary.totalPatients} />
            <StatCard label="Appointments" value={report.summary.totalAppointments} />
            <StatCard label="Completed" value={report.summary.completedAppointments} color="green" />
            <StatCard label="Cancelled" value={report.summary.cancelledAppointments} color="red" />
            <StatCard label="Checked In" value={report.summary.checkedIn} color="amber" />
            <StatCard label="Invoices" value={report.summary.totalInvoices} />
            <StatCard label="Unpaid" value={report.summary.unpaidInvoices} color="red" />
            <StatCard label="Revenue" value={`PKR ${report.summary.totalRevenue.toLocaleString()}`} color="green" />
            <StatCard label="Invoiced" value={`PKR ${report.summary.totalInvoiced.toLocaleString()}`} />
            <StatCard label="Outstanding" value={`PKR ${report.summary.outstandingAmount.toLocaleString()}`} color="amber" />
          </div>

          <ReportSection title="Patients" count={report.patients.length}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Gender</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Credit Balance</th>
                    <th className="px-3 py-2">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.patients.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-mono text-xs">{p.patient_code}</td>
                      <td className="px-3 py-2">{p.first_name} {p.last_name}</td>
                      <td className="px-3 py-2">{p.phone}</td>
                      <td className="px-3 py-2 capitalize">{p.gender || "—"}</td>
                      <td className="px-3 py-2 capitalize">{p.status}</td>
                      <td className="px-3 py-2 text-right font-medium">PKR {(p.credit_balance || 0).toLocaleString()}</td>
                      <td className="px-3 py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>

          <ReportSection title="Appointments" count={report.appointments.length}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Patient</th>
                    <th className="px-3 py-2">Physiotherapist</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.appointments.map((a) => (
                    <tr key={a.id}>
                      <td className="px-3 py-2 font-mono text-xs">{a.appointment_code}</td>
                      <td className="px-3 py-2">{(a.patients as any)?.first_name} {(a.patients as any)?.last_name}</td>
                      <td className="px-3 py-2">Dr. {(a.physiotherapists as any)?.first_name} {(a.physiotherapists as any)?.last_name}</td>
                      <td className="px-3 py-2">{a.appointment_date}</td>
                      <td className="px-3 py-2">{a.start_time}{a.end_time ? ` - ${a.end_time}` : ""}</td>
                      <td className="px-3 py-2">{a.appointment_type || "—"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>

          <ReportSection title="Invoices" count={report.invoices.length}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Patient</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                    <th className="px-3 py-2 text-right">Discount</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Collected By</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.invoices.map((i) => (
                    <tr key={i.id}>
                      <td className="px-3 py-2 font-mono text-xs">{i.invoice_code}</td>
                      <td className="px-3 py-2">{(i.patients as any)?.first_name} {(i.patients as any)?.last_name}</td>
                      <td className="px-3 py-2 text-right">PKR {i.subtotal?.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">PKR {i.discount?.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-medium">PKR {i.total?.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="px-3 py-2 capitalize">{i.collected_by ? (i.collected_by === "reception" ? "At Reception" : i.collected_by === "doctor" ? "By Doctor" : i.collected_by) : "—"}</td>
                      <td className="px-3 py-2">{new Date(i.issued_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: "green" | "red" | "amber" }) {
  const colorClasses = {
    green: "text-green-700",
    red: "text-red-700",
    amber: "text-amber-700",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color ? colorClasses[color] : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

function ReportSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-sm font-semibold text-gray-900">{title} <span className="text-gray-400">({count})</span></h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-green-50 text-green-700",
    paid: "bg-green-50 text-green-700",
    scheduled: "bg-blue-50 text-blue-700",
    confirmed: "bg-blue-50 text-blue-700",
    checked_in: "bg-amber-50 text-amber-700",
    cancelled: "bg-red-50 text-red-700",
    unpaid: "bg-red-50 text-red-700",
  };

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] || "bg-gray-50 text-gray-700"}`}>
      {status?.replace("_", " ")}
    </span>
  );
}
