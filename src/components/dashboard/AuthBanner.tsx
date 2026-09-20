"use client";

import { useApp } from "@/store/AppStore";
import { isTokenAuthenticated } from "@/lib/api";

/** Auth banner for decision surfaces (case decision drawer, DM queue).
 *  Shown whenever the signed-in role can act; states the demo-token mode
 *  honestly instead of implying real identity verification. */
export function AuthBanner({ compact = false }: { compact?: boolean }) {
  const { state } = useApp();
  if (state.role !== "district") return null;
  const authed = isTokenAuthenticated();
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 ${
        compact ? "py-1.5 text-[11px]" : "py-2 text-xs"
      } ${
        authed
          ? "border-teal-300 bg-teal-50 text-teal-900"
          : "border-amber-300 bg-amber-50 text-amber-900"
      }`}
      role="status"
    >
      <span aria-hidden>{authed ? "🔒" : "🔓"}</span>
      <span className="font-semibold">
        {authed
          ? "Auth Active: Signed in as District Magistrate (Token Authenticated)"
          : "Auth Missing: decisions will be rejected by the API — set the demo token to act"}
      </span>
    </div>
  );
}
