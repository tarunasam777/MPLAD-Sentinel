import type { Metadata } from "next";
import { MethodologyBody } from "./MethodologyBody";

export const metadata: Metadata = {
  title: "About · Methodology & Limitations — MPLADS Sentinel",
  description:
    "How the MPLADS Sentinel demo works: seven scoring modules, weighted fusion, the Critical-Risk Gate, the SHA-256 ledger, and the limitations of synthetic demo data.",
};

export default function AboutMethodologyPage() {
  return <MethodologyBody />;
}
