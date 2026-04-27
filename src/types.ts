export type LintResult = {
  errors: number;
  warnings: number;
  messages: string[];
};

export type VersionSnapshot = {
  version: number;
  timestamp: string;
  summary: string;
  content: string;
  tags: string[];
};

export type Prompt = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  version: number;
  created_at: string;
  updated_at: string;
  snapshots: VersionSnapshot[];
  lint: LintResult;
};

export type EvalStatus = "pass" | "fail";

export type EvalReport = {
  id: string;
  prompt_id: string;
  status: EvalStatus;
  score: number;
  regression: boolean;
  runner: string;
  notes?: string;
  created_at: string;
};

export type AppState = {
  schema_version: "1.0";
  updated_at: string;
  prompts: Prompt[];
  eval_reports: EvalReport[];
  issues: string[];
};
