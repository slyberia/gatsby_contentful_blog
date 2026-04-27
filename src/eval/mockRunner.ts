import { EvalReport, EvalStatus, Prompt } from "../types";

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 8)}`;

export function detectRegression(previous: EvalReport[], nextStatus: EvalStatus): boolean {
  const lastPass = [...previous].reverse().find(run => run.status === "pass");
  return Boolean(lastPass && nextStatus === "fail");
}

export function runMockEvaluation(prompt: Prompt, previous: EvalReport[]): EvalReport {
  const baseScore = Math.min(100, Math.max(0, prompt.content.length));
  const lintPenalty = prompt.lint.errors * 15 + prompt.lint.warnings * 5;
  const score = Math.max(0, baseScore - lintPenalty);
  const status: EvalStatus = score >= 50 ? "pass" : "fail";
  const regression = detectRegression(previous, status);

  return {
    id: makeId("eval"),
    prompt_id: prompt.id,
    status,
    score,
    regression,
    runner: "mock",
    notes: regression ? "Regression detected relative to prior passing run." : undefined,
    created_at: new Date().toISOString()
  };
}
