"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/store/AppStore";
import { Emblem } from "@/components/Header";

export function Footer() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);

  const disclaimer =
    "Designed for Ministry of Statistics and Programme Implementation (MoSPI) | Powered by NIC & MPLADS Sentinel AI | Data Encrypted with SHA-256";

  return (
    <footer className="border-t-4 border-gov-gold bg-gov-deep text-navy-100">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Emblem size={30} />
            <div className="leading-tight">
              <p className="text-xs font-bold">Bharat Sarkar · MPLADS Sentinel</p>
              <p className="text-[10px] text-navy-300">MoSPI · NIC · Government of India</p>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-navy-300">
            AI-assisted end-to-end monitoring of MPLADS works — from MP recommendation to
            geo-tagged, photo-verified milestone disbursements.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gov-gold">Transparency</p>
          <ul className="mt-2 space-y-1.5 text-[11px]">
            <li>
              <Link href="/ledger" className="hover:text-white">Immutable SHA-256 audit ledger</Link>
            </li>
            <li>
              <Link href="/public" className="hover:text-white">Citizen asset directory</Link>
            </li>
            <li>
              <Link href="/dashboard/state" className="hover:text-white">State nodal dashboards</Link>
            </li>
            <li>
              <Link href="/dashboard/ministry" className="hover:text-white">Ministry audit console</Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gov-gold">Citizen Rights</p>
          <ul className="mt-2 space-y-1.5 text-[11px]">
            <li>Right to Information (RTI) 2005</li>
            <li>MPLADS Guidelines 2023 (public works)</li>
            <li>PMAY-G · SC/ST sub-plan audits</li>
            <li>Geotagged asset disclosure</li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gov-gold">Resources & Policies</p>
          <ul className="mt-2 space-y-1.5 text-[11px]">
            <li>
              <Link href="/about-methodology" className="hover:text-white">About · Methodology &amp; Limitations</Link>
            </li>
            <li>
              <Link href="/accessibility" className="hover:text-white">Accessibility Statement (GIGW 3.0)</Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white">Terms of Use</Link>
            </li>
            <li>
              <Link href="/sitemap" className="hover:text-white">Sitemap</Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white">Contact / Help Desk</Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gov-gold">Contact & Help</p>
          <ul className="mt-2 space-y-1.5 text-[11px]">
            <li>NIC Help Desk · 1800-11-1555</li>
            <li>MeitY / NIC: nic.in</li>
            <li>MoSPI: mospi.gov.in</li>
            <li>PFMS: pfms.nic.in</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto w-full max-w-7xl px-4 py-3">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="flex items-center gap-2 text-[11px] font-semibold text-navy-200">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${state.mode === "live" ? "bg-teal-400" : "bg-amber-400"}`} />
              MPLADS Sentinel — hackathon demo ({state.mode === "live" ? "live API" : "mock data"})
            </span>
            <span className="text-gov-gold" aria-hidden>
              {open ? "▲" : "▼"} Disclaimer
            </span>
          </button>
          {open && (
            <p className="mt-2 border-l-2 border-gov-gold pl-3 text-[11px] leading-relaxed text-navy-200">{disclaimer}</p>
          )}
          <p className="mt-2 text-center text-[10px] text-navy-400">
            {disclaimer}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px]">
            <span className="text-navy-300">Last updated: 01 Sep 2026</span>
            <span aria-hidden className="text-navy-500">·</span>
            <Link href="/accessibility" className="underline-offset-2 hover:text-white hover:underline">Accessibility Statement</Link>
            <span aria-hidden className="text-navy-500">·</span>
            <Link href="/terms" className="underline-offset-2 hover:text-white hover:underline">Terms of Use</Link>
            <span aria-hidden className="text-navy-500">·</span>
            <Link href="/sitemap" className="underline-offset-2 hover:text-white hover:underline">Sitemap</Link>
            <span aria-hidden className="text-navy-500">·</span>
            <Link href="/contact" className="underline-offset-2 hover:text-white hover:underline">Contact</Link>
          </div>
          <p className="mt-2 text-center text-[10px] text-navy-400">
            © 2025–26 Ministry of Statistics & Programme Implementation. All data shown is synthetic for demonstration; no real schemes, officials or records are represented.
          </p>
        </div>
      </div>
    </footer>
  );
}