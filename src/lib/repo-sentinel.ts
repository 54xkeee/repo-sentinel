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
  const repoName = input.repoName.trim() || "未命名仓库";
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
  if (hasAny(combined, ["next", "react", "tailwind"])) return "前端平台型项目";
  if (hasAny(combined, ["fastapi", "express", "api", "controller", "service"])) {
    return "服务型后端项目";
  }
  if (hasAny(structureText, ["packages", "apps", "turbo", "pnpm-workspace"])) {
    return "Monorepo 项目";
  }
  return "通用软件仓库";
}

function buildSignals(combined: string, readmeText: string, structureText: string) {
  const signals: string[] = [];

  if (readmeText.length > 180) {
    signals.push("README 提供了较充分的项目意图，足以让 Scout 还原产品上下文。");
  } else {
    signals.push("README 信息偏少，因此部分判断主要依赖目录和结构信号。");
  }

  if (hasAny(combined, ["test", "jest", "vitest", "playwright", "cypress", "pytest"])) {
    signals.push("在仓库上下文中检测到了测试相关信号。");
  } else {
    signals.push("当前输入中没有明显出现自动化测试痕迹。");
  }

  if (hasAny(combined, [".github", "workflow", "ci", "github actions"])) {
    signals.push("自动化或 CI 线索表明该项目具备一定流程成熟度。");
  } else {
    signals.push("当前输入显示协作自动化较薄弱，甚至可能缺失。");
  }

  if (structureText.length > 120) {
    signals.push("目录结构摘要足够详细，已经能支撑范围明确的治理建议。");
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
      title: "README 叙事不足",
      detail: `${repoName} 缺少可用的 README 内容，这会让新成员和 Agent 都更难快速理解项目意图。`,
      level: "high",
      agent: "Scout",
    });
  }

  if (!hasAny(combined, ["test", "jest", "vitest", "playwright", "cypress", "pytest"])) {
    risks.push({
      title: "验证面偏弱",
      detail: "Auditor 没有发现明确的自动化测试信号，这会增加回归风险和交付不确定性。",
      level: "high",
      agent: "Auditor",
    });
  }

  if (!hasAny(combined, [".github", "workflow", "ci", "github actions"])) {
    risks.push({
      title: "治理自动化不足",
      detail: "没有足够证据表明项目具备 CI 或工作流护栏，因此日常检查很可能仍依赖人工完成。",
      level: "medium",
      agent: "Auditor",
    });
  }

  if (!hasAny(combined, ["contributing", "docs", "architecture", "adr", "decision"])) {
    risks.push({
      title: "文档债务",
      detail: "Planner 几乎没有看到贡献指南或架构记录，这会拖慢多人协作和上下文交接。",
      level: "medium",
      agent: "Planner",
    });
  }

  if (issueSummary && hasAny(issueSummary.toLowerCase(), ["blocked", "stale", "slow", "triage", "unclear"])) {
    risks.push({
      title: "Issue 流程摩擦",
      detail: "Issue 摘要表明维护者可能正在消耗不少时间处理重复分诊和低效跟进。",
      level: "medium",
      agent: "Planner",
    });
  }

  if (
    structureText &&
    structureText.split("\n").length > 18 &&
    !hasAny(combined, ["docs", "architecture", "module"])
  ) {
    risks.push({
      title: "结构复杂但缺少地图",
      detail: "仓库结构已经有一定复杂度，但缺少与之匹配的架构说明或导航文档。",
      level: "low",
      agent: "Scout",
    });
  }

  if (risks.length === 0) {
    risks.push({
      title: "上下文置信度偏低",
      detail: "Repo Sentinel 暂时没有发现明显风险，但当前输入仍然偏少，不足以支撑一次高置信度的深度治理审计。",
      level: "low",
      agent: "Scout",
    });
  }

  return risks;
}

function buildActions(risks: Insight[]): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  const hasTestingRisk = risks.some((risk) => risk.title === "验证面偏弱");
  const hasReadmeRisk = risks.some((risk) => risk.title === "README 叙事不足");
  const hasAutomationRisk = risks.some((risk) => risk.title === "治理自动化不足");
  const hasDocsRisk = risks.some((risk) => risk.title === "文档债务");
  const hasIssueRisk = risks.some((risk) => risk.title === "Issue 流程摩擦");

  if (hasTestingRisk) {
    actions.push({
      title: "建立最小验证闸门",
      rationale: "补充最小化冒烟测试，并加入强制性的 lint/build 流程，让贡献者尽快收到回归反馈。",
      priority: "high",
      owner: "平台负责人或核心维护者",
      timeframe: "1-2 天",
    });
  }

  if (hasReadmeRisk) {
    actions.push({
      title: "补一份可操作的 README",
      rationale: "系统化补充项目目标、启动方式、架构边界和常见流程，让人和 Agent 都能更快恢复上下文。",
      priority: "high",
      owner: "项目负责人",
      timeframe: "半天",
    });
  }

  if (hasAutomationRisk) {
    actions.push({
      title: "引入治理工作流",
      rationale: "补齐 CI 和周期性维护工作流，用于 Issue 分诊、依赖检查和状态汇报。",
      priority: "medium",
      owner: "DevEx 维护者",
      timeframe: "1-2 天",
    });
  }

  if (hasDocsRisk) {
    actions.push({
      title: "建立轻量架构记录",
      rationale: "用轻量文档记录模块边界、负责人和关键决策，降低多人协作成本。",
      priority: "medium",
      owner: "技术负责人",
      timeframe: "半天",
    });
  }

  if (hasIssueRisk) {
    actions.push({
      title: "标准化 Issue 受理与升级流程",
      rationale: "增加 Issue 模板、标签和每周分诊机制，减少长期积压和描述不清的问题单。",
      priority: "medium",
      owner: "维护者轮值",
      timeframe: "半天",
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "扩充分析输入范围",
      rationale: "补充 README、目录结构和 Issue 快照，让 Repo Sentinel 生成更高置信度的治理建议。",
      priority: "low",
      owner: "操作者",
      timeframe: "15 分钟",
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

  return `${repoName} 当前看起来像一个${projectShape}，治理健康度为 ${score}/100。Scout 已经还原了仓库结构轮廓，Auditor 识别出 ${highCount} 个高风险问题和 ${mediumCount} 个中风险问题，Planner 则把这些发现整理成了一份适合落到 GitHub Issue 或维护者同步会中的执行清单。`;
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
    .map((risk) => `- [${risk.level.toUpperCase()}] ${risk.title}（${risk.agent}）：${risk.detail}`)
    .join("\n");

  const actionLines = actions
    .map(
      (action, index) =>
        `${index + 1}. ${action.title} - ${action.rationale} 负责人：${action.owner}。预计耗时：${action.timeframe}。优先级：${action.priority.toUpperCase()}。`,
    )
    .join("\n");

  const signalLines = signals.map((signal) => `- ${signal}`).join("\n");

  return `# Repo Sentinel 仓库治理报告：${repoName}

## 健康度评分
${score}/100

## 执行摘要
${summary}

## Agent 信号
${signalLines}

## 关键风险
${riskLines}

## 建议行动
${actionLines}

## 建议下一步
创建一个治理跟踪 Issue，复制上面的行动清单，并在下一轮维护周期中优先完成前两项。`;
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
  if (signals.some((signal) => signal.includes("CI"))) score += 2;

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
