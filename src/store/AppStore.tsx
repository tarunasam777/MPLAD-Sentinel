"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { analyticsMock, baseOfficials, buildLedger, CASES, STATE_NAME } from "@/lib/data";
import { ledgerHash } from "@/lib/hash";
import { inr } from "@/lib/format";
import {
  fetchBootstrap,
  fetchCases,
  patchCaseTitle,
  postDecide,
  postIngestSync,
  postResetDemo,
  postTamper,
  postUntamper,
  verifyChainLive,
} from "@/lib/api";
import {
  DUPLICATE_DIST_THRESHOLD_M,
  DUPLICATE_SIM_THRESHOLD,
  duplicateSubScore,
  tokenSortRatio,
} from "@/lib/similarity";
import type {
  AnalyticsData,
  CaseState,
  LedgerEntry,
  MilestoneRequest,
  OfficialStat,
  OverrideKind,
  PfmsStage,
  Proposal,
  Role,
  WorkCase,
} from "@/lib/types";
import type { BootstrapData, IngestSyncResult } from "@/lib/api";

export type Mode = "mock" | "live";

function nowStamp(): string {
  return new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cloneInitial() {
  return {
    cases: CASES.map((c) => ({
      ...c,
      moduleBreakdown: c.moduleBreakdown.map((m) => ({ ...m })),
    })),
    ledger: buildLedger(),
    officials: baseOfficials.map((o) => ({ ...o })),
  };
}

export interface AppState {
  role: Role | null;
  mode: Mode;
  cases: WorkCase[];
  ledger: LedgerEntry[];
  officials: OfficialStat[];
  analytics: AnalyticsData;
  proposals: Proposal[];
  milestones: MilestoneRequest[];
  tamperIndex: number | null;
  tamperOriginal: Record<number, string>;
  verifying: boolean;
  verifyRunId: number;
  scoresSynced: boolean;
  scoresSyncedAt: string | null;
  lastAction: string | null;
}

export interface AppApi {
  setRole: (r: Role | null) => void;
  decideCase: (
    caseId: string,
    decision: "approve" | "inspect" | "escalate",
    note: string
  ) => void;
  tamperLedgerAt: (index: number, newBody: string) => void;
  simulateDbTamper: () => void;
  undoTamper: () => void;
  restoreLedger: () => void;
  verifyChain: () => void;
  submitProposal: (p: Omit<Proposal, "id" | "status" | "submittedAt">) => void;
requestDisbursement: (workId: string, stage: PfmsStage, amountLakh: number) => void;
  approveMilestone: (workId: string) => void;
  updateCaseTitle: (caseId: string, title: string) => void;
  syncIngest: (districts?: string[]) => Promise<IngestSyncResult>;
  syncScores: () => Promise<number>;
  retryLive: () => Promise<void>;
  resetDemo: () => void;
}

const ctx = createContext<{ state: AppState; api: AppApi } | null>(null);

const initialState = (): AppState => ({
  role: null,
  mode: "mock",
  ...cloneInitial(),
  analytics: analyticsMock,
  proposals: [],
  milestones: [],
  tamperIndex: null,
  tamperOriginal: {},
  verifying: false,
  verifyRunId: 0,
  scoresSynced: false,
  scoresSyncedAt: null,
  lastAction: null,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const modeRef = useRef<Mode>("mock");

  useEffect(() => {
    modeRef.current = state.mode;
  }, [state.mode]);

  const applyBootstrap = useCallback((data: BootstrapData) => {
    setState((s) => ({
      ...s,
      mode: "live",
      cases: data.cases,
      ledger: data.ledger,
      officials: data.officials,
      analytics: data.analytics,
    }));
  }, []);

  const hydrate = useCallback(async () => {
    try {
      applyBootstrap(await fetchBootstrap());
    } catch {
      setState((s) => ({ ...s, mode: "mock" }));
    }
  }, [applyBootstrap]);

  useEffect(() => {
    // Background hydration: the mock dataset renders immediately; live data
    // replaces it only once the API responds.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState runs after network settle, never synchronously.
    void hydrate();
  }, [hydrate]);

  const setRole = useCallback((role: Role | null) => {
    setState((s) => ({ ...s, role }));
  }, []);

  const appendLedger = useCallback(
    (prev: LedgerEntry[], seed: Omit<LedgerEntry, "index" | "prevHash" | "hash">) => {
      const index = prev.length;
      let prevHash = "0".repeat(16);
      if (prev.length > 0) prevHash = prev[prev.length - 1].hash;
      const hash = ledgerHash(prevHash, index, seed.action, seed.actor, seed.body, seed.timestamp);
      return [...prev, { ...seed, index, prevHash, hash }];
    },
    []
  );

  const bumpOfficial = useCallback(
    (officials: OfficialStat[], dmName: string, district: string, kind: OverrideKind) => {
      // Resolve identity once on (name, district), then bump strictly by stable id
      // so an override can never leak onto an unrelated official's row.
      const target = officials.find((o) => o.name === dmName && o.district === district);
      if (!target) {
        return [
          ...officials,
          {
            id: `off-live-${Date.now()}`,
            name: dmName,
            role: "District Magistrate",
            district,
            state: STATE_NAME,
            highRiskDecisions: 1,
            gateOverrides: kind === "gate" ? 1 : 0,
            thresholdOverrides: kind === "threshold" ? 1 : 0,
            flaggedNote: "Live override recorded during this session.",
          },
        ];
      }
      return officials.map((o) =>
        o.id === target.id
          ? {
              ...o,
              highRiskDecisions: o.highRiskDecisions + 1,
              gateOverrides: o.gateOverrides + (kind === "gate" ? 1 : 0),
              thresholdOverrides: o.thresholdOverrides + (kind === "threshold" ? 1 : 0),
            }
          : o
      );
    },
    []
  );

  const decideCase = useCallback(
    (caseId: string, decision: "approve" | "inspect" | "escalate", note: string) => {
      if (modeRef.current === "live") {
        setState((s) => ({ ...s, verifying: true }));
        void postDecide(caseId, decision, note)
          .then(async () => {
            await hydrate();
            setState((s) => ({
              ...s,
              verifying: false,
              lastAction: `${caseId} — ${decision} recorded to chain & override audit.`,
            }));
          })
          .catch((err: Error) =>
            setState((s) => ({
              ...s,
              verifying: false,
              lastAction: `Action not allowed: ${err.message}`,
            }))
          );
        return;
      }

      setState((s) => {
        const target = s.cases.find((c) => c.id === caseId);
        if (!target) return s;
        const kind: OverrideKind = target.gate.fired ? "gate" : "threshold";
        const now = nowStamp();

        let cases = s.cases;
        let ledger = s.ledger;
        let officials = s.officials;
        let lastAction: string;

        const pushPath = (statuses: CaseState[]) => {
          const nextPath = [...target.path];
          for (const st of statuses) {
            if (!nextPath.includes(st)) nextPath.push(st);
          }
          return nextPath;
        };

        if (decision === "approve") {
          const actionLabel = kind === "gate" ? "GATE OVERRIDE" : "THRESHOLD OVERRIDE";
          cases = s.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  status: "released" as CaseState,
                  statusSince: now,
                  path: pushPath(["override_approved", "released"]),
                }
              : c
          );
          ledger = appendLedger(s.ledger, {
            action: actionLabel,
            category: "override",
            actor: target.dmName,
            actorRole: `District Magistrate · ${target.district}`,
            body: note || `Overrode ${kind === "gate" ? "critical-gate" : "composite"} hold on ${caseId}.`,
            timestamp: now,
            caseId,
          });
          officials = bumpOfficial(s.officials, target.dmName, target.district, kind);
          lastAction = `${caseId} released — ${actionLabel} recorded to ledger & override audit.`;
        } else if (decision === "escalate") {
          cases = s.cases.map((c) =>
            c.id === caseId ? { ...c, status: "escalated" as CaseState, statusSince: now, path: pushPath(["escalated"]) } : c
          );
          ledger = appendLedger(s.ledger, {
            action: "ESCALATED TO AUDIT",
            category: "escalate",
            actor: target.dmName,
            actorRole: `District Magistrate · ${target.district}`,
            body: note || `Escalated ${caseId} to State Audit for deeper investigation.`,
            timestamp: now,
            caseId,
          });
          lastAction = `${caseId} escalated to State Audit.`;
        } else {
          ledger = appendLedger(s.ledger, {
            action: "HELD FOR INSPECTION",
            category: "hold",
            actor: target.dmName,
            actorRole: `District Magistrate · ${target.district}`,
            body: note || `Ordered physical inspection on ${caseId} before further evaluation.`,
            timestamp: now,
            caseId,
          });
          lastAction = `${caseId} held for physical inspection.`;
        }

        return { ...s, cases, ledger, officials, lastAction };
      });
    },
    [appendLedger, bumpOfficial, hydrate]
  );

  const tamperLedgerAt = useCallback(
    (index: number, newBody: string) => {
      if (modeRef.current === "live") {
        setState((s) => ({ ...s, tamperIndex: null }));
        void postTamper(index, newBody)
          .then(() => hydrate())
          .catch(() => hydrate());
        return;
      }
      setState((s) => {
        const target = s.ledger.find((e) => e.index === index);
        if (!target) return s;
        const original = s.tamperOriginal;
        if (!(index in original)) original[index] = target.body;
        const ledger = s.ledger.map((e) =>
          e.index === index
            ? {
                ...e,
                body: newBody,
                hash: ledgerHash(e.prevHash, e.index, e.action, e.actor, newBody, e.timestamp),
              }
            : e
        );
        return { ...s, ledger, tamperIndex: null, tamperOriginal: original };
      });
    },
    [hydrate]
  );

  const undoTamper = useCallback(() => {
    if (modeRef.current === "live") {
      setState((s) => ({ ...s, tamperIndex: null }));
      void postUntamper()
        .then(() => hydrate())
        .catch(() => hydrate());
      return;
    }
    setState((s) => {
      const entries = Object.entries(s.tamperOriginal);
      if (entries.length === 0) return s;
      const byIndex: Record<string, string> = {};
      for (const [k, v] of entries) byIndex[k] = v;
      const ledger = s.ledger.map((e) => {
        const original = byIndex[e.index];
        if (original === undefined) return e;
        return {
          ...e,
          body: original,
          hash: ledgerHash(e.prevHash, e.index, e.action, e.actor, original, e.timestamp),
        };
      });
      return { ...s, ledger, tamperOriginal: {}, tamperIndex: null };
    });
  }, [hydrate]);

  const verifyChain = useCallback(() => {
    setState((s) => ({ ...s, verifying: true, verifyRunId: s.verifyRunId + 1 }));
    if (modeRef.current === "live") {
      void verifyChainLive()
        .then((res) =>
          setState((s) => ({
            ...s,
            verifying: false,
            lastAction: res.ok
              ? "Chain verified — every block linked."
              : `Chain broken — ${res.tampered.length} block(s) fail linkage.`,
          }))
        )
        .catch((err: Error) =>
          setState((s) => ({ ...s, verifying: false, lastAction: `Verify failed: ${err.message}` }))
        );
      return;
    }
    window.setTimeout(() => {
      setState((s) => ({ ...s, verifying: false }));
    }, 1400);
  }, []);

  const resetDemo = useCallback(() => {
    if (modeRef.current === "live") {
      void postResetDemo()
        .then(() => hydrate())
        .catch(() => hydrate());
      return;
    }
    setState((s) => ({
      ...s,
      ...cloneInitial(),
      proposals: [],
      milestones: [],
      tamperIndex: null,
      tamperOriginal: {},
      verifying: false,
      lastAction: null,
    }));
  }, [hydrate]);

  const simulateDbTamper = useCallback(() => {
    if (modeRef.current === "live") {
      setState((s) => ({ ...s, lastAction: "Tamper simulation is available in mock demo mode only." }));
      return;
    }
    setState((s) => {
      const candidates = s.ledger.filter(
        (e) => e.index >= 1 && e.index + 1 < s.ledger.length && e.body && e.body.length > 8
      );
      if (candidates.length === 0) return s;
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      const already = Object.keys(s.tamperOriginal).map(Number);
      const untouched = candidates.filter((e) => !already.includes(e.index));
      const pick = untouched.length > 0 ? untouched[Math.floor(Math.random() * untouched.length)] : target;
      const original = s.tamperOriginal;
      if (!(pick.index in original)) original[pick.index] = pick.body;
      const tamperedBody = `${pick.body} ⚠ DB-TAMPERED·AMOUNT/STATUS-ALTERED`;
      const ledger = s.ledger.map((e) =>
        e.index === pick.index
          ? {
              ...e,
              body: tamperedBody,
              hash: ledgerHash(e.prevHash, e.index, e.action, e.actor, tamperedBody, e.timestamp),
            }
          : e
      );
      return {
        ...s,
        ledger,
        tamperIndex: null,
        tamperOriginal: original,
        lastAction: `Simulated DB tampering on block #${pick.index} — SHA-256 chain corruption injected.`,
      };
    });
  }, []);

  const submitProposal = useCallback(
    (p: Omit<Proposal, "id" | "status" | "submittedAt">) => {
      const now = nowStamp();
      setState((s) => {
        const proposal: Proposal = {
          ...p,
          id: `MPL-P-${Math.floor(1000 + Math.random() * 9000)}`,
          status: "recommended",
          submittedAt: now,
        };
        const ledger = appendLedger(s.ledger, {
          action: "FORMAL RECOMMENDATION",
          category: "submit",
          actor: p.mpName,
          actorRole: "MP · Lok Sabha",
          body: `Recommended “${p.title}” (${p.category}) in ${p.district} — SC/ST checker passed (SC≥15%, ST≥7.5%)`,
          timestamp: now,
        });
        return {
          ...s,
          proposals: [proposal, ...s.proposals],
          ledger,
          lastAction: `Proposal ${proposal.id} recorded to ledger — routed to District Authority.`,
        };
      });
    },
    [appendLedger]
  );

  const requestDisbursement = useCallback(
    (workId: string, stage: PfmsStage, amountLakh: number) => {
      if (modeRef.current === "live") {
        setState((s) => ({ ...s, lastAction: "Disbursement workflow unavailable in live demo mode." }));
        return;
      }
      const now = nowStamp();
      setState((s) => {
        const milestone: MilestoneRequest = {
          workId,
          stage,
          amountLakh,
          status: "photo_pending",
          requestedAt: now,
        };
        const ledger = appendLedger(s.ledger, {
          action: "STAGE DISBURSEMENT REQUEST",
          category: "release",
          actor: "Implementing Agency (I.A.)",
          actorRole: "Vendor Portal",
          body: `Requested ${stage.replace("_", "-").toUpperCase()} release of ${inr(amountLakh)} for ${workId} — awaiting DM milestone approval.`,
          timestamp: now,
          caseId: workId,
        });
        return { ...s, milestones: [milestone, ...s.milestones], ledger, lastAction: `${workId}: ${stage} disbursement requested — photo verification pending.` };
      });
    },
    [appendLedger]
  );

  const approveMilestone = useCallback(
    (workId: string) => {
      const now = nowStamp();
      setState((s) => {
        const target = s.milestones.find((m) => m.workId === workId);
        if (!target) return s;
        const milestones = s.milestones.map((m) =>
          m.workId === workId ? { ...m, status: "approved" as const } : m
        );
        const ledger = appendLedger(s.ledger, {
          action: "MILESTONE APPROVED",
          category: "release",
          actor: "District Magistrate Authority",
          actorRole: "DM Portal",
          body: `Approved ${target.stage.replace("_", "-").toUpperCase()} milestone (${inr(target.amountLakh)}) for ${workId} after photo verification.`,
          timestamp: now,
          caseId: workId,
        });
        return { ...s, milestones, ledger, lastAction: `${workId}: milestone approved and released to PFMS.` };
      });
    },
    [appendLedger]
  );

  const updateCaseTitle = useCallback(
    (caseId: string, title: string) => {
      const clean = title.trim();
      if (clean.length < 3) {
        setState((s) => ({ ...s, lastAction: "Description too short — at least 3 characters required." }));
        return;
      }
      if (modeRef.current === "live") {
        setState((s) => ({ ...s, verifying: true }));
        void patchCaseTitle(caseId, clean)
          .then(async () => {
            await hydrate();
            setState((s) => ({
              ...s,
              verifying: false,
              lastAction: `${caseId} description updated — backend re-ran the pipeline and similarity recomputed live.`,
            }));
          })
          .catch((err: Error) =>
            setState((s) => ({
              ...s,
              verifying: false,
              lastAction: `Title update failed: ${err.message}`,
            }))
          );
        return;
      }
      // Mock mode: revise the description and recompute the duplicate
      // similarity live from the two current titles — no reload involved.
      setState((s) => {
        const target = s.cases.find((c) => c.id === caseId);
        if (!target) return s;
        let simNote = "";
        const cases = s.cases.map((c) => {
          if (c.id !== caseId) return c;
          const dup = c.moduleBreakdown.find((m) => m.module === "duplicate");
          let moduleBreakdown = c.moduleBreakdown;
          if (dup?.evidence?.kind === "duplicate") {
            const twin = dup.evidence;
            const dist = twin.distanceMeters;
            const sim = tokenSortRatio(clean, twin.twinTitle);
            const sub = duplicateSubScore(sim, dist);
            const triggered = sim >= DUPLICATE_SIM_THRESHOLD && dist <= DUPLICATE_DIST_THRESHOLD_M;
            simNote = ` — duplicate similarity recomputed live: ${sim}%`;
            moduleBreakdown = c.moduleBreakdown.map((m) =>
              m.module === "duplicate"
                ? {
                    ...m,
                    subScore: sub,
                    triggered,
                    description: `Text similarity ${sim}% to ‘${twin.twinTitle}’ ${dist} m away${
                      triggered ? " — suspected duplicate sanction." : " — below watch thresholds."
                    }`,
                    evidence: { ...twin, textSimilarityPct: sim },
                  }
                : m
            );
          }
          return { ...c, title: clean, moduleBreakdown };
        });
        return { ...s, cases, lastAction: `${caseId} description updated${simNote}.` };
      });
    },
    [hydrate]
  );

  const syncIngest = useCallback(
    async (districts?: string[]): Promise<IngestSyncResult> => {
      const res = await postIngestSync(districts);
      if (modeRef.current === "live") {
        await hydrate();
        setState((s) => ({
          ...s,
          lastAction: `eSAKSHI sync complete — ${res.ingested} ingested, ${res.held} held, ${res.quarantined} quarantined.`,
        }));
      } else {
        // Mock mode: merge the freshly evaluated records into the queue so
        // the sync is visible without leaving the demo dataset.
        try {
          const full = await fetchCases();
          const byId = new Map(full.cases.map((c) => [c.id, c]));
          setState((s) => {
            const known = new Set(s.cases.map((c) => c.id));
            const merged = [...s.cases];
            for (const c of full.cases) {
              if (byId.has(c.id) && !known.has(c.id)) merged.push(c);
            }
            // Refresh scores of overlapping ids (re-evaluated server-side).
            const refreshed = merged.map((c) => {
              const live = byId.get(c.id);
              return live && res.cases.includes(c.id)
                ? { ...c, compositeScore: live.compositeScore, gate: live.gate, moduleBreakdown: live.moduleBreakdown }
                : c;
            });
            return {
              ...s,
              cases: refreshed,
              lastAction: `eSAKSHI sync complete — ${res.ingested} ingested (${res.portal_live ? "live portal" : "fallback batch"}).`,
            };
          });
        } catch {
          setState((s) => ({
            ...s,
            lastAction: `eSAKSHI sync recorded ${res.ingested} records on the backend (queue refresh unavailable).`,
          }));
        }
      }
      return res;
    },
    [hydrate]
  );

  const syncScores = useCallback(async (): Promise<number> => {
    const data = await fetchCases();
    const byId = new Map(data.cases.map((c) => [c.id, c]));
    let matched = 0;
    setState((s) => {
      const cases = s.cases.map((c) => {
        const live = byId.get(c.id);
        if (!live) return c;
        matched += 1;
        return {
          ...c,
          compositeScore: live.compositeScore,
          gate: live.gate,
          moduleBreakdown: live.moduleBreakdown,
        };
      });
      return {
        ...s,
        cases,
        scoresSynced: true,
        scoresSyncedAt: nowStamp(),
        lastAction: `Scores re-synced from the live API for ${matched} works — mock cards now reflect model re-evaluation.`,
      };
    });
    return matched;
  }, []);

  const api = useMemo<AppApi>(
    () => ({
      setRole,
      decideCase,
      tamperLedgerAt,
      simulateDbTamper,
      undoTamper,
      restoreLedger: undoTamper,
      verifyChain,
      submitProposal,
      requestDisbursement,
      approveMilestone,
      updateCaseTitle,
      syncIngest,
      syncScores,
      retryLive: hydrate,
      resetDemo,
    }),
    [setRole, decideCase, tamperLedgerAt, simulateDbTamper, undoTamper, verifyChain, submitProposal, requestDisbursement, approveMilestone, updateCaseTitle, syncIngest, syncScores, hydrate, resetDemo]
  );

  return <ctx.Provider value={{ state, api }}>{children}</ctx.Provider>;
}

export function useApp(): { state: AppState; api: AppApi } {
  const value = useContext(ctx);
  if (!value) throw new Error("useApp must be used within AppProvider");
  return value;
}

export function chainValidity(ledger: LedgerEntry[]): boolean[] {
  return ledger.map((e, i) => {
    if (i === 0) return true;
    return e.prevHash === ledger[i - 1].hash;
  });
}

export function useCase(id: string): WorkCase | undefined {
  const { state } = useApp();
  return state.cases.find((c) => c.id === id);
}