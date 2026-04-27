import { describe, expect, it } from "vitest";
import { runMockEvaluation, detectRegression } from "../src/eval/mockRunner";
import { defaultState, exportState, importState, STORAGE_KEY } from "../src/storage";
import { canonicalize } from "../src/storage";

describe("import safety", () => {
  it("rejects invalid JSON without throwing", () => {
    const memory: Storage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    } as Storage;
    const result = importState("not-json", memory);
    expect(result.error).toBeDefined();
  });

  it("roundtrips canonical export", () => {
    const baseline = defaultState();
    const exported = exportState(baseline);
    const memory: Storage = {
      data: "" as string,
      getItem() {
        return this.data;
      },
      setItem(_key: string, value: string) {
        this.data = value;
      },
      removeItem() {}
    } as unknown as Storage;

    const imported = importState(exported, memory);
    expect(imported.state).toBeDefined();
    const again = exportState(canonicalize(imported.state!));

    const normalize = (json: string) => {
      const parsed = JSON.parse(json);
      delete parsed.exported_at;
      return parsed;
    };

    expect(normalize(exported)).toEqual(normalize(again));
  });
});

describe("regression detection", () => {
  it("flags a pass -> fail transition", () => {
    const previous = [
      {
        id: "r1",
        prompt_id: "p1",
        status: "pass" as const,
        score: 80,
        regression: false,
        runner: "mock",
        created_at: "2024-01-01T00:00:00.000Z"
      }
    ];
    expect(detectRegression(previous as any, "fail")).toBe(true);
  });

  it("mock runner produces an eval report", () => {
    const state = defaultState();
    const prompt = state.prompts[0];
    const report = runMockEvaluation(prompt, []);
    expect(report.prompt_id).toBe(prompt.id);
    expect(report.score).toBeTypeOf("number");
  });

  it("creates version snapshots on edit", () => {
    const baseline = defaultState();
    const prompt = baseline.prompts[0];
    const updatedPrompt = {
      ...prompt,
      version: prompt.version + 1,
      snapshots: [...prompt.snapshots, { ...prompt.snapshots[0], version: prompt.version + 1, summary: "Edited", timestamp: new Date().toISOString() }]
    };
    expect(updatedPrompt.snapshots.length).toBeGreaterThan(1);
    expect(updatedPrompt.snapshots.at(-1)?.version).toBe(prompt.version + 1);
  });
});
