import PageShell, { Section } from "../components/PageShell";

export default function Privacy() {
  return (
    <PageShell title="Privacy Policy" intro="Draft for the local version. Review and update before deploying online.">
      <Section title="Local version">
        <p>
          When you run ConvertPro Studio on your own computer, files you select are sent from your browser to a
          backend on the same computer. They are not sent to any third-party service by this app.
        </p>
      </Section>
      <Section title="Temporary files">
        <p>
          Uploaded and generated files are stored in the project’s <code>storage/</code> folder only while they are
          needed. The intended policy is automatic deletion after processing and after a retention period
          (default 30 minutes). Automatic cleanup is implemented in Phase 6; until then, this page describes the
          intended behavior rather than guaranteed behavior.
        </p>
      </Section>
      <Section title="If deployed online">
        <p>
          An online deployment sends your files to that server for processing. Do not describe such a deployment as
          fully private. The operator must publish the real retention period and hosting details here.
        </p>
      </Section>
      <Section title="Accounts and tracking">
        <p>This app has no user accounts and no analytics. Your theme choice is stored in your browser only.</p>
      </Section>
    </PageShell>
  );
}
