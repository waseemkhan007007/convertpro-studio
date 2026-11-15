import { Link } from "react-router-dom";
import { tools } from "../tools/registry";

const linkClass =
  "rounded text-sm text-slate-600 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-400 dark:hover:text-violet-300";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-base font-semibold">ConvertPro Studio</p>
          <p className="mt-2 max-w-xs text-sm text-slate-600 dark:text-slate-400">
            File conversion tools that run on your own computer through a local backend.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Tools</p>
          <ul className="mt-3 space-y-2">
            {tools.map((t) => (
              <li key={t.slug}>
                <Link to={`/tools/${t.slug}`} className={linkClass}>
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Information</p>
          <ul className="mt-3 space-y-2">
            <li><Link to="/faq" className={linkClass}>FAQ</Link></li>
            <li><Link to="/about" className={linkClass}>About</Link></li>
            <li><Link to="/privacy" className={linkClass}>Privacy Policy</Link></li>
            <li><Link to="/terms" className={linkClass}>Terms of Service</Link></li>
            <li><Link to="/contact" className={linkClass}>Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        © {new Date().getFullYear()} ConvertPro Studio. Built with open-source software.
      </div>
    </footer>
  );
}
