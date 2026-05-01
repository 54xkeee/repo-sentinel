import {
  AnalysisOutput,
  Insight,
  RecommendedAction,
  RepoInput,
  RiskLevel,
} from "@/types/repo-sentinel";

const RISK_WEIGHT: Record<RiskLevel, number> = {
  high: 13,
  medium: 8,
  low: 4,
};

function normalize(input: RepoInput) {
  const repoName = input.repoName.trim() || "Unnamed Repository";
  const readmeText = input.readmeText.trim();
  const structureText = input.structureText.trim();
  const issueSummary = input.issueSummary.trim();
  const combined = [readmeText, structureText, issueSummary].join("\n").toLowerCase();

  return {
    repoName,
    readmeText,
    structureText,
    issueSummary,
    combined,
  };
}

function hasAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

function inferProjectShape(structureText: string, combined: string) {
  if (hasAny(combined, ["next", "react", "tailwind"])) return "frontend platform";
  if (hasAny(combined, ["fastapi", "express", "api", "controller", "service"])) {
    return "service-oriented backend";
  }
  if (hasAny(structureText, ["packages", "apps", "turbo", "pnpm-workspace"])) {
    return "monorepo";
  }
  return "general software repository";
}

function buildSignals(combined: string, readmeText: string, structureText: string) {
  const signals: string[] = [];

  if (readmeText.length > 180) {
    signals.push("README provides enough intent for Scout to recover product context.");
  } else {
    signals.push("README context is sparse, so some judgments rely on structural hints.");
  }

  if (hasAny(combined, ["test", "jest", "vitest", "playwright", "cypress", "pytest"])) {
    signals.push("Testing signals detected in the repository context.");
  } else {
    signals.push("No explicit testing footprint detected from the supplied context.");
  }

  if (hasAny(combined, [".github", "workflow", "ci", "github actions"])) {
    signals.push("Automation or CI hints suggest some process maturity.");
  } else {
    signals.push("Collaboration automation looks thin or absent from the supplied inputs.");
  }

  if (structureText.length > 120) {
    signals.push("Structure summary is detailed enough to support scoped remediation planning.");
  }

  return signals;
}

function buildRisks(
  repoName: string,
  readmeText: string,
  structureText: string,
  issueSummary: string,
  combined: string,
): Insight[] {
  const risks: Insight[] = [];

  if (!readmeText) {
    risks.push({
      title: "Thin product narrative",
      detail: `${repoName} lacks a usable README payload, which makes onboarding and intent recovery harder for humans and agents.`,
      level: "high",
      agent: "Scout",
    });
  }

  if (!hasAny(combined, ["test", "jest", "vitest", "playwright", "cypress", "pytest"])) {
    risks.push({
      title: "Weak verification surface",
      detail: "Auditor could not find clear signs of automated testing, increasing regression and trust risk.",
      level: "high",
      agent: "Auditor",
    });
  }

  if (!hasAny(combined, [".github", "workflow", "ci", "github actions"])) {
    risks.push({
      title: "Limited governance automation",
      detail: "There is no strong evidence of CI or workflow guardrails, so routine checks may remain manual.",
      level: "medium",
      agent: "Auditor",
    });
  }

  if (!hasAny(combined, ["contributing", "docs", "architecture", "adr", "decision"])) {
    risks.push({
      title: "Documentation debt",
      detail: "Planner sees limited signs of contributor guidance or architecture records, which can slow coordination.",
      level: "medium",
      agent: "Planner",
    });
  }

  if (issueSummary && hasAny(issueSummary.toLowerCase(), ["blocked", "stale", "slow", "triage", "unclear"])) {
    risks.push({
      title: "Issue workflow friction",
      detail: "The issue summary suggests maintainers may be spending time on repetitive triage and follow-up loops.",
      level: "medium",
      agent: "Planner",
    });
  }

  if (structureText && structureText.split("\n").length > 18 && !hasAny(combined, ["docs", "architecture", "module"])) {
    risks.push({
      title: "Repository complexity without map",
      detail: "The structure appears non-trivial, but there is no strong sign of a matching architecture guide.",
      level: "low",
      agent: "Scout",
    });
  }

  if (risks.length === 0) {
    risks.push({
      title: "Low context confidence",
      detail: "Repo Sentinel found few obvious risks, but the current input set is too light for a deep governance audit.",
      level: "low",
      agent: "Scout",
    });
  }

  return risks;
}

