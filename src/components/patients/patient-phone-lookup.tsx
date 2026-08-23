"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { searchPatientByPhone } from "@/app/(dashboard)/patients/actions";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  patient_code: string;
  gender: string | null;
  status: string;
}

interface PatientPhoneLookupProps {
  onSelect: (patient: Patient) => void;
  onClear: () => void;
  selectedPatient: Patient | null;
}

export function PatientPhoneLookup({ onSelect, onClear, selectedPatient }: PatientPhoneLookupProps) {
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setPhone(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await searchPatientByPhone(value);
        if ("patients" in result) {
          setResults(result.patients ?? []);
          setShowResults(true);
        }
      });
    }, 300);
  }

  function handleSelect(patient: Patient) {
    onSelect(patient);
    setPhone("");
    setResults([]);
    setShowResults(false);
  }

  if (selectedPatient) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {selectedPatient.first_name} {selectedPatient.last_name}
            </p>
            <p className="text-xs text-gray-600">
              {selectedPatient.phone} &middot; {selectedPatient.patient_code}
              {selectedPatient.gender && ` · ${selectedPatient.gender}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="tel"
        placeholder="Search by phone number..."
        value={phone}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setShowResults(true)}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      {isPending && (
        <div className="absolute right-3 top-2.5">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
        </div>
      )}
      {showResults && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No patient found with this number.</div>
          ) : (
            results.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => handleSelect(patient)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 first:rounded-t-md last:rounded-b-md"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                  {patient.first_name[0]}{patient.last_name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {patient.first_name} {patient.last_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {patient.phone} &middot; {patient.patient_code}
                    {patient.gender && ` · ${patient.gender}`}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
