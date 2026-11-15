import type { ReactNode } from "react";

export default function PageShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {intro && <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">{intro}</p>}
      <div className="mt-8 space-y-8 leading-relaxed text-slate-700 dark:text-slate-300">{children}</div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
