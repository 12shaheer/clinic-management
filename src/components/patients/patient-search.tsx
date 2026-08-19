"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";

interface PatientSearchProps {
  currentQuery?: string;
  currentStatus?: string;
}

export function PatientSearch({ currentQuery, currentStatus }: PatientSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(currentQuery ?? "");

  const updateParams = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/patients?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Search by name, phone, or patient ID..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            const timeout = setTimeout(() => updateParams("q", e.target.value), 300);
            return () => clearTimeout(timeout);
          }}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      </div>
      <select
        value={currentStatus ?? "all"}
        onChange={(e) => updateParams("status", e.target.value === "all" ? "" : e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="discharged">Discharged</option>
      </select>
    </div>
  );
}
