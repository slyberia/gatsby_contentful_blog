import { LintResult, Prompt } from "./types";

export function lintPrompt(content: string, tags: string[]): LintResult {
  const messages: string[] = [];
  let errors = 0;
  let warnings = 0;

  if (!content.trim()) {
    errors += 1;
    messages.push("Prompt text cannot be empty.");
  }

  if (content.length < 40) {
    warnings += 1;
    messages.push("Prompt is short; consider adding context.");
  }

  if (tags.length === 0) {
    warnings += 1;
    messages.push("No tags provided; add at least one for discoverability.");
  }

  if (!content.toLowerCase().includes("cite")) {
    warnings += 1;
    messages.push("Prompts should instruct the model to cite key assumptions.");
  }

  return { errors, warnings, messages };
}

export function lintAll(prompts: Prompt[]): { errors: number; warnings: number } {
  return prompts.reduce(
    (acc, prompt) => ({
      errors: acc.errors + prompt.lint.errors,
      warnings: acc.warnings + prompt.lint.warnings
    }),
    { errors: 0, warnings: 0 }
  );
}
