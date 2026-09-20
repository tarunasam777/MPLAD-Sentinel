"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-navy-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-500">
            {eyebrow}
          </div>
        )}
        <h2 className="mt-1 text-lg font-semibold text-navy-950">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  accent = "text-navy-900",
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          {label}
        </span>
        {icon}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
      {detail && <div className="text-xs text-slate-500">{detail}</div>}
    </Card>
  );
}

export function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md border border-navy-300 bg-white px-4 py-2 text-sm font-semibold text-navy-800 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md border border-gate bg-gate px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function ExportPdfButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md border-2 border-gov-gold bg-gov px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-gov-deep ${className}`}
    >
      <span className="gov-barcode h-3.5 w-9 text-gov-gold" aria-hidden />
      {children}
    </button>
  );
}

export function ProgressBar({
  value,
  className = "",
  barColor = "bg-navy-700",
}: {
  value: number;
  className?: string;
  barColor?: string;
}) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-navy-100 ${className}`}>
      <div
        className={`h-full rounded-full ${barColor} transition-all duration-700`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function LinkButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-md border border-navy-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-navy-800 transition hover:bg-navy-50 ${className}`}
    >
      {children}
    </Link>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  rows,
  className = "",
  inputMode = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  inputMode?: "text" | "numeric";
}) {
  const cls = `w-full rounded-md border border-navy-300 bg-white px-3 py-2 text-sm text-navy-950 placeholder-slate-400 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-200 ${className}`;
  if (rows) {
    return (
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className={cls}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-md border border-navy-300 bg-white px-3 py-2 text-sm font-medium text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-200 ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function HelpNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs text-navy-800">
      <span className="mt-0.5 text-navy-500">ℹ</span>
      <p>{children}</p>
    </div>
  );
}