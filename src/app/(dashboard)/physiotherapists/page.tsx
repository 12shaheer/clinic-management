import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export default async function PhysiotherapistsPage() {
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: physiotherapists } = await supabase
    .from("physiotherapists")
    .select("*")
    .order("created_at", { ascending: false });

  // Get today's appointment counts per physio
  const { data: todayApts } = await supabase
    .from("appointments")
    .select("physiotherapist_id")
    .eq("appointment_date", today)
    .neq("status", "cancelled");

  const aptCounts: Record<string, number> = {};
  todayApts?.forEach((apt) => {
    aptCounts[apt.physiotherapist_id] = (aptCounts[apt.physiotherapist_id] || 0) + 1;
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Physiotherapists</h1>
          <p className="mt-1 text-sm text-gray-500">Manage clinic physiotherapists</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {physiotherapists?.map((physio) => (
          <div key={physio.id} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Dr. {physio.first_name} {physio.last_name}
                </h3>
                <p className="text-xs font-mono text-gray-500">{physio.physio_code}</p>
              </div>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                physio.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
              }`}>
                {physio.status}
              </span>
            </div>

            {physio.specialization && (
              <p className="mt-2 text-sm text-gray-600">{physio.specialization}</p>
            )}

            <div className="mt-4 space-y-1 text-sm text-gray-500">
              {physio.email && <p>{physio.email}</p>}
              {physio.phone && <p>{physio.phone}</p>}
            </div>

            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-sm">
                <span className="font-medium text-gray-900">{aptCounts[physio.id] || 0}</span>
                <span className="text-gray-500"> appointments today</span>
              </p>
            </div>
          </div>
        ))}

        {(!physiotherapists || physiotherapists.length === 0) && (
          <div className="col-span-full text-center py-12">
            <p className="text-sm text-gray-500">No physiotherapists registered.</p>
          </div>
        )}
      </div>
    </div>
  );
}
