import PageShell, { Section } from "../components/PageShell";

export default function Terms() {
  return (
    <PageShell title="Terms of Service" intro="Draft template. This is not legal advice; adapt it before public use.">
      <Section title="Acceptable use">
        <p>
          Use the tools only on files you own or have permission to process. Do not use the watermark tool on images
          you are not authorized to edit, and do not use this software to bypass DRM, access controls or document
          protection.
        </p>
      </Section>
      <Section title="No guarantee of results">
        <p>
          Conversions and image cleanup depend on the input file. Output quality is not guaranteed, and some files
          cannot be converted. Keep copies of your originals.
        </p>
      </Section>
      <Section title="Warranty">
        <p>The software is provided “as is”, without warranty of any kind.</p>
      </Section>
    </PageShell>
  );
}
