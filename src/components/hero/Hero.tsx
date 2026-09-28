"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n";

/**
 * Full-width hero: public-infrastructure photograph under a deep-navy
 * gradient overlay, with a central glassmorphism search bar that searches
 * works by MP name, constituency, work title or district. Shares the
 * global `?q=` search flow with the header search.
 */
export function Hero() {
  const router = useRouter();
  const { t } = useLocale();
  const [q, setQ] = useState("");

  const go = (query: string) => {
    const clean = query.trim();
    router.push(clean ? `/search?q=${encodeURIComponent(clean)}` : "/search");
  };

  // Hints display localized labels but query the English term — the works
  // dataset is English, so a Hindi literal would return zero results.
  const hints: { label: string; query: string }[] = [
    { label: t("hero.hint.duplicates"), query: "duplicate road works" },
    { label: t("hero.hint.kishan"), query: "Kishan Reddy" },
    { label: t("hero.hint.hyderabad"), query: "Hyderabad" },
    { label: t("hero.hint.water"), query: "drinking water" },
  ];

  return (
    <section className="hero-photo relative isolate overflow-hidden">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 text-center sm:py-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-amber-300">
          {t("hero.eyebrow")}
        </p>
        <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
          {t("hero.title1")}
          <span className="block text-amber-300">{t("hero.title2")}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-navy-100 sm:text-base">
          {t("hero.subtitle")}
        </p>

        {/* Glassmorphism search — single global ?q= flow */}
        <form
          role="search"
          className="glass mx-auto mt-8 flex w-full max-w-2xl items-center rounded-2xl p-1.5 shadow-lg"
          onSubmit={(e) => {
            e.preventDefault();
            go(q);
          }}
        >
          <span className="pl-3 text-lg text-white/80" aria-hidden>
            🔍
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("hero.placeholder")}
            aria-label={t("hero.searchAria")}
            className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-navy-200 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-gov-gold px-5 py-2.5 text-sm font-bold text-gov-deep transition hover:bg-amber-500"
          >
            {t("hero.searchBtn")}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-navy-200">
          <span className="uppercase tracking-wider">{t("hero.try")}</span>
          {hints.map((h) => (
            <button
              key={h.query}
              onClick={() => {
                setQ(h.query);
                go(h.query);
              }}
              className="glass rounded-full px-3 py-1 font-semibold text-white/90 transition hover:bg-white/25"
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
