import { z } from "zod";
import { AppState, EvalReport, Prompt, VersionSnapshot } from "./types";
import { lintPrompt } from "./lint";

export const STORAGE_KEY = "promptGov:v1";
export const SCHEMA_VERSION = "1.0";

const promptSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  version: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  snapshots: z.array(
    z.object({
      version: z.number(),
      timestamp: z.string(),
      summary: z.string(),
      content: z.string(),
      tags: z.array(z.string())
    })
  ),
  lint: z.object({
    errors: z.number(),
    warnings: z.number(),
    messages: z.array(z.string())
  })
});

const evalReportSchema = z.object({
  id: z.string(),
  prompt_id: z.string(),
  status: z.union([z.literal("pass"), z.literal("fail")]),
  score: z.number(),
  regression: z.boolean(),
  runner: z.string(),
  notes: z.string().optional(),
  created_at: z.string()
});

const stateSchema = z.object({
  schema_version: z.literal("1.0"),
  updated_at: z.string(),
  prompts: z.array(promptSchema),
  eval_reports: z.array(evalReportSchema),
  issues: z.array(z.string()).optional()
});

const now = () => new Date().toISOString();

const defaultPrompt = (): Prompt => {
  const created = now();
  const snapshot: VersionSnapshot = {
    version: 1,
    timestamp: created,
    summary: "Created",
    content: "Keep answers concise. Cite missing assumptions explicitly.",
    tags: ["starter"]
  };
  const lint = lintPrompt(snapshot.content, snapshot.tags);
  return {
    id: "welcome",
    title: "Welcome prompt",
    content: snapshot.content,
    tags: snapshot.tags,
    version: 1,
    created_at: created,
    updated_at: created,
    snapshots: [snapshot],
    lint
  };
};

export const defaultState = (): AppState => ({
  schema_version: SCHEMA_VERSION,
  updated_at: now(),
  prompts: [defaultPrompt()],
  eval_reports: [],
  issues: []
});

export function canonicalize(state: AppState): AppState {
  return {
    ...state,
    prompts: [...state.prompts].sort((a, b) => a.id.localeCompare(b.id)),
    eval_reports: [...state.eval_reports].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    issues: state.issues ?? []
  };
}

export function runMigrations(raw: unknown): AppState {
  const parsed = stateSchema.safeParse(raw);
  if (parsed.success) {
    return canonicalize({ ...parsed.data, issues: parsed.data.issues ?? [] });
  }

  // Migration: accept legacy shape without lint/snapshots and repair.
  const legacy = z
    .object({
      schema_version: z.string().optional(),
      prompts: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
            content: z.string(),
            tags: z.array(z.string()).optional()
          })
        )
        .optional(),
      eval_reports: z.array(evalReportSchema).optional()
    })
    .safeParse(raw);

  if (legacy.success) {
    const prompts: Prompt[] = (legacy.data.prompts ?? []).map((prompt, index) => {
      const snapshotContent = prompt.content;
      const snapTags = prompt.tags ?? [];
      const lint = lintPrompt(snapshotContent, snapTags);
      const timestamp = now();
      return {
        id: prompt.id || `legacy-${index}`,
        title: prompt.title || "Untitled",
        content: snapshotContent,
        tags: snapTags,
        version: 1,
        created_at: timestamp,
        updated_at: timestamp,
        snapshots: [
          {
            version: 1,
            timestamp,
            summary: "Migrated legacy prompt",
            content: snapshotContent,
            tags: snapTags
          }
        ],
        lint
      };
    });

    return canonicalize({
      schema_version: SCHEMA_VERSION,
      updated_at: now(),
      prompts,
      eval_reports: legacy.data.eval_reports ?? [],
      issues: ["Legacy data migrated to schema 1.0."]
    });
  }

  return defaultState();
}

export function loadState(storage: Storage = window.localStorage): AppState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return runMigrations(parsed);
  } catch (err) {
    const fallback = defaultState();
    fallback.issues = ["Stored data was invalid and was reset."];
    return fallback;
  }
}

export function persistState(state: AppState, storage: Storage = window.localStorage) {
  const payload = canonicalize({ ...state, updated_at: now() });
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function exportState(state: AppState): string {
  const payload = canonicalize(state);
  return JSON.stringify(
    {
      schema_version: SCHEMA_VERSION,
      exported_at: now(),
      prompts: payload.prompts,
      eval_reports: payload.eval_reports
    },
    null,
    2
  );
}

export function importState(text: string, storage: Storage = window.localStorage): { state?: AppState; error?: string } {
  try {
    const parsed = JSON.parse(text);
    const migrated = runMigrations(parsed);
    persistState(migrated, storage);
    return { state: migrated };
  } catch (err) {
    return { error: (err as Error).message || "Invalid import data" };
  }
}
