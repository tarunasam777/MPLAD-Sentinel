"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/store/AppStore";
import { useLocale } from "@/lib/i18n";
import { UniversalSearch } from "@/components/search/UniversalSearch";
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

const roleOrder: { role: Role; key: "mp" | "district" | "state" | "ministry" | "vendor"; short: string }[] = [
  { role: "mp", key: "mp", short: "MP" },
  { role: "district", key: "district", short: "DM" },
  { role: "state", key: "state", short: "State" },
  { role: "ministry", key: "ministry", short: "MoSPI" },
  { role: "vendor", key: "vendor", short: "I.A." },
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

type TabKey = "public" | "mp" | "district" | "state" | "audit" | "methodology" | "works";

const TABS: { key: TabKey; i18n: "tab.public" | "tab.mp" | "tab.district" | "tab.state" | "tab.audit" | "tab.methodology" | "tab.works"; icon: string; href: string }[] = [
  { key: "public", i18n: "tab.public", icon: "🌐", href: "/public" },
  { key: "works", i18n: "tab.works", icon: "📋", href: "/works" },
  { key: "mp", i18n: "tab.mp", icon: "🏛️", href: "/dashboard/mp" },
  { key: "district", i18n: "tab.district", icon: "⚖️", href: "/dashboard/district" },
  { key: "state", i18n: "tab.state", icon: "🏢", href: "/dashboard/state" },
  { key: "audit", i18n: "tab.audit", icon: "🔍", href: "/ledger" },
  { key: "methodology", i18n: "tab.methodology", icon: "📊", href: "/about-methodology" },
];

export function Header({
  active,
}: {
  active: "home" | "ledger" | "override" | "case" | "public" | "methodology" | string;
}) {
  const { state, api } = useApp();
  const { t, toggle } = useLocale();
  const router = useRouter();
  const role = state.role;
  const [fontPct, setFontPct] = useState(100);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontPct}%`;
  }, [fontPct]);

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

  let activeTab: TabKey | null = null;
  if (active === "public") activeTab = "public";
  else if (active === "works") activeTab = "works";
  else if (active === "ledger") activeTab = "audit";
  else if (active === "methodology") activeTab = "methodology";
  else if (active === "home" || active === "case" || active === "override") {
    if (role === "mp") activeTab = "mp";
    else if (role === "district") activeTab = "district";
    else if (role === "state" || role === "ministry") activeTab = "state";
  }

  return (
    <header className="sticky top-0 z-40 shadow-md">
      {/* Utility strip — government/security indicators only */}
      <div className="bg-gov-deep text-white">
        <div className="mx-auto flex h-8 w-full max-w-7xl items-center justify-between gap-3 px-4 text-[10px]">
          <span className="flex items-center gap-2 text-navy-200">
            <span className="gov-barcode h-3 w-10 text-gov-gold" aria-hidden />
            <span className="hidden sm:inline">{t("util.gov")}</span>
            <span className="text-gov-gold">{t("util.nic")}</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${state.mode === "live" ? "bg-teal-400" : "bg-amber-400"}`}
                aria-hidden
              />
              <span className="font-mono">{state.mode === "live" ? t("util.live") : t("util.demo")}</span>
            </span>
            <span
              className="hidden rounded border border-amber-300/70 bg-amber-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200 sm:inline"
              title={t("util.prototypeTip")}
            >
              {t("util.prototype")}
            </span>
            <span className="hidden items-center gap-1 md:flex">
              <button
                onClick={() => setFontPct((f) => Math.max(90, f - 10))}
                aria-label={t("util.fontDecrease")}
                className="rounded border border-white/25 px-1.5 py-0.5 font-semibold text-navy-200 hover:bg-white/10"
              >
                A−
              </button>
              <button
                onClick={() => setFontPct(100)}
                aria-label={t("util.fontReset")}
                className="rounded border border-white/25 px-1.5 py-0.5 font-bold text-white hover:bg-white/10"
              >
                A
              </button>
              <button
                onClick={() => setFontPct((f) => Math.min(130, f + 10))}
                aria-label={t("util.fontIncrease")}
                className="rounded border border-white/25 px-1.5 py-0.5 font-extrabold text-navy-200 hover:bg-white/10"
              >
                A+
              </button>
            </span>
            <button
              onClick={toggle}
              aria-label={t("util.switchLang")}
              className="rounded border border-white/25 px-2 py-0.5 font-semibold text-navy-200 hover:bg-white/10"
            >
              {t("util.switchLangShort")}
            </button>
          </span>
        </div>
      </div>

      {/* Branding bar — brand, search, user context */}
      <div className="border-b border-white/10 bg-gov text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-3">
            <Emblem size={40} />
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-tight">{t("brand.name")}</span>
              <span className="block text-[11px] text-navy-200">{t("brand.division")}</span>
            </span>
          </Link>

          {/* Universal search — reaches works, cases, MPs, officials,
              ledger and states in one box; on all breakpoints so the
              search works on mobile too. */}
          <div className="order-first w-full md:order-none md:ml-auto md:w-80">
            <UniversalSearch compact />
          </div>

          {/* User context badge — separated from the security strip above */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-white/25 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/10"
            >
              {role ? roleShort(role) : t("brand.selectRole")}
              <span aria-hidden>▾</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-navy-200 bg-white text-navy-950 shadow-xl toast-in">
                <div className="border-b border-navy-100 bg-navy-950 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gov-gold">
                  {t("brand.switchPortal")}
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
                      {o.short} · {t(`role.${o.key}` as const)}
                      <span className="block text-[10px] font-normal text-slate-500">
                        {t(`role.${o.key}.desc` as const)}
                      </span>
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
                    {t("brand.resetDemo")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role-based tab bar — includes the signed-in context at the end */}
      <nav className="border-b border-navy-200 bg-white" aria-label={t("nav.aria")}>
        <div className="mx-auto flex w-full max-w-7xl items-stretch gap-1 overflow-x-auto px-4">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold transition ${
                  isActive ? "text-gov" : "text-slate-500 hover:text-navy-900"
                }`}
              >
                <span aria-hidden>{tab.icon}</span>
                {t(tab.i18n)}
                {isActive && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gov-gold" aria-hidden />
                )}
              </Link>
            );
          })}
          {role && (
            <span className="ml-auto flex shrink-0 items-center gap-2 self-center whitespace-nowrap pl-3 text-[11px] text-slate-600">
              <span className="rounded border border-navy-200 bg-navy-50 px-2 py-1">
                {t("role.signedInAs")}:{" "}
                <strong className="font-bold text-navy-950">{t(`role.${role}` as const)}</strong>
              </span>
              <span aria-hidden className="hidden text-slate-400 sm:inline">
                |
              </span>
              <span className="hidden sm:inline">{t("role.scopeClean")}</span>
            </span>
          )}
        </div>
      </nav>
    </header>
  );
}
