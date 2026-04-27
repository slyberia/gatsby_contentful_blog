import React, { createContext, useContext, useMemo, useReducer } from "react";
import { runMockEvaluation } from "./eval/mockRunner";
import { lintPrompt, lintAll } from "./lint";
import { AppState, Prompt, VersionSnapshot } from "./types";
import { defaultState, exportState as exportData, importState as importData, loadState, persistState } from "./storage";

type Action =
  | { type: "load"; payload: AppState }
  | { type: "create"; payload: Prompt }
  | { type: "update"; payload: { id: string; title: string; content: string; tags: string[]; summary: string } }
  | { type: "eval"; payload: { promptId: string } };

type StoreContext = {
  state: AppState;
  lintSummary: { errors: number; warnings: number };
  loadIssue?: string;
  createPrompt: (title: string, content: string, tags: string[]) => Prompt;
  updatePrompt: (id: string, title: string, content: string, tags: string[], summary?: string) => Prompt | null;
  runEvalForPrompt: (id: string) => void;
  runEvalForAll: () => void;
  exportJson: () => string;
  importJson: (text: string) => { error?: string };
};

const Store = createContext<StoreContext | null>(null);

function snapshot(prompt: Prompt, content: string, tags: string[], summary: string): VersionSnapshot {
  return {
    version: prompt.version + 1,
    timestamp: new Date().toISOString(),
    summary,
    content,
    tags
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "load":
      return action.payload;
    case "create": {
      return { ...state, prompts: [...state.prompts, action.payload], updated_at: action.payload.updated_at };
    }
    case "update": {
      const prompts = state.prompts.map(prompt => {
        if (prompt.id !== action.payload.id) return prompt;
        const nextSnapshot = snapshot(prompt, action.payload.content, action.payload.tags, action.payload.summary);
        const lint = lintPrompt(action.payload.content, action.payload.tags);
        return {
          ...prompt,
          title: action.payload.title,
          content: action.payload.content,
          tags: action.payload.tags,
          version: nextSnapshot.version,
          snapshots: [...prompt.snapshots, nextSnapshot],
          updated_at: nextSnapshot.timestamp,
          lint
        };
      });
      return { ...state, prompts, updated_at: new Date().toISOString() };
    }
    case "eval": {
      const prompt = state.prompts.find(p => p.id === action.payload.promptId);
      if (!prompt) return state;
      const previous = state.eval_reports.filter(run => run.prompt_id === prompt.id);
      const report = runMockEvaluation(prompt, previous);
      return { ...state, eval_reports: [...state.eval_reports, report], updated_at: report.created_at };
    }
    default:
      return state;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const loaded = loadState();
  const [state, dispatch] = useReducer(reducer, loaded);

  React.useEffect(() => {
    persistState(state);
  }, [state]);

  const value = useMemo<StoreContext>(() => {
    const createPrompt = (title: string, content: string, tags: string[]) => {
      const id = `p-${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = new Date().toISOString();
      const lint = lintPrompt(content, tags);
      const snap: VersionSnapshot = {
        version: 1,
        timestamp: createdAt,
        summary: "Created",
        content,
        tags
      };
      const prompt: Prompt = {
        id,
        title,
        content,
        tags,
        version: 1,
        created_at: createdAt,
        updated_at: createdAt,
        snapshots: [snap],
        lint
      };
      dispatch({ type: "create", payload: prompt });
      return prompt;
    };

    const updatePrompt = (id: string, title: string, content: string, tags: string[], summary?: string) => {
      const prompt = state.prompts.find(p => p.id === id);
      if (!prompt) return null;
      dispatch({
        type: "update",
        payload: { id, title, content, tags, summary: summary || "Edited prompt" }
      });
      return { ...prompt, title, content, tags };
    };

    const runEvalForPrompt = (id: string) => dispatch({ type: "eval", payload: { promptId: id } });

    const runEvalForAll = () => state.prompts.forEach(prompt => runEvalForPrompt(prompt.id));

    const exportJson = () => exportData(state);
    const importJson = (text: string) => {
      const result = importData(text);
      if (result.state) {
        dispatch({ type: "load", payload: result.state });
        return {};
      }
      return { error: result.error };
    };

    return {
      state,
      lintSummary: lintAll(state.prompts),
      loadIssue: state.issues[0],
      createPrompt,
      updatePrompt,
      runEvalForPrompt,
      runEvalForAll,
      exportJson,
      importJson
    };
  }, [state]);

  return <Store.Provider value={value}>{children}</Store.Provider>;
}

export function useStore() {
  const ctx = useContext(Store);
  if (!ctx) throw new Error("Store unavailable");
  return ctx;
}
