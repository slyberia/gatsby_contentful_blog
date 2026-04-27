import React from "react";
import { Link, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { useStore } from "./state";
import { Prompt } from "./types";

function Sidebar({ issues }: { issues: string[] }) {
  return (
    <aside className="sidebar">
      <h1>Prompt Governance</h1>
      <nav>
        <Link to="/">Dashboard</Link>
        <Link to="/about">About</Link>
        <Link to="/eval">Eval</Link>
        <Link to="/new">New prompt</Link>
        <Link to="/import">Import</Link>
        <Link to="/export">Export</Link>
      </nav>
      {issues.length > 0 && (
        <div className="error" style={{ marginTop: "1rem" }}>
          {issues.map(issue => (
            <div key={issue}>{issue}</div>
          ))}
        </div>
      )}
    </aside>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function Home() {
  const { state, lintSummary } = useStore();
  return (
    <div className="content">
      <Panel title="Overview">
        <p>
          {state.prompts.length} prompt(s) • {state.eval_reports.length} evaluation(s)
        </p>
        <p>Updated at {new Date(state.updated_at).toLocaleString()}</p>
        <p>Lint totals: {lintSummary.errors} errors / {lintSummary.warnings} warnings</p>
      </Panel>
      <Panel title="Prompt library">
        {state.prompts.map(prompt => (
          <div key={prompt.id} className="panel" style={{ marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="pill">v{prompt.version}</div>
                <h3>{prompt.title}</h3>
                <small>
                  Updated {new Date(prompt.updated_at).toLocaleString()} • Lint: {prompt.lint.errors} errors /{" "}
                  {prompt.lint.warnings} warnings
                </small>
              </div>
              <div>
                <Link to={`/prompt/${prompt.id}`}>Open</Link> • <Link to={`/edit/${prompt.id}`}>Edit</Link>
              </div>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function About() {
  return (
    <div className="content">
      <Panel title="About">
        <p>
          This workspace runs entirely in your browser using the <code>promptGov:v1</code> key. No network calls or secrets are
          required. Exports are deterministic JSON so you can review changes explicitly.
        </p>
        <p>The mock evaluator uses a length and lint-based rubric to demonstrate regression detection offline.</p>
      </Panel>
    </div>
  );
}

function PromptForm({ existing, onSave }: { existing?: Prompt; onSave: (title: string, content: string, tags: string[]) => void }) {
  const [title, setTitle] = React.useState(existing?.title ?? "");
  const [content, setContent] = React.useState(existing?.content ?? "");
  const [tags, setTags] = React.useState(existing?.tags.join(", ") ?? "");

  return (
    <form
      onSubmit={evt => {
        evt.preventDefault();
        onSave(
          title.trim(),
          content.trim(),
          tags
            .split(",")
            .map(tag => tag.trim())
            .filter(Boolean)
        );
      }}
    >
      <label htmlFor="title">Title</label>
      <input id="title" value={title} onChange={e => setTitle(e.target.value)} required />
      <label htmlFor="content">Prompt</label>
      <textarea id="content" rows={6} value={content} onChange={e => setContent(e.target.value)} required />
      <label htmlFor="tags">Tags (comma separated)</label>
      <input id="tags" value={tags} onChange={e => setTags(e.target.value)} />
      <button type="submit">Save</button>
    </form>
  );
}

function NewPrompt() {
  const { createPrompt } = useStore();
  const navigate = useNavigate();
  const [message, setMessage] = React.useState<string | null>(null);
  return (
    <div className="content">
      <Panel title="New prompt">
        <PromptForm
          onSave={(title, content, tags) => {
            const created = createPrompt(title, content, tags);
            setMessage("Prompt created with initial snapshot.");
            navigate(`/prompt/${created.id}`);
          }}
        />
        {message && <div className="success">{message}</div>}
      </Panel>
    </div>
  );
}

function EditPrompt() {
  const { state, updatePrompt } = useStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const prompt = state.prompts.find(p => p.id === id);
  const [message, setMessage] = React.useState<string | null>(null);
  if (!prompt) return <div className="content">Prompt not found.</div>;

  return (
    <div className="content">
      <Panel title={`Edit ${prompt.title}`}>
        <PromptForm
          existing={prompt}
          onSave={(title, content, tags) => {
            updatePrompt(prompt.id, title, content, tags, "Edited prompt");
            setMessage("Snapshot recorded with changes.");
            navigate(`/prompt/${prompt.id}`);
          }}
        />
        {message && <div className="success">{message}</div>}
      </Panel>
    </div>
  );
}

function PromptDetail() {
  const { state, runEvalForPrompt } = useStore();
  const { id } = useParams<{ id: string }>();
  const prompt = state.prompts.find(p => p.id === id);
  if (!prompt) return <div className="content">Prompt not found.</div>;
  const reports = state.eval_reports.filter(r => r.prompt_id === prompt.id).reverse();
  return (
    <div className="content">
      <Panel title={prompt.title}>
        <p>{prompt.content}</p>
        <p>
          Tags: {prompt.tags.join(", ")} • v{prompt.version} • Lint: {prompt.lint.errors} errors / {prompt.lint.warnings} warnings
        </p>
        <button onClick={() => runEvalForPrompt(prompt.id)}>Run mock evaluation</button>
      </Panel>
      <Panel title="Versions">
        <ul>
          {prompt.snapshots
            .slice()
            .reverse()
            .map(snap => (
              <li key={snap.version}>
                v{snap.version} @ {new Date(snap.timestamp).toLocaleString()} — {snap.summary}
              </li>
            ))}
        </ul>
      </Panel>
      <Panel title="Evaluation history">
        {reports.length === 0 ? (
          <p>No evaluations yet.</p>
        ) : (
          <ul>
            {reports.map(report => (
              <li key={report.id}>
                {report.status.toUpperCase()} (score {report.score}) — {new Date(report.created_at).toLocaleString()} via {report.runner}{" "}
                {report.regression && <span className="pill">Regression</span>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function EvalPage() {
  const { state, runEvalForAll } = useStore();
  return (
    <div className="content">
      <Panel title="Regression sweep">
        <p>Runs the mock evaluator for every prompt. Any pass → fail transition is flagged as a regression.</p>
        <button onClick={runEvalForAll}>Run all</button>
      </Panel>
      <Panel title="Latest runs">
        {state.eval_reports.length === 0 ? (
          <p>No evaluations yet.</p>
        ) : (
          <ul>
            {[...state.eval_reports].reverse().map(report => (
              <li key={report.id}>
                {report.prompt_id}: {report.status.toUpperCase()} (score {report.score}) {report.regression && <span className="pill">Regression</span>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function ImportPage() {
  const { importJson } = useStore();
  const [input, setInput] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="content">
      <Panel title="Import data">
        <p>Paste exported JSON. Invalid input will show an error but will not crash the page.</p>
        <textarea rows={10} value={input} onChange={e => setInput(e.target.value)} />
        <button
          onClick={() => {
            const result = importJson(input);
            if (result.error) {
              setError(result.error);
              setMessage(null);
            } else {
              setMessage("Import successful.");
              setError(null);
            }
          }}
        >
          Import
        </button>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
      </Panel>
    </div>
  );
}

function ExportPage() {
  const { exportJson } = useStore();
  const [value] = React.useState(exportJson());
  return (
    <div className="content">
      <Panel title="Export data">
        <p>Copy this canonical JSON. `exported_at` will differ per export; everything else is deterministic.</p>
        <textarea rows={12} value={value} readOnly />
      </Panel>
    </div>
  );
}

export default function App() {
  const { state } = useStore();
  return (
    <div className="app-shell">
      <Sidebar issues={state.issues} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/eval" element={<EvalPage />} />
        <Route path="/new" element={<NewPrompt />} />
        <Route path="/prompt/:id" element={<PromptDetail />} />
        <Route path="/edit/:id" element={<EditPrompt />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  );
}
