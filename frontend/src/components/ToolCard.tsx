import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ToolDefinition } from "../types";

export default function ToolCard({ tool }: { tool: ToolDefinition }) {
  const Icon = tool.icon;
  const ready = tool.status === "ready";

  return (
    <Link
      to={`/tools/${tool.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 motion-safe:animate-fade-up dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-500/60"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            ready
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
          }`}
        >
          {ready ? "Ready" : `Planned · Phase ${tool.phase}`}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold">{tool.name}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-400">{tool.shortDescription}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-700 dark:text-violet-300">
        Open tool
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
