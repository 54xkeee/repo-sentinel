# Repo Sentinel Application Description

## 中文版

我独立构建了一个名为 Repo Sentinel 的 AI 驱动仓库治理 Agent，用来把零散的仓库上下文转换成结构化的工程治理结果。用户只需要输入仓库名称、README、目录结构摘要和 Issue / PR 现状，系统就会模拟多阶段 Agent 流程：先由 `Scout` 识别项目形态与上下文缺口，再由 `Auditor` 检测测试覆盖、文档完整度、CI 自动化和协作流程中的治理风险，最后由 `Planner` 将这些发现整理成带优先级、负责人建议和时间预估的行动列表，并自动输出一份可直接粘贴到 GitHub Issue 或项目文档中的 Markdown 报告。

这个项目解决的核心问题是：很多仓库其实并不缺代码，而是缺少对“当前工程健康度”和“接下来该先治理什么”的快速判断。传统做法依赖资深维护者逐项阅读 README、目录、Issue 和流程配置，既慢又容易遗漏。Repo Sentinel 将这部分工作产品化为一个轻量但完整的 Agent 工作流，让仓库治理从“依赖经验的人工巡检”变成“可重复的结构化分析”。

在核心逻辑上，这个项目采用了多 Agent 风格、单应用实现的方式。我没有把它做成一个普通聊天机器人，而是拆成三个职责清晰的阶段：`Scout` 负责上下文恢复，`Auditor` 负责风险识别，`Planner` 负责可执行任务生成。这样既能体现 Agent 系统中的角色分工和链式推理，也能保持首版系统足够稳定、易于演示和公开部署。最终前端会展示健康度评分、关键风险、治理信号、行动看板和 Markdown 导出结果，整个体验更接近真实开发流程中的“工程治理助手”，而不是单次问答工具。

从展示价值上看，Repo Sentinel 能比较完整地体现我对 Agent 产品落地方式的理解：一方面我关注模型或 Agent 如何做推理，另一方面我更关注它如何进入真实软件工作流，产出可被工程团队直接消费的结果。这个项目虽然首版没有接入 GitHub OAuth 或真实写权限，但它已经具备清晰的输入输出接口、可运行的前后端架构、可复制的分析流程，以及面向公开作品集的完整产品包装。我认为它很好地展示了我将 AI 能力转化为工程化产品的能力。

## English Summary

I built Repo Sentinel, an AI-driven repository governance agent that converts messy repository context into a structured maintenance plan. Given a repository name, README content, structure summary, and issue or PR notes, the system simulates a multi-stage agent workflow: `Scout` reconstructs project context, `Auditor` identifies governance risks across testing, documentation, CI, and collaboration workflows, and `Planner` turns those findings into prioritized actions with suggested owners, timelines, and a Markdown report that can be pasted directly into GitHub issues or project docs.

The project is intentionally designed as a workflow product rather than a generic chat interface. Its goal is to help maintainers quickly answer questions like “How healthy is this repository?” and “What should we fix first?” without manually reading scattered project artifacts. From an implementation perspective, it demonstrates multi-agent style decomposition, structured reasoning, actionable output design, and a complete full-stack delivery path in a public, portfolio-ready format.