function buildActions(risks: Insight[]): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  const hasTestingRisk = risks.some((risk) => risk.title === "Weak verification surface");
  const hasReadmeRisk = risks.some((risk) => risk.title === "Thin product narrative");
  const hasAutomationRisk = risks.some((risk) => risk.title === "Limited governance automation");
  const hasDocsRisk = risks.some((risk) => risk.title === "Documentation debt");
  const hasIssueRisk = risks.some((risk) => risk.title === "Issue workflow friction");

  if (hasTestingRisk) {
    actions.push({
      title: "Establish a minimal verification gate",
      rationale: "Add smoke tests and a mandatory lint/build workflow so contributors get fast regression feedback.",
      priority: "high",
      owner: "Platform or core maintainers",
      timeframe: "1-2 days",
    });
  }

  if (hasReadmeRisk) {
    actions.push({
      title: "Write an operator-grade README",
      rationale: "Document project intent, setup, architecture, and common workflows so both contributors and agents recover context quickly.",
      priority: "high",
      owner: "Project owner",
      timeframe: "Half day",
    });
  }

  if (hasAutomationRisk) {
    actions.push({
      title: "Introduce governance workflows",
      rationale: "Add CI plus scheduled maintenance flows for issue triage, dependency checks, and status reporting.",
      priority: "medium",
      owner: "DevEx maintainer",
      timeframe: "1-2 days",
    });
  }

  if (hasDocsRisk) {
    actions.push({
      title: "Create a lightweight architecture record",
      rationale: "Capture module boundaries, ownership, and decisions to reduce contributor coordination cost.",
      priority: "medium",
      owner: "Tech lead",
      timeframe: "Half day",
    });
  }

  if (hasIssueRisk) {
    actions.push({
      title: "Standardize issue intake and escalation",
      rationale: "Add issue templates, labels, and weekly triage routines to prevent stale and under-specified work items.",
      priority: "medium",
      owner: "Maintainer rotation",
      timeframe: "Half day",
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "Expand analysis input scope",
      rationale: "Provide README, directory map, and issue snapshots so Repo Sentinel can produce a higher-confidence governance plan.",
      priority: "low",
      owner: "Operator",
      timeframe: "15 minutes",
    });
  }

  return actions;
}

function clampScore(base: number) {
  return Math.max(18, Math.min(96, base));
}

function buildSummary(repoName: string, projectShape: string, score: number, risks: Insight[]) {
  const highCount = risks.filter((risk) => risk.level === "high").length;
  const mediumCount = risks.filter((risk) => risk.level === "medium").length;

  return `${repoName} looks like a ${projectShape} with a governance health score of ${score}/100. Scout recovered the repository shape, Auditor flagged ${highCount} high-risk and ${mediumCount} medium-risk governance gaps, and Planner converted the result into a short execution queue suitable for GitHub issues or a maintainer sync.`;
}

function buildMarkdownReport(
  repoName: string,
  score: number,
  summary: string,
  signals: string[],
  risks: Insight[],
  actions: RecommendedAction[],
) {
  const riskLines = risks
    .map(
      (risk) =>
        `- [${risk.level.toUpperCase()}] ${risk.title} (${risk.agent}): ${risk.detail}`,
    )
    .join("\n");

  const actionLines = actions
    .map(
      (action, index) =>
        `${index + 1}. ${action.title} - ${action.rationale} Owner: ${action.owner}. Timeframe: ${action.timeframe}. Priority: ${action.priority.toUpperCase()}.`,
    )
    .join("\n");

  const signalLines = signals.map((signal) => `- ${signal}`).join("\n");

  return `# Repo Sentinel Governance Report: ${repoName}

## Health Score
${score}/100

## Executive Summary
${summary}

## Agent Signals
${signalLines}

## Key Risks
${riskLines}

## Recommended Actions
${actionLines}

## Suggested Next Step
Open one governance tracking issue, copy the action list above, and execute the top two actions in the next maintainer cycle.`;
}

export function analyzeRepository(input: RepoInput): AnalysisOutput {
  const { repoName, readmeText, structureText, issueSummary, combined } = normalize(input);
  const projectShape = inferProjectShape(structureText.toLowerCase(), combined);
  const signals = buildSignals(combined, readmeText, structureText);
  const risks = buildRisks(repoName, readmeText, structureText, issueSummary, combined);
  const actions = buildActions(risks);

  let score = 82;
  score -= risks.reduce((total, risk) => total + RISK_WEIGHT[risk.level], 0);

  if (readmeText.length > 240) score += 4;
  if (structureText.length > 160) score += 3;
  if (issueSummary.length > 120) score += 2;
  if (signals.some((signal) => signal.includes("Automation"))) score += 2;

  const finalScore = clampScore(score);
  const summary = buildSummary(repoName, projectShape, finalScore, risks);
  const reportMarkdown = buildMarkdownReport(
    repoName,
    finalScore,
    summary,
    signals,
    risks,
    actions,
  );

  return {
    score: finalScore,
    summary,
    signals,
    risks,
    actions,
    reportMarkdown,
  };
}
