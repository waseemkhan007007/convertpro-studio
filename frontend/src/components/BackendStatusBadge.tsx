import { useBackendStatus } from "../hooks/useBackendStatus";

const styles = {
  online: { dot: "bg-emerald-500", text: "Backend online", title: "The Python backend is running." },
  offline: { dot: "bg-red-500", text: "Backend offline", title: "The backend is not reachable. Click to check again." },
  checking: { dot: "bg-slate-400", text: "Checking…", title: "Checking the backend." },
} as const;

export default function BackendStatusBadge() {
  const { status, refresh } = useBackendStatus();
  const s = styles[status];
  return (
    <button
      type="button"
      onClick={refresh}
      title={s.title}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
      <span className="hidden sm:inline">{s.text}</span>
      <span className="sr-only sm:hidden">{s.text}</span>
    </button>
  );
}
