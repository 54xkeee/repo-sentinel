"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { AnalysisOutput, RecommendedAction, RepoInput, RiskLevel } from "@/types/repo-sentinel";

const EXAMPLE_INPUT: RepoInput = {
  repoName: "acme/ops-dashboard",
  readmeText:
    "Ops Dashboard 是一个基于 React 和 Next.js 的运维控制台，供维护者查看事故状态、部署进度以及内部工具。这个项目已经支撑值班场景，但当前 README 只覆盖了本地启动方式，没有解释架构设计和模块归属。",
  structureText: `apps/web
components/
lib/
pages/api
.github/workflows
scripts/
未发现 tests 目录
未发现 docs 或架构记录`,
  issueSummary:
    "很多 Issue 缺少复现细节。有几个工单已经积压较久，分诊速度偏慢，维护者在合并前还需要手动检查回归风险。",
};

const EMPTY_RESULT: AnalysisOutput | null = null;

const levelStyles: Record<RiskLevel, string> = {
  high: "border-[rgba(163,70,70,0.24)] bg-[rgba(163,70,70,0.08)] text-[var(--danger)]",
  medium: "border-[rgba(197,103,61,0.24)] bg-[rgba(197,103,61,0.08)] text-[var(--accent-strong)]",
  low: "border-[rgba(15,118,110,0.24)] bg-[rgba(15,118,110,0.08)] text-[var(--signal)]",
};

