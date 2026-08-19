import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format } from "date-fns";
import { PatientSearch } from "@/components/patients/patient-search";
import { NewPatientButton } from "@/components/patients/new-patient-button";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

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
  }

  const { data: patients } = await query.limit(50);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage patient records
          </p>
        </div>
        <NewPatientButton />
      </div>

      <PatientSearch currentQuery={params.q} currentStatus={params.status} />

      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
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
