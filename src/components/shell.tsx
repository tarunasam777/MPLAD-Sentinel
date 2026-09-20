"use client";

import { Header, roleShort } from "@/components/Header";
import { Footer } from "@/components/Footer";

export { roleShort };

export function Shell({
  active,
  children,
}: {
  active: "home" | "ledger" | "override" | "case" | "public";
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header active={active} />
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <Footer />
    </div>
  );
}