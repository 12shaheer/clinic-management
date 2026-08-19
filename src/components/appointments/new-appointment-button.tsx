"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function NewAppointmentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        + New Appointment
      </button>
      {open && <NewAppointmentModal onClose={() => setOpen(false)} />}
    </>
  );
}

function NewAppointmentModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<{ id: string; first_name: string; last_name: string; patient_code: string }[]>([]);
  const [physios, setPhysios] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("patients").select("id, first_name, last_name, patient_code").eq("status", "active").then(({ data }) => {
      if (data) setPatients(data);
    });
    supabase.from("physiotherapists").select("id, first_name, last_name").eq("status", "active").then(({ data }) => {
      if (data) setPhysios(data);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      patient_id: formData.get("patient_id") as string,
      physiotherapist_id: formData.get("physiotherapist_id") as string,
      appointment_date: formData.get("appointment_date") as string,
      start_time: formData.get("start_time") as string,
      end_time: formData.get("end_time") as string,
      appointment_type: (formData.get("appointment_type") as string) || null,
      notes: (formData.get("notes") as string) || null,
    };

    if (!data.patient_id || !data.physiotherapist_id || !data.appointment_date || !data.start_time || !data.end_time) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    if (data.end_time <= data.start_time) {
      setError("End time must be after start time.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: apt, error: dbError } = await supabase
      .from("appointments")
      .insert(data)
      .select("appointment_code")
      .single();

    if (dbError) {
      setError("Failed to create appointment. Please try again.");
      setLoading(false);
      return;
    }

    setSuccess(apt.appointment_code);
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
            <h3 className="text-lg font-semibold text-gray-900">Appointment Created</h3>
            <p className="mt-2 text-sm text-gray-600">
              Appointment Code: <span className="font-mono font-semibold">{success}</span>
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
        <h2 className="text-lg font-semibold text-gray-900">New Appointment</h2>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Patient *</label>
            <select name="patient_id" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="">Select patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Physiotherapist *</label>
            <select name="physiotherapist_id" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="">Select physiotherapist...</option>
              {physios.map((p) => (
                <option key={p.id} value={p.id}>Dr. {p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date *</label>
            <input name="appointment_date" type="date" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Time *</label>
              <input name="start_time" type="time" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Time *</label>
              <input name="end_time" type="time" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Appointment Type</label>
            <select name="appointment_type" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="">Select type...</option>
              <option value="Initial Assessment">Initial Assessment</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Treatment">Treatment</option>
              <option value="Review">Review</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea name="notes" rows={2} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {loading ? "Creating..." : "Create Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
