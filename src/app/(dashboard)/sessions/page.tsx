import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { SessionActions } from "@/components/sessions/session-actions";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("sessions")
    .select("*, patients(first_name, last_name, patient_code), physiotherapists(first_name, last_name), appointments(appointment_code)")
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: sessions } = await query.limit(50);

  const sorted = sessions?.sort((a, b) => {
    const priority: Record<string, number> = { waiting: 0, in_progress: 1, completed: 2, cancelled: 3 };
    return (priority[a.status] ?? 4) - (priority[b.status] ?? 4);
  }) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="mt-1 text-sm text-gray-500">Manage treatment sessions</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <form className="flex items-center gap-3">
          <select
            name="status"
            defaultValue={params.status ?? "all"}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All statuses</option>
            <option value="waiting">Waiting</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button type="submit" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Filter
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
        {sorted.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3">Session ID</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Physiotherapist</th>
                <th className="px-6 py-3">Appointment</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((session) => {
                const patient = session.patients as { first_name: string; last_name: string; patient_code: string } | null;
                const physio = session.physiotherapists as { first_name: string; last_name: string } | null;
                const apt = session.appointments as { appointment_code: string } | null;
                return (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{session.session_code}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{patient?.first_name} {patient?.last_name}</p>
                      <p className="text-xs text-gray-500">{patient?.patient_code}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-700">Dr. {physio?.first_name} {physio?.last_name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{apt?.appointment_code ?? "—"}</td>
                    <td className="px-6 py-4 text-gray-700">{format(new Date(session.created_at), "MMM d, yyyy")}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-6 py-4">
                      <SessionActions session={session} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No sessions found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    waiting: "bg-amber-50 text-amber-700",
    in_progress: "bg-purple-50 text-purple-700",
    completed: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
