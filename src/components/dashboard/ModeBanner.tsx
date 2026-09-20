"use client";

import { useApp } from "@/store/AppStore";

/**
 * Explicit data-source toggle banner: Demo Mode (mock dataset) vs Live
 * Pipeline Feed (FastAPI backend). Offers a one-click retry when the
 * backend is unreachable.
 */
export function ModeBanner() {
  const { state, api } = useApp();
  const live = state.mode === "live";

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border px-4 py-2.5 text-xs shadow-sm ${
        live
          ? "border-teal-200 bg-teal-50 text-teal-900"
          : "border-amber-300 bg-amber-50 text-amber-900"
      }`}
      role="status"
    >
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
          live ? "bg-teal-500" : "bg-amber-500 animate-pulse"
        }`}
        aria-hidden
      />
      {live ? (
        <>
          <span className="font-bold uppercase tracking-wider">Live Pipeline Feed</span>
          <span className="text-teal-800/80">
            Serving evaluated cases from the FastAPI detection → gate → ledger pipeline.
          </span>
        </>
      ) : (
        <>
          <span className="font-bold uppercase tracking-wider">Demo Mode (Mock Data)</span>
          <span className="text-amber-800/80">
            Showing the built-in synthetic dataset — every figure is illustrative.
          </span>
          <button
            onClick={() => api.retryLive()}
            className="ml-auto rounded-lg border border-amber-400 bg-white px-3 py-1 text-[11px] font-bold text-amber-900 transition hover:bg-amber-100"
          >
            ⟳ Connect live backend
          </button>
        </>
      )}
    </div>
  );
}
