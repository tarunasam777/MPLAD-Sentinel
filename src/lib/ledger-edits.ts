/**
 * Field encoding for manual ledger edits (amount/status).
 *
 * TypeScript mirror of `backend/app/ledger/ledger_edits.py` — keep both in
 * sync. The encoded tail is ALWAYS the last two " ₹"-separated tokens:
 * `{description} ₹{amount} ₹{status}`. Descriptions themselves may contain ₹
 * ("Released ₹14.20 for stage 2 …"), so parsing scans from the END of the
 * string — prose is never rewritten, only the two tail tokens change.
 *
 * A body that doesn't end in exactly two such tokens is a plain/legacy body.
 * The store uses this to detect (and badge) manually edited blocks, and to
 * prefill the inline editor with the current amount/status values.
 */

const SEP = " ₹";

export function formatAmount(amount: number): string {
  const text = amount.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return text || "0";
}

export function sanitizeStatus(status: string): string {
  return status
    .replace(/[₹|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitBody(body: string): {
  head: string;
  amount: number | null;
  status: string | null;
} {
  const statusPos = body.lastIndexOf(SEP);
  if (statusPos === -1) return { head: body, amount: null, status: null };
  const amountPos = body.lastIndexOf(SEP, statusPos - 1);
  if (amountPos === -1) return { head: body, amount: null, status: null };
  const amountStr = body.slice(amountPos + SEP.length, statusPos);
  const status = body.slice(statusPos + SEP.length);
  if (!amountStr || !status || /\s/.test(amountStr)) {
    return { head: body, amount: null, status: null };
  }
  const amount = Number(amountStr);
  if (!Number.isFinite(amount)) return { head: body, amount: null, status: null };
  return { head: body.slice(0, amountPos), amount, status };
}

export function encodeBody(head: string, amount: number, status: string): string {
  return `${head}${SEP}${formatAmount(amount)}${SEP}${sanitizeStatus(status)}`;
}
