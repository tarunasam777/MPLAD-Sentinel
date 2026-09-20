"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/store/AppStore";
import type { Role } from "@/lib/types";

export const roleNames: Record<Role, string> = {
  mp: "Member of Parliament",
  district: "District Magistrate",
  state: "State Nodal Authority",
  ministry: "MoSPI Ministry",
  vendor: "Implementing Agency",
};

export function roleShort(r: Role): string {
  return roleNames[r];
}

const roleOrder: { role: Role; short: string; desc: string }[] = [
  { role: "mp", short: "MP", desc: "Recommend works" },
  { role: "district", short: "DM", desc: "Sanction & inspect" },
  { role: "state", short: "State", desc: "Nodal oversight" },
  { role: "ministry", short: "MoSPI", desc: "Audit & policy" },
  { role: "vendor", short: "I.A.", desc: "Execute works" },
];

export function Emblem({ size = 40 }: { size?: number }) {
  const spokes = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <circle cx="20" cy="20" r="19" fill="#002147" stroke="#d97706" strokeWidth="1.6" />
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="#d97706" strokeWidth="0.8" />
      {spokes.map((a) => (
        <line
          key={a}
          x1="20"
          y1="9"
          x2="20"
          y2="15.5"
          stroke="#d97706"
          strokeWidth="0.7"
          transform={`rotate(${a} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="2.2" fill="#d97706" />
    </svg>
  );
}

type TabKey = "public" | "mp" | "district" | "state" | "audit" | "methodology";

const TABS: { key: TabKey; label: string; icon: string; href: string }[] = [
  { key: "public", label: "Public Citizen View", icon: "🌐", href: "/public" },
  { key: "mp", label: "MP View", icon: "🏛️", href: "/dashboard/mp" },
  { key: "district", label: "District Authority", icon: "⚖️", href: "/dashboard/district" },
  { key: "state", label: "State / Ministry", icon: "🏢", href: "/dashboard/state" },
  { key: "audit", label: "Audit & Ledger", icon: "🔍", href: "/ledger" },
  { key: "methodology", label: "Methodology & ML", icon: "📊", href: "/about-methodology" },
];

export function Header({
  active,
}: {
  active: "home" | "ledger" | "override" | "case" | "public" | "methodology" | string;
}) {
  const { state, api } = useApp();
  const router = useRouter();
  const role = state.role;
  const [fontPct, setFontPct] = useState(100);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontPct}%`;
  }, [fontPct]);

  useEffect(() => {
    document.documentElement.lang = lang === "hi" ? "hi" : "en";
  }, [lang]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const switchTo = (r: Role) => {
    api.setRole(r);
    setMenuOpen(false);
    router.push(`/dashboard/${r}`);
  };

  const submitSearch = () => {
    const q = searchQ.trim();
    router.push(q ? `/public?q=${encodeURIComponent(q)}` : "/public");
  };

  // Which tab is highlighted. Dashboard pages pass active="home"/"case"/"override";
  // resolve those against the current role so tabs stay in sync.
  let activeTab: TabKey | null = null;
  if (active === "public") activeTab = "public";
  else if (active === "ledger") activeTab = "audit";
  else if (active === "methodology") activeTab = "methodology";
  else if (active === "home" || active === "case" || active === "override") {
    if (role === "mp") activeTab = "mp";
    else if (role === "district") activeTab = "district";
    else if (role === "state" || role === "ministry") activeTab = "state";
  }

  const hi = lang === "hi";

  return (
    <header className="sticky top-0 z-40 shadow-md">
      {/* Utility strip */}
      <div className="bg-gov-deep text-white">
        <div className="mx-auto flex h-8 w-full max-w-7xl items-center justify-between gap-3 px-4 text-[10px]">
          <span className="flex items-center gap-2 text-navy-200">
            <span className="gov-barcode h-3 w-10 text-gov-gold" aria-hidden />
            <span className="hidden sm:inline">
              {hi ? "भारत सरकार · मोस्पी · डीआईआईडी" : "Government of India · MoSPI · Data Informatics & Innovation Division"}
            </span>
            <span className="text-gov-gold">{hi ? "एनआईसी·सुरक्षित" : "NIC·secured"}</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${state.mode === "live" ? "bg-teal-400" : "bg-amber-400"}`}
                aria-hidden
              />
              <span className="font-mono">
                {state.mode === "live" ? "LIVE PIPELINE" : "DEMO MODE"}
              </span>
            </span>
            <span
              className="hidden rounded border border-amber-300/70 bg-amber-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200 sm:inline"
              title="All case data, officials, vendors and amounts on this portal are synthetic and illustrative"
            >
              Prototype — Illustrative Data
            </span>
            <span className="hidden items-center gap-1 md:flex">
              <button
                onClick={() => setFontPct((f) => Math.max(90, f - 10))}
                aria-label="Decrease text size"
                className="rounded border border-white/25 px-1.5 py-0.5 font-semibold text-navy-200 hover:bg-white/10"
              >
                A−
              </button>
              <button
                onClick={() => setFontPct(100)}
                aria-label="Reset text size"
                className="rounded border border-white/25 px-1.5 py-0.5 font-bold text-white hover:bg-white/10"
              >
                A
              </button>
              <button
                onClick={() => setFontPct((f) => Math.min(130, f + 10))}
                aria-label="Increase text size"
                className="rounded border border-white/25 px-1.5 py-0.5 font-extrabold text-navy-200 hover:bg-white/10"
              >
                A+
              </button>
            </span>
            <button
              onClick={() => setLang((l) => (l === "en" ? "hi" : "en"))}
              className="rounded border border-white/25 px-2 py-0.5 font-semibold text-navy-200 hover:bg-white/10"
            >
              {hi ? "English" : "हिंदी"}
            </button>
          </span>
        </div>
      </div>

      {/* Branding bar */}
      <div className="border-b border-white/10 bg-gov text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-3">
            <Emblem size={40} />
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-tight">
                {hi ? "एमपीलैड्स सेंटिनल" : "MPLADS Sentinel"}
              </span>
              <span className="block text-[11px] text-navy-200">
                {hi
                  ? "मोस्पी · डेटा सूचना एवं नवाचार प्रभाग"
                  : "MoSPI · Data Informatics & Innovation Division"}
              </span>
            </span>
          </Link>

          {/* Search shortcut */}
          <form
            className="ml-auto hidden w-full max-w-xs items-center md:flex"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch();
            }}
          >
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search works, MPs, districts…"
              aria-label="Search MPLADS works"
              className="w-full rounded-l-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white placeholder:text-navy-300 focus:border-gov-gold focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Search"
              className="rounded-r-lg border border-l-0 border-white/25 bg-gov-gold px-3 py-1.5 text-xs font-bold text-gov-deep transition hover:bg-amber-500"
            >
              🔍
            </button>
          </form>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-white/25 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/10"
            >
              {role ? roleShort(role) : "Select Role"}
              <span aria-hidden>▾</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-navy-200 bg-white text-navy-950 shadow-xl toast-in">
                <div className="border-b border-navy-100 bg-navy-950 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gov-gold">
                  Switch Portal / Role
                </div>
                {roleOrder.map((o) => (
                  <button
                    key={o.role}
                    onClick={() => switchTo(o.role)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold transition hover:bg-navy-50 ${
                      role === o.role ? "bg-navy-100" : ""
                    }`}
                  >
                    <span>
                      {roleShort(o.role)}
                      <span className="block text-[10px] font-normal text-slate-500">{o.desc}</span>
                    </span>
                    {role === o.role && <span className="text-teal-600">✓</span>}
                  </button>
                ))}
                <div className="border-t border-navy-100">
                  <button
                    onClick={() => {
                      api.resetDemo();
                      setMenuOpen(false);
                      router.push("/");
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Reset demo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role-based tab bar */}
      <nav className="border-b border-navy-200 bg-white" aria-label="Portal sections">
        <div className="mx-auto flex w-full max-w-7xl items-stretch gap-1 overflow-x-auto px-4">
          {TABS.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <Link
                key={t.key}
                href={t.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold transition ${
                  isActive ? "text-gov" : "text-slate-500 hover:text-navy-900"
                }`}
              >
                <span aria-hidden>{t.icon}</span>
                {t.label}
                {isActive && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gov-gold" aria-hidden />
                )}
              </Link>
            );
          })}
          {role && (
            <span className="ml-auto hidden items-center gap-2 self-center pl-3 text-[11px] text-slate-500 lg:flex">
              Signed in as
              <span className="rounded bg-gov px-2 py-0.5 text-[11px] font-bold text-white">{roleShort(role)}</span>
              <span className="hidden xl:inline">· Telangana · FY 2025–26</span>
            </span>
          )}
        </div>
      </nav>
    </header>
  );
}
