"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SearchX, Loader2 } from "lucide-react";
import {
  fetchUniversalSearch,
  type SearchGroup,
  type SearchResponse,
} from "@/lib/api";
import { useLocale } from "@/lib/i18n";

/**
 * Universal search box: one input that reaches every part of the program —
 * real works register, demo cases, MPs, officials, sealed ledger blocks and
 * states — with a debounced live dropdown, full keyboard navigation and a
 * deep-link to /search for the complete grouped result page.
 *
 * Display-only component: all backend state it touches is the /search
 * endpoint, so it can never corrupt the ledger / verification flow.
 */

const DEBOUNCE_MS = 250;
const DROPDOWN_LIMIT = 5;

type SearchI18nKey =
  | "search.works"
  | "search.cases"
  | "search.mps"
  | "search.officials"
  | "search.ledger"
  | "search.states";

/** Literal-typed keys, so `t()` stays fully type-safe. */
const groupLabelKeys: Record<SearchGroup["key"], SearchI18nKey> = {
  works: "search.works",
  cases: "search.cases",
  mps: "search.mps",
  officials: "search.officials",
  ledger: "search.ledger",
  states: "search.states",
};

function hitPrimary(g: SearchGroup["key"], r: SearchGroup["results"][number]): string {
  switch (g) {
    case "works":
      return r.title ?? r.id ?? "";
    case "cases":
      return r.title ?? r.id ?? "";
    case "mps":
      return r.name ?? "";
    case "officials":
      return `${r.name ?? ""}${r.role ? ` — ${r.role}` : ""}`;
    case "ledger":
      return r.body ?? r.action ?? "";
    case "states":
      return r.name ?? "";
  }
}

function hitSecondary(g: SearchGroup["key"], r: SearchGroup["results"][number]): string {
  switch (g) {
    case "works":
      return [r.mpName, r.district, r.id].filter(Boolean).join(" · ");
    case "cases":
      return [r.id, r.mpName, r.district, r.status].filter(Boolean).join(" · ");
    case "mps":
      return r.usedCr !== undefined ? `₹${r.usedCr} Cr used` : "";
    case "officials":
      return r.district ?? "";
    case "ledger":
      return `Block #${r.index} · ${r.action} · ${r.actor}`;
    case "states":
      return "State rollup";
  }
}

export function UniversalSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { t } = useLocale();
  const [value, setValue] = useState("");
  const [resp, setResp] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  /** Flat index of every navigable row across groups (keyboard nav). Derived
   *  via useMemo instead of a ref mutated during render — reading a ref in
   *  render breaks the react-compiler's memoization and is a render purity
   *  violation. */
  const groups = useMemo(() => resp?.groups ?? [], [resp]);
  const flat = useMemo(() => groups.flatMap((g) => g.results), [groups]);
  const activeIdx = useRef(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  // Close on outside click / Escape.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const runSearch = useCallback(async (term: string) => {
    const mySeq = ++seq.current;
    setLoading(true);
    try {
      const r = await fetchUniversalSearch(term, DROPDOWN_LIMIT);
      if (seq.current === mySeq) setResp(r);
    } catch {
      if (seq.current === mySeq) setResp(null);
    } finally {
      if (seq.current === mySeq) setLoading(false);
    }
  }, []);

  // Debounced live search. The <2-char short-circuit is enforced during
  // render via the derived-state reset below instead of synchronously
  // clearing state inside the effect (react-hooks set-state-in-effect).
  useEffect(() => {
    const term = value.trim();
    if (term.length < 2) return;
    void (async () => {
      await Promise.resolve();
      setLoading(true);
    })();
    const t = window.setTimeout(() => void runSearch(term), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [value, runSearch]);

  const termLen = value.trim().length;
  if (termLen < 2 && (resp !== null || loading)) {
    setResp(null);
    setLoading(false);
  }

  const goto = (href: string) => {
    setOpen(false);
    setValue("");
    setResp(null);
    router.push(href);
  };

  const submit = () => {
    const term = value.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const rows = flat;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!open || rows.length === 0) return;
      e.preventDefault();
      activeIdx.current =
        e.key === "ArrowDown"
          ? (activeIdx.current + 1) % rows.length
          : (activeIdx.current - 1 + rows.length) % rows.length;
      boxRef.current
        ?.querySelectorAll("[data-search-row]")[activeIdx.current]
        ?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIdx.current >= 0 && activeIdx.current < rows.length) {
        goto(rows[activeIdx.current].href);
      } else {
        submit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const totalHits = groups.reduce((a, g) => a + g.results.length, 0);
  const showDropdown = open && value.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative w-full" role="search">
      <div className="flex items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              activeIdx.current = -1;
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={t("brand.searchPlaceholder")}
            aria-label={t("brand.searchAria")}
            aria-expanded={showDropdown && totalHits > 0}
            aria-controls="universal-search-dropdown"
            role="combobox"
            className={`w-full rounded-l-lg border border-white/25 bg-white/10 pl-9 pr-3 text-white placeholder:text-navy-300 focus:border-gov-gold focus:outline-none ${
              compact ? "py-1.5 text-xs" : "py-2 text-sm"
            }`}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-navy-300" aria-hidden />
          )}
        </div>
        <button
          type="button"
          onClick={submit}
          aria-label={t("brand.search")}
          className={`shrink-0 rounded-r-lg border border-l-0 border-white/25 bg-gov-gold font-bold text-gov-deep transition hover:bg-amber-500 ${
            compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
          }`}
        >
          {t("brand.search")}
        </button>
      </div>

      {showDropdown && (
        <div
          id="universal-search-dropdown"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-lg border border-navy-200 bg-white shadow-xl"
        >
          {totalHits === 0 && !loading ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
              <SearchX className="h-4 w-4 shrink-0" aria-hidden />
              {t("search.noMatches")}
            </div>
          ) : (
            <>
              {groups.map((g) => (
                <div key={g.key}>
                  <div className="sticky top-0 flex items-center justify-between border-b border-navy-100 bg-navy-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span>{t(groupLabelKeys[g.key])}</span>
                    <span>
                      {g.total > g.results.length ? `${g.total}+` : g.total}
                    </span>
                  </div>
                  {g.results.map((r, i) => {
                    return (
                      <button
                        key={`${g.key}-${i}`}
                        data-search-row
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => goto(r.href)}
                        className="flex w-full flex-col gap-0.5 border-b border-navy-50 px-3 py-2 text-left transition last:border-b-0 hover:bg-navy-50"
                      >
                        <span className="truncate text-xs font-semibold text-navy-950">
                          {hitPrimary(g.key, r)}
                        </span>
                        <span className="truncate text-[10px] text-slate-500">
                          {hitSecondary(g.key, r)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
              <button
                type="button"
                onClick={submit}
                className="w-full border-t border-navy-100 bg-navy-50 px-3 py-2 text-xs font-bold text-navy-800 transition hover:bg-navy-100"
              >
                {t("search.seeAll")} →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
