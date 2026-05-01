import { analyzeRepository } from "@/lib/repo-sentinel";
import { RepoInput } from "@/types/repo-sentinel";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<RepoInput>;

  const input: RepoInput = {
    repoName: payload.repoName?.trim() ?? "",
    readmeText: payload.readmeText?.trim() ?? "",
    structureText: payload.structureText?.trim() ?? "",
    issueSummary: payload.issueSummary?.trim() ?? "",
  };

  if (!input.repoName && !input.readmeText && !input.structureText && !input.issueSummary) {
    return NextResponse.json(
      {
        error: "请至少提供一项仓库信息，这样 Repo Sentinel 才能开始分析。",
      },
      { status: 400 },
    );
  }

  const result = analyzeRepository(input);
  return NextResponse.json(result);
}
