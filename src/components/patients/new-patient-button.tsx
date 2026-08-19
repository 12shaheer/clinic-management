"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function NewPatientButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        + New Patient
      </button>
      {open && <NewPatientModal onClose={() => setOpen(false)} />}
    </>
  );
}

function NewPatientModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      phone: formData.get("phone") as string,
      email: (formData.get("email") as string) || null,
      date_of_birth: (formData.get("date_of_birth") as string) || null,
      gender: (formData.get("gender") as string) || null,
      address: (formData.get("address") as string) || null,
      emergency_contact_name: (formData.get("emergency_contact_name") as string) || null,
      emergency_contact_phone: (formData.get("emergency_contact_phone") as string) || null,
      notes: (formData.get("notes") as string) || null,
    };

    if (!data.first_name || !data.last_name || !data.phone) {
      setError("First name, last name, and phone are required.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: patient, error: dbError } = await supabase
      .from("patients")
      .insert(data)
      .select("patient_code")
      .single();

    if (dbError) {
      setError("Failed to create patient. Please try again.");
      setLoading(false);
      return;
    }

    setSuccess(patient.patient_code);
    setLoading(false);
    router.refresh();
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Patient Created</h3>
            <p className="mt-2 text-sm text-gray-600">
              Patient ID: <span className="font-mono font-semibold">{success}</span>
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">New Patient</h2>
        <p className="text-sm text-gray-500">Register a new patient record.</p>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name *" name="first_name" required />
            <Field label="Last Name *" name="last_name" required />
          </div>
          <Field label="Phone *" name="phone" type="tel" required />
          <Field label="Email" name="email" type="email" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date of Birth" name="date_of_birth" type="date" />
            <div>
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <select name="gender" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <Field label="Address" name="address" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Emergency Contact" name="emergency_contact_name" />
            <Field label="Emergency Phone" name="emergency_contact_phone" type="tel" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              name="notes"
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>
  );
}
