import PageShell from "../components/PageShell";

const faqs = [
  {
    q: "Are my files uploaded to the internet?",
    a: "Not in the local version. Your browser sends files to a backend running on your own computer (localhost). If you deploy this app online later, files are sent to that server instead, and the Privacy Policy must be updated.",
  },
  {
    q: "Which tools work today?",
    a: "Phase 1 delivers the website, navigation and backend foundation. The converters are added in later phases, and each tool card shows its status. A tool is only marked Ready once it really converts files.",
  },
  {
    q: "Why does a conversion fail?",
    a: "Common causes are a file that is corrupted, password-protected, too large, or encoded with a codec your FFmpeg build does not support. The app shows a specific message when it can tell.",
  },
  {
    q: "Can the watermark tool remove any watermark?",
    a: "No. Results depend on the watermark and the background, and it should only be used on images you own or are authorized to edit. It does not bypass DRM or document protection.",
  },
  {
    q: "What are the file-size limits?",
    a: "Each tool page shows the current limits, which come from the backend configuration. You can change them in the .env file.",
  },
  {
    q: "Does it cost anything?",
    a: "No. It is built with free, open-source software and needs no paid APIs.",
  },
];

export default function Faq() {
  return (
    <PageShell title="Frequently asked questions">
      <div className="space-y-3">
        {faqs.map((f) => (
          <details
            key={f.q}
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <summary className="cursor-pointer list-none rounded font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-100">
              {f.q}
            </summary>
            <p className="mt-3 text-slate-700 dark:text-slate-300">{f.a}</p>
          </details>
        ))}
      </div>
    </PageShell>
  );
}
