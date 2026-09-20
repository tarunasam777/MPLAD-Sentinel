"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const HINTS = ["duplicate road works", "Kishan Reddy", "Hyderabad", "drinking water"];

/**
 * Full-width hero: public-infrastructure photograph under a deep-navy
 * gradient overlay, with a central glassmorphism search bar that searches
 * works by MP name, constituency, work title or district.
 */
export function Hero() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const submit = () => {
    const query = q.trim();
    router.push(query ? `/public?q=${encodeURIComponent(query)}` : "/public");
  };

  return (
    <section className="hero-photo relative isolate overflow-hidden">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 text-center sm:py-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-amber-300">
          Ministry of Statistics &amp; Programme Implementation · DIID
        </p>
        <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
          Every MPLADS work.
          <span className="block text-amber-300">Monitored, verified, auditable.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-navy-100 sm:text-base">
          AI-assisted monitoring of sanctioned works — anomaly detection, critical-risk gates and a
          tamper-proof SHA-256 ledger, open to every citizen.
        </p>

        {/* Glassmorphism search */}
        <form
          role="search"
          className="glass mx-auto mt-8 flex w-full max-w-2xl items-center rounded-2xl p-1.5 shadow-lg"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <span className="pl-3 text-lg text-white/80" aria-hidden>
            🔍
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by MP name, constituency, work title or district…"
            aria-label="Search MPLADS works"
            className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-navy-200 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-gov-gold px-5 py-2.5 text-sm font-bold text-gov-deep transition hover:bg-amber-500"
          >
            Search works
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-navy-200">
          <span className="uppercase tracking-wider">Try:</span>
          {HINTS.map((h) => (
            <button
              key={h}
              onClick={() => router.push(`/public?q=${encodeURIComponent(h)}`)}
              className="glass rounded-full px-3 py-1 font-semibold text-white/90 transition hover:bg-white/25"
            >
              {h}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
