import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { AppointmentActions } from "@/components/appointments/appointment-actions";
import { NewAppointmentButton } from "@/components/appointments/new-appointment-button";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string; physio?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("appointments")
    .select("*, patients(first_name, last_name, patient_code), physiotherapists(first_name, last_name, physio_code)")
    .order("appointment_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (params.date) {
    query = query.eq("appointment_date", params.date);
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.physio && params.physio !== "all") {
    query = query.eq("physiotherapist_id", params.physio);
  }

  const { data: appointments } = await query.limit(50);

  const { data: physiotherapists } = await supabase
    .from("physiotherapists")
    .select("id, first_name, last_name")
    .eq("status", "active");

  // Sort: active statuses first, completed/cancelled last
  const sorted = appointments?.sort((a, b) => {
    const priority: Record<string, number> = { scheduled: 0, confirmed: 1, checked_in: 2, completed: 3, cancelled: 4, no_show: 5 };
    return (priority[a.status] ?? 7) - (priority[b.status] ?? 7);
  }) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="mt-0.5 text-xs md:text-sm text-gray-500">Manage clinic appointments</p>
        </div>
        <NewAppointmentButton />
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            name="date"
            defaultValue={params.date ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <select
            name="status"
            defaultValue={params.status ?? "all"}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
          <select
            name="physio"
            defaultValue={params.physio ?? "all"}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All physiotherapists</option>
            {physiotherapists?.map((p) => (
              <option key={p.id} value={p.id}>Dr. {p.first_name} {p.last_name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Mobile card view */}
      <div className="mt-6 space-y-3 md:hidden">
        {sorted.length > 0 ? (
          sorted.map((apt) => {
            const patient = apt.patients as { first_name: string; last_name: string; patient_code: string } | null;
            const physio = apt.physiotherapists as { first_name: string; last_name: string; physio_code: string } | null;
            return (
              <div key={apt.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">
                    {patient?.first_name} {patient?.last_name}
                  </p>
                  <StatusBadge status={apt.status} />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {format(new Date(apt.appointment_date), "MMM d")} &middot; {apt.start_time}{apt.end_time ? ` - ${apt.end_time}` : ""} &middot; Dr. {physio?.first_name}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-400">{apt.appointment_code}</span>
                  <AppointmentActions appointment={apt} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No appointments found.</p>
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="mt-6 hidden md:block rounded-xl border border-gray-200 bg-white overflow-hidden">
        {sorted.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Physiotherapist</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((apt) => {
                const patient = apt.patients as { first_name: string; last_name: string; patient_code: string } | null;
                const physio = apt.physiotherapists as { first_name: string; last_name: string; physio_code: string } | null;
                return (
                  <tr key={apt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{apt.appointment_code}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{patient?.first_name} {patient?.last_name}</p>
                      <p className="text-xs text-gray-500">{patient?.patient_code}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-700">Dr. {physio?.first_name} {physio?.last_name}</td>
                    <td className="px-6 py-4 text-gray-700">{format(new Date(apt.appointment_date), "MMM d, yyyy")}</td>
                    <td className="px-6 py-4 text-gray-700">{apt.start_time} - {apt.end_time}</td>
                    <td className="px-6 py-4 text-gray-700">{apt.appointment_type ?? "—"}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={apt.status} />
                    </td>
                    <td className="px-6 py-4">
                      <AppointmentActions appointment={apt} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No appointments found.</p>
          </div>
        )}
      </div>
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
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
