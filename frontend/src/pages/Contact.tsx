import PageShell, { Section } from "../components/PageShell";

// Replace with your real address before sharing the site.
const CONTACT_EMAIL = "your-email@example.com";

export default function Contact() {
  return (
    <PageShell title="Contact">
      <Section title="Get in touch">
        <p>
          For questions or bug reports, email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-violet-700 underline hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-300"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          There is no contact form because the app has no mail server. Edit <code>CONTACT_EMAIL</code> in{" "}
          <code>frontend/src/pages/Contact.tsx</code> to set your own address.
        </p>
      </Section>
    </PageShell>
  );
}
