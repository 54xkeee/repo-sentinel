export type RiskLevel = "high" | "medium" | "low";

export type AgentName = "Scout" | "Auditor" | "Planner";

export interface RepoInput {
  repoName: string;
  readmeText: string;
  structureText: string;
  issueSummary: string;
}

export interface Insight {
  title: string;
  detail: string;
  level: RiskLevel;
  agent: AgentName;
}

export interface RecommendedAction {
  title: string;
  rationale: string;
  priority: RiskLevel;
  owner: string;
  timeframe: string;
}

export interface AnalysisOutput {
  score: number;
  summary: string;
  signals: string[];
  risks: Insight[];
  actions: RecommendedAction[];
  reportMarkdown: string;
}