function priorityLabel(priority: RiskLevel) {
  if (priority === "high") return "高";
  if (priority === "medium") return "中";
  return "低";
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
        <span className="rounded-full bg-white/70 px-3 py-1">负责人：{action.owner}</span>
        <span className="rounded-full bg-white/70 px-3 py-1">耗时：{action.timeframe}</span>
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
          setError("error" in data ? data.error : "分析过程中出现了意外错误。");
          return;
        }

        setResult(data);
      } catch {
        setResult(null);
        setError("连接本地分析接口时发生网络错误。");
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
                  Repo Sentinel 把零散的仓库上下文整理成维护者可直接执行的治理方案。
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
                  这是一个多 Agent 风格的公开演示：Scout 负责还原项目轮廓，Auditor 识别工程风险，
                  Planner 再把发现整理成优先级明确的行动项和可直接复制到 GitHub 的 Markdown 报告。
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                <span className="rounded-full bg-white/80 px-4 py-2">单次运行即可完成治理审计</span>
                <span className="rounded-full bg-white/80 px-4 py-2">支持导出 Issue 用 Markdown</span>
                <span className="rounded-full bg-white/80 px-4 py-2">无需 GitHub Token</span>
              </div>
            </div>
            <div className="panel rounded-[32px] border p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                Pipeline
              </p>
              <ol className="mt-5 space-y-4 text-sm leading-7 text-[var(--muted)]">
                <li>
                  <span className="font-semibold text-[var(--foreground)]">01. Intake</span> 输入仓库名称、
                  README、目录结构以及 Issue 摘要。
                </li>
                <li>
                  <span className="font-semibold text-[var(--foreground)]">02. Analysis</span> 用透明规则模拟
                  Scout、Auditor、Planner 三段分析流程。
                </li>
                <li>
                  <span className="font-semibold text-[var(--foreground)]">03. Action Board</span> 输出健康度、
                  风险项和维护者可以直接落地的执行清单。
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
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">仓库输入</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    可以自由粘贴仓库上下文中的任意组合信息。输入不完整时，Repo Sentinel 也会尽量优雅降级。
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
                  加载示例
                </button>
              </div>
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">仓库名称</span>
                  <input
                    value={form.repoName}
                    onChange={(event) => setForm({ ...form, repoName: event.target.value })}
                    placeholder="owner/repo"
                    className="w-full rounded-[20px] border border-[var(--border)] bg-white/90 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">README 内容</span>
                  <textarea
                    value={form.readmeText}
                    onChange={(event) => setForm({ ...form, readmeText: event.target.value })}
                    rows={7}
                    placeholder="粘贴 README 或项目简介。"
                    className="w-full rounded-[24px] border border-[var(--border)] bg-white/90 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">目录结构摘要</span>
                  <textarea
                    value={form.structureText}
                    onChange={(event) => setForm({ ...form, structureText: event.target.value })}
                    rows={6}
                    placeholder="粘贴目录、模块、工作流和架构提示。"
                    className="w-full rounded-[24px] border border-[var(--border)] bg-white/90 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Issue / PR 摘要</span>
                  <textarea
                    value={form.issueSummary}
                    onChange={(event) => setForm({ ...form, issueSummary: event.target.value })}
                    rows={5}
                    placeholder="粘贴分诊记录、积压问题或合并痛点。"
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
                  {isPending ? "分析中..." : "开始治理审计"}
                </button>
                <span className="text-sm text-[var(--muted)]">
                  当前目标：{deferredRepoName || "未命名仓库"}
                </span>
              </div>
              {error ? (
                <p className="mt-4 rounded-[18px] border border-[rgba(163,70,70,0.2)] bg-[rgba(163,70,70,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                  {error}
                </p>
              ) : null}
            </article>

            <article className="panel rounded-[32px] border p-6 sm:p-7">
              <h3 className="text-xl font-semibold tracking-[-0.03em]">Agent 设计</h3>
              <div className="mt-5 grid gap-4">
                {[
                  ["Scout", "从现有材料中恢复仓库意图、结构形态以及缺失的上下文。"],
                  ["Auditor", "识别测试、自动化、文档和协作流程中的风险信号。"],
                  ["Planner", "把弱信号整理成可执行、可排序的行动项，并给出负责人和时间预估。"],
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
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">治理评分卡</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    为维护者、面试评审和 GitHub Issue 导出场景准备的简洁结果面板。
                  </p>
                </div>
                <div
                  className="metric-ring grid h-32 w-32 place-items-center rounded-full"
                  style={{ ["--score" as string]: scoreDegrees }}
                >
                  <div className="text-center">
                    <p className="text-3xl font-semibold">{result?.score ?? "--"}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">健康度</p>
                  </div>
                </div>
              </div>

              {result ? (
                <div className="mt-6 space-y-6">
                  <p className="text-sm leading-8 text-[var(--muted)]">{result.summary}</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-[24px] bg-white/75 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">高风险</p>
                      <p className="mt-2 text-3xl font-semibold text-[var(--danger)]">{stats.high}</p>
                    </div>
                    <div className="rounded-[24px] bg-white/75 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">中风险</p>
                      <p className="mt-2 text-3xl font-semibold text-[var(--accent-strong)]">{stats.medium}</p>
                    </div>
                    <div className="rounded-[24px] bg-white/75 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">低风险</p>
                      <p className="mt-2 text-3xl font-semibold text-[var(--signal)]">{stats.low}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[28px] border border-dashed border-[var(--border)] bg-white/55 p-6 text-sm leading-7 text-[var(--muted)]">
                  运行审计后，这里会显示健康度、Agent 信号和行动面板。
                </div>
              )}
            </article>

            <article className="panel rounded-[32px] border p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em]">关键发现</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    每条发现都会标记它来自哪一个 Agent 阶段。
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                {result ? (
                  result.risks.map((risk) => (
                    <article
                      key={`${risk.agent}-${risk.title}`}
                      className="rounded-[26px] border border-[var(--border)] bg-white/70 p-5"
                    >
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
                    分析完成后，发现列表会显示在这里。
                  </div>
                )}
              </div>
            </article>

            <article className="panel rounded-[32px] border p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em]">行动面板</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    这里会展示最值得优先推进的治理任务。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyReport}
                  disabled={!result}
                  className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copied ? "Markdown 已复制" : "复制 Markdown 报告"}
                </button>
              </div>
              <div className="mt-5 grid gap-4">
                {result ? (
                  result.actions.map((action) => <ActionCard key={action.title} action={action} />)
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/55 p-5 text-sm leading-7 text-[var(--muted)]">
                    审计完成后，这里会生成治理行动清单。
                  </div>
                )}
              </div>
            </article>

            <article className="panel rounded-[32px] border p-6 sm:p-7">
              <h3 className="text-xl font-semibold tracking-[-0.03em]">Agent 信号</h3>
              <div className="mt-4 grid gap-3">
                {result ? (
                  result.signals.map((signal) => (
                    <div key={signal} className="rounded-[22px] bg-white/75 px-4 py-3 text-sm leading-7 text-[var(--muted)]">
                      {signal}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/55 p-5 text-sm leading-7 text-[var(--muted)]">
                    Repo Sentinel 会在这里总结判断依据和置信度信号。
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
