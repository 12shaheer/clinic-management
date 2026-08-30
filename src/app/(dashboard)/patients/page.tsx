import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import Link from "next/link";
import { format } from "date-fns";
import { PatientSearch } from "@/components/patients/patient-search";
import { NewPatientButton } from "@/components/patients/new-patient-button";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [params, auth, supabase] = await Promise.all([
    searchParams,
    getAuthUser(),
    createClient(),
  ]);

  const isAdmin = auth?.isAdmin ?? false;

  let query = supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.q) {
    query = query.or(
      `first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%,phone.ilike.%${params.q}%,patient_code.ilike.%${params.q}%`
    );
  } else if (!isAdmin) {
    const today = new Date().toISOString().split("T")[0];
    query = query.gte("created_at", today);
  }

  const { data: patients } = await query.limit(50);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Patients</h1>
          <p className="mt-0.5 text-xs md:text-sm text-gray-500">
            {isAdmin ? "Manage patient records" : "Today's patients — search to find others"}
          </p>
        </div>
        <NewPatientButton />
      </div>

      <PatientSearch currentQuery={params.q} currentStatus={params.status} />

      {!isAdmin && !params.q && (
        <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Showing today&apos;s patients. Use the search bar to find a specific patient by name, phone, or code.
        </div>
      )}

      {/* Mobile card view */}
      <div className="mt-6 space-y-3 md:hidden">
        {patients && patients.length > 0 ? (
          patients.map((patient) => (
            <Link
              key={patient.id}
              href={`/patients/${patient.id}`}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
                <span className="text-sm font-semibold text-primary-600">
                  {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {patient.first_name} {patient.last_name}
                </p>
                <p className="text-xs text-gray-500">{patient.patient_code} &middot; {patient.phone}</p>
              </div>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                patient.status === "active" ? "bg-green-50 text-green-700" :
                patient.status === "inactive" ? "bg-gray-100 text-gray-600" :
                "bg-amber-50 text-amber-700"
              }`}>
                {patient.status}
              </span>
            </Link>
          ))
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No patients found.</p>
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="mt-6 hidden md:block rounded-xl border border-gray-200 bg-white overflow-hidden">
        {patients && patients.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3">Patient ID</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Date of Birth</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">{patient.patient_code}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {patient.first_name} {patient.last_name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{patient.phone}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {patient.date_of_birth ? format(new Date(patient.date_of_birth), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      patient.status === "active" ? "bg-green-50 text-green-700" :
                      patient.status === "inactive" ? "bg-gray-100 text-gray-600" :
                      "bg-amber-50 text-amber-700"
                    }`}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No patients found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
