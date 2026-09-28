"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/store/AppStore";

/** "Sync Live eSAKSHI Feed" button with real-time status feedback.
 *  In live mode the app rehydrates from the backend after a successful
 *  sync; in mock mode the ingested records are merged into the queue and
 *  the counts are reported. Backend unreachable → honest error state.
 *
 *  The sync evaluates 29 records through the full module/ML pipeline
 *  (seconds, not ms), so the button shows a live elapsed-seconds counter
 *  instead of a frozen label. */
export function IngestSyncButton({ compact = false }: { compact?: boolean }) {
  const { state, api } = useApp();
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [detail, setDetail] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef<number>(0);

  // Live elapsed-seconds ticker while a sync is in flight.
  useEffect(() => {
    if (status !== "syncing") return;
    const started = startedRef.current || Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const run = async () => {
    setStatus("syncing");
    setDetail(null);
    startedRef.current = Date.now();
    setElapsed(0);
    try {
      const res = await api.syncIngest();
      setStatus("done");
      setDetail(
        `${res.ingested} ingested · ${res.held} held · ${res.quarantined} quarantined${
          res.portal_live ? " · live portal" : " · fallback batch (portal unreachable)"
        }`
      );
    } catch (err) {
      setStatus("error");
      setDetail(err instanceof Error ? err.message : "Sync failed — is the API running?");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={run}
        disabled={status === "syncing"}
        className={`rounded-md px-3 font-bold text-white transition disabled:opacity-50 ${
          compact ? "py-1.5 text-xs" : "px-4 py-2 text-sm"
        } bg-navy-900 hover:bg-navy-800`}
      >
        {status === "syncing" ? `Evaluating… ${elapsed}s` : "⇅ Sync Live eSAKSHI Feed"}
      </button>
      {status !== "idle" && detail && (
        <span
          role="status"
          className={`text-xs font-semibold ${
            status === "done" ? "text-teal-700" : status === "error" ? "text-gate" : "text-navy-600"
          }`}
        >
          {status === "syncing" ? "Running modules 1–9 on new records…" : detail}
          {state.mode === "mock" && status === "done" ? " · switch to Live mode to audit them on-chain" : ""}
        </span>
      )}
    </div>
  );
}
