"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { AnalysisOutput, RecommendedAction, RepoInput, RiskLevel } from "@/types/repo-sentinel";

const EXAMPLE_INPUT: RepoInput = {
  repoName: "acme/ops-dashboard",
  readmeText:
    "Ops Dashboard is a React and Next.js control plane used by maintainers to monitor incidents, deployment status, and internal tools. The project supports on-call operations but the current README only covers local startup and does not explain architecture or ownership.",
  structureText: `apps/web
components/
lib/
pages/api
.github/workflows
scripts/
No tests directory found
No docs/architecture record found`,
  issueSummary:
    "Issues are often missing reproduction details. Several tickets are stale, triage is slow, and maintainers are manually checking regressions before merge.",
};

const EMPTY_RESULT: AnalysisOutput | null = null;

const levelStyles: Record<RiskLevel, string> = {
  high: "border-[rgba(163,70,70,0.24)] bg-[rgba(163,70,70,0.08)] text-[var(--danger)]",
  medium: "border-[rgba(197,103,61,0.24)] bg-[rgba(197,103,61,0.08)] text-[var(--accent-strong)]",
  low: "border-[rgba(15,118,110,0.24)] bg-[rgba(15,118,110,0.08)] text-[var(--signal)]",
};

function priorityLabel(priority: RiskLevel) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function ActionCard({ action }: { action: RecommendedAction }) {
  return (
    <article className="panel rounded-[28px] border p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-base font-semibold text-[var(--foreground)]">{action.title}</h4>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${levelStyles[action.priority]}`}
        >
          {priorityLabel(action.priority)}
        </span>
      </div>
      <p className="text-sm leading-7 text-[var(--muted)]">{action.rationale}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
        <span className="rounded-full bg-white/70 px-3 py-1">Owner: {action.owner}</span>
        <span className="rounded-full bg-white/70 px-3 py-1">ETA: {action.timeframe}</span>
      </div>
    </article>
  );
}

export function RepoSentinelApp() {
  const [form, setForm] = useState<RepoInput>(EXAMPLE_INPUT);
  const [result, setResult] = useState<AnalysisOutput | null>(EMPTY_RESULT);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deferredRepoName = useDeferredValue(form.repoName);

  const scoreDegrees = result ? Math.round((result.score / 100) * 360) : 0;

  const stats = useMemo(() => {
    if (!result) {
      return { high: 0, medium: 0, low: 0 };
    }

    return result.risks.reduce(
      (accumulator, risk) => {
        accumulator[risk.level] += 1;
        return accumulator;
      },
      { high: 0, medium: 0, low: 0 },
    );
  }, [result]);

  async function handleAnalyze() {
    setCopied(false);
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = (await response.json()) as AnalysisOutput | { error: string };

        if (!response.ok || "error" in data) {
          setResult(null);
          setError("error" in data ? data.error : "Analysis failed unexpectedly.");
          return;
        }

        setResult(data);
      } catch {
        setResult(null);
        setError("Network error while contacting the local analysis route.");
      }
    });
  }

  async function copyReport() {
    if (!result) return;
    await navigator.clipboard.writeText(result.reportMarkdown);
    setCopied(true);
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 text-[var(--foreground)] sm:px-6 lg:px-10">
      <div className="grain" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="panel panel-strong relative overflow-hidden rounded-[36px] border px-6 py-8 sm:px-8 lg:px-10">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_left,rgba(197,103,61,0.16),transparent_58%)] lg:block" />
          <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-5">
              <span className="inline-flex rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                AI-Driven Repository Governance
              </span>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                  Repo Sentinel turns raw repository context into a maintainer-ready governance plan.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
                  A public demo for a multi-agent style workflow: Scout reconstructs the project shape,
                  Auditor flags engineering risk, and Planner converts findings into prioritized actions
                  and GitHub-friendly Markdown.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                <span className="rounded-full bg-white/80 px-4 py-2">Single-run governance audit</span>
                <span className="rounded-full bg-white/80 px-4 py-2">Markdown export for issues</span>
                <span className="rounded-full bg-white/80 px-4 py-2">No GitHub token required</span>
              </div>
            </div>
            <div className="panel rounded-[32px] border p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                Pipeline
              </p>
              <ol className="mt-5 space-y-4 text-sm leading-7 text-[var(--muted)]">
                <li>
                  <span className="font-semibold text-[var(--foreground)]">01. Intake</span> ingest repository
                  name, README, structure, and issue snapshots.
                </li>
                <li>
                  <span className="font-semibold text-[var(--foreground)]">02. Analysis</span> simulate Scout,
                  Auditor, and Planner passes with transparent heuristics.
                </li>
                <li>
                  <span className="font-semibold text-[var(--foreground)]">03. Action Board</span> output health
                  score, risks, and an execution queue maintainers can ship.
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.96fr_1.04fr]">
          <div className="space-y-8">
            <article className="panel rounded-[32px] border p-6 sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">Repository Intake</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Paste any combination of repository context. Repo Sentinel degrades gracefully when
                    the input is partial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForm(EXAMPLE_INPUT);
                    setResult(null);
                    setError("");
                    setCopied(false);
                  }}
                  className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                >
                  Load Example
                </button>
              </div>
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Repository name</span>
                  <input
                    value={form.repoName}
                    onChange={(event) => setForm({ ...form, repoName: event.target.value })}
                    placeholder="owner/repo"
                    className="w-full rounded-[20px] border border-[var(--border)] bg-white/90 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">README text</span>
                  <textarea
                    value={form.readmeText}
                    onChange={(event) => setForm({ ...form, readmeText: event.target.value })}
                    rows={7}
                    placeholder="Paste the README or product overview."
                    className="w-full rounded-[24px] border border-[var(--border)] bg-white/90 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Structure summary</span>
                  <textarea
                    value={form.structureText}
                    onChange={(event) => setForm({ ...form, structureText: event.target.value })}
                    rows={6}
                    placeholder="Paste folders, modules, workflows, and architecture hints."
                    className="w-full rounded-[24px] border border-[var(--border)] bg-white/90 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Issue / PR summary</span>
                  <textarea
                    value={form.issueSummary}
                    onChange={(event) => setForm({ ...form, issueSummary: event.target.value })}
                    rows={5}
                    placeholder="Paste triage notes, stale issue patterns, or merge pain points."
                    className="w-full rounded-[24px] border border-[var(--border)] bg-white/90 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isPending}
                  className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Analyzing..." : "Run Governance Audit"}
                </button>
                <span className="text-sm text-[var(--muted)]">
                  Current target: {deferredRepoName || "Unnamed repository"}
                </span>
              </div>
              {error ? (
                <p className="mt-4 rounded-[18px] border border-[rgba(163,70,70,0.2)] bg-[rgba(163,70,70,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                  {error}
                </p>
              ) : null}
            </article>

            <article className="panel rounded-[32px] border p-6 sm:p-7">
              <h3 className="text-xl font-semibold tracking-[-0.03em]">Agent Design</h3>
              <div className="mt-5 grid gap-4">
                {[
                  ["Scout", "Recovers repository intent, shape, and missing context from the supplied materials."],
                  ["Auditor", "Detects testing, automation, documentation, and collaboration risk patterns."],
                  ["Planner", "Converts weak signals into prioritized actions with owners and timeframes."],
                ].map(([name, copy]) => (
                  <div key={name} className="rounded-[24px] border border-[var(--border)] bg-white/70 p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                      {name}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{copy}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="space-y-8">
            <article className="panel rounded-[32px] border p-6 sm:p-7">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">Governance Scorecard</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    A concise output designed for maintainers, hiring reviewers, and GitHub issue exports.
                  </p>
                </div>
                <div
                  className="metric-ring grid h-32 w-32 place-items-center rounded-full"
                  style={{ ["--score" as string]: scoreDegrees }}
                >
                  <div className="text-center">
                    <p className="text-3xl font-semibold">{result?.score ?? "--"}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Health</p>
                  </div>
                </div>
              </div>

              {result ? (
                <div className="mt-6 space-y-6">
                  <p className="text-sm leading-8 text-[var(--muted)]">{result.summary}</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-[24px] bg-white/75 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">High risk</p>
                      <p className="mt-2 text-3xl font-semibold text-[var(--danger)]">{stats.high}</p>
                    </div>
                    <div className="rounded-[24px] bg-white/75 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Medium risk</p>
                      <p className="mt-2 text-3xl font-semibold text-[var(--accent-strong)]">{stats.medium}</p>
                    </div>
                    <div className="rounded-[24px] bg-white/75 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Low risk</p>
                      <p className="mt-2 text-3xl font-semibold text-[var(--signal)]">{stats.low}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[28px] border border-dashed border-[var(--border)] bg-white/55 p-6 text-sm leading-7 text-[var(--muted)]">
                  Run the audit to see a computed health score, agent signals, and an action board.
                </div>
              )}
            </article>

            <article className="panel rounded-[32px] border p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em]">Findings</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Each finding is attributed to the agent pass that surfaced it.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                {result ? (
                  result.risks.map((risk) => (
                    <article key={`${risk.agent}-${risk.title}`} className="rounded-[26px] border border-[var(--border)] bg-white/70 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${levelStyles[risk.level]}`}
                        >
                          {priorityLabel(risk.level)}
                        </span>
                        <span className="rounded-full bg-[rgba(30,36,48,0.06)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]">
                          {risk.agent}
                        </span>
                      </div>
                      <h4 className="mt-4 text-lg font-semibold">{risk.title}</h4>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{risk.detail}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/55 p-5 text-sm leading-7 text-[var(--muted)]">
                    Findings will appear here after analysis.
                  </div>
                )}
              </div>
            </article>

            <article className="panel rounded-[32px] border p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em]">Action Board</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Governance tasks generated from the highest-value next steps.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyReport}
                  disabled={!result}
                  className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copied ? "Markdown Copied" : "Copy Markdown Report"}
                </button>
              </div>
              <div className="mt-5 grid gap-4">
                {result ? (
                  result.actions.map((action) => <ActionCard key={action.title} action={action} />)
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/55 p-5 text-sm leading-7 text-[var(--muted)]">
                    The action queue will populate after the audit completes.
                  </div>
                )}
              </div>
            </article>

            <article className="panel rounded-[32px] border p-6 sm:p-7">
              <h3 className="text-xl font-semibold tracking-[-0.03em]">Agent Signals</h3>
              <div className="mt-4 grid gap-3">
                {result ? (
                  result.signals.map((signal) => (
                    <div key={signal} className="rounded-[22px] bg-white/75 px-4 py-3 text-sm leading-7 text-[var(--muted)]">
                      {signal}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/55 p-5 text-sm leading-7 text-[var(--muted)]">
                    Repo Sentinel will summarize confidence signals and evidence quality here.
                  </div>
                )}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
