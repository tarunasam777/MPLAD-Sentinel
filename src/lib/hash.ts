import { sha256 } from "@/lib/sha256";

export function shortHash(full: string): string {
  return full.slice(0, 10);
}

export function ledgerHash(
  prevHash: string,
  index: number,
  action: string,
  actor: string,
  body: string,
  timestamp: string
): string {
  return sha256(`${prevHash}|${index}|${action}|${actor}|${body}|${timestamp}`);
}