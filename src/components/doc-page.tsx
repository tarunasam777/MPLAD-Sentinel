import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export function DocPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header active="public" />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-[11px]">
          <Link href="/" className="text-navy-600 underline-offset-2 hover:underline">
            Home
          </Link>
          <span aria-hidden className="mx-1.5 text-slate-400">
            /
          </span>
          <span className="text-slate-500">{title}</span>
        </nav>
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gov-gold">{eyebrow}</div>
        )}
        <h1 className="mt-1 text-2xl font-extrabold text-navy-950">{title}</h1>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-navy-900">{children}</div>
      </main>
      <Footer />
    </div>
  );
}