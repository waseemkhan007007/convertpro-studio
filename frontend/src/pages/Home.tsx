import { useMemo, useState } from "react";
import { Info, Lock, Search, Zap } from "lucide-react";
import ToolCard from "../components/ToolCard";
import { useBackendStatus } from "../hooks/useBackendStatus";
import { searchTools } from "../tools/registry";

const startCommands = [
  "cd $HOME\\convertpro-studio\\backend",
  ".\\.venv\\Scripts\\Activate.ps1",
  "uvicorn app.main:app --reload --port 8000",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const { status } = useBackendStatus();
  const results = useMemo(() => searchTools(query), [query]);

  return (
    <div>
      <section className="border-b border-slate-200 bg-gradient-to-b from-violet-50 to-slate-50 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Convert files on your own computer
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Audio, video, images and PDFs in one place. Files are processed by a backend running on your PC,
            and temporary files are removed automatically.
          </p>
          <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4" aria-hidden="true" /> Local processing</span>
            <span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4" aria-hidden="true" /> Free, open-source engines</span>
          </div>
        </div>
      </section>

      <section id="tools" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">All tools</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Tools marked “Planned” are being built phase by phase and do not process files yet.
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="tool-search" className="sr-only">Search tools</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="tool-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tools or formats…"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </div>
        </div>

        {status === "offline" && (
          <div role="status" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="flex items-center gap-2 font-medium">
              <Info className="h-4 w-4" aria-hidden="true" /> The backend is not running
            </p>
            <p className="mt-1">Open a second terminal in VS Code and run:</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {startCommands.join("\n")}
            </pre>
            <p className="mt-2">Then click the red “Backend offline” badge at the top to check again.</p>
          </div>
        )}

        {results.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-center text-slate-600 dark:text-slate-400" role="status">
            No tools match “{query}”. Try a format such as “pdf” or “mp3”.
          </p>
        )}
      </section>
    </div>
  );
}
