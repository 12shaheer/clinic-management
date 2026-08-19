import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [
    { count: todayAppointments },
    { count: completedSessions },
    { count: waitingPatients },
    { data: todayPayments },
    { data: recentAppointments },
    { data: recentPayments },
    { data: recentPatients },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("appointment_date", today),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", `${today}T00:00:00`),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "waiting"),
    supabase
      .from("payments")
      .select("amount")
      .eq("payment_status", "completed")
      .gte("paid_at", `${today}T00:00:00`),
    supabase
      .from("appointments")
      .select("*, patients(first_name, last_name, patient_code), physiotherapists(first_name, last_name)")
      .eq("appointment_date", today)
      .order("start_time", { ascending: true })
      .limit(10),
    supabase
      .from("payments")
      .select("*, patients(first_name, last_name, patient_code)")
      .eq("payment_status", "completed")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const todayRevenue = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">
        Overview for {format(new Date(), "EEEE, MMMM d, yyyy")}
      </p>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Appointments" value={todayAppointments ?? 0} color="blue" />
        <StatCard title="Completed Sessions" value={completedSessions ?? 0} color="green" />
        <StatCard title="Waiting Patients" value={waitingPatients ?? 0} color="amber" />
        <StatCard title="Today's Revenue" value={`PKR ${todayRevenue.toLocaleString()}`} color="emerald" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Today's Appointments */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Appointments</h2>
          {recentAppointments && recentAppointments.length > 0 ? (
            <div className="mt-4 space-y-3">
              {recentAppointments.map((apt: Record<string, unknown>) => {
                const patient = apt.patients as { first_name: string; last_name: string; patient_code: string } | null;
                const physio = apt.physiotherapists as { first_name: string; last_name: string } | null;
                return (
                  <div key={apt.id as string} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {patient?.first_name} {patient?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {apt.start_time as string} - {apt.end_time as string} &middot; Dr. {physio?.first_name} {physio?.last_name}
                      </p>
                    </div>
                    <StatusBadge status={apt.status as string} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No appointments today.</p>
          )}
        </div>

        {/* Recent Payments */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
          {recentPayments && recentPayments.length > 0 ? (
            <div className="mt-4 space-y-3">
              {recentPayments.map((pay: Record<string, unknown>) => {
                const patient = pay.patients as { first_name: string; last_name: string; patient_code: string } | null;
                return (
                  <div key={pay.id as string} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {patient?.first_name} {patient?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {pay.payment_code as string} &middot; {pay.payment_method as string}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      PKR {Number(pay.amount).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No recent payments.</p>
          )}
        </div>

        {/* Recent Patients */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">Recent Patients</h2>
          {recentPatients && recentPatients.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="pb-3 pr-4">Patient ID</th>
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Phone</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentPatients.map((patient: Record<string, unknown>) => (
                    <tr key={patient.id as string}>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-600">{patient.patient_code as string}</td>
                      <td className="py-3 pr-4 font-medium text-gray-900">{patient.first_name as string} {patient.last_name as string}</td>
                      <td className="py-3 pr-4 text-gray-600">{patient.phone as string}</td>
                      <td className="py-3 pr-4"><StatusBadge status={patient.status as string} /></td>
                      <td className="py-3 text-gray-500">{format(new Date(patient.created_at as string), "MMM d, yyyy")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No patients registered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: string | number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <div className={`mt-3 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorClasses[color]}`}>
        Today
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: "bg-blue-50 text-blue-700",
    confirmed: "bg-indigo-50 text-indigo-700",
    checked_in: "bg-amber-50 text-amber-700",
    in_session: "bg-purple-50 text-purple-700",
    completed: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
    no_show: "bg-gray-100 text-gray-600",
    active: "bg-green-50 text-green-700",
    inactive: "bg-gray-100 text-gray-600",
    waiting: "bg-amber-50 text-amber-700",
    in_progress: "bg-purple-50 text-purple-700",
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
