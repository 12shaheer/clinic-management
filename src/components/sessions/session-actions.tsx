"use client";

import { useState, useTransition } from "react";
import { startSession, completeSession } from "@/app/(dashboard)/sessions/actions";

interface SessionActionsProps {
  session: {
    id: string;
    status: string;
    appointment_id: string | null;
  };
}

export function SessionActions({ session }: SessionActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showNotes, setShowNotes] = useState(false);

  function handleStart() {
    startTransition(async () => {
      const result = await startSession(session.id, session.appointment_id);
      if (result.error) alert(result.error);
    });
  }

  function handleComplete(notes: string) {
    startTransition(async () => {
      const result = await completeSession(session.id, session.appointment_id, notes);
      if (result.error) alert(result.error);
      else setShowNotes(false);
    });
  }

  if (session.status === "completed" || session.status === "cancelled") {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {session.status === "waiting" && (
          <button
            onClick={handleStart}
            disabled={isPending}
            className="rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
          >
            Start
          </button>
        )}
        {session.status === "in_progress" && (
          <button
            onClick={() => setShowNotes(true)}
            disabled={isPending}
            className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
          >
            Complete
          </button>
        )}
      </div>

      {showNotes && (
        <CompleteSessionModal
          onClose={() => setShowNotes(false)}
          onComplete={handleComplete}
          loading={isPending}
        />
      )}
    </>
  );
}

function CompleteSessionModal({
  onClose,
  onComplete,
  loading,
}: {
  onClose: () => void;
  onComplete: (notes: string) => void;
  loading: boolean;
}) {
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900">Complete Session</h3>
        <p className="mt-1 text-sm text-gray-500">Add session notes before completing.</p>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Enter session notes..."
          className="mt-4 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => onComplete(notes)}
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Completing..." : "Complete Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
