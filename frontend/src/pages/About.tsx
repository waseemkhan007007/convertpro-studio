import PageShell, { Section } from "../components/PageShell";

export default function About() {
  return (
    <PageShell
      title="About ConvertPro Studio"
      intro="A file conversion toolkit you can run on your own computer and deploy online later."
    >
      <Section title="What it is">
        <p>
          ConvertPro Studio brings audio, video, image and PDF tools into one interface. A React website talks to a
          Python (FastAPI) backend that does the real processing.
        </p>
      </Section>
      <Section title="Built with">
        <p>
          React, Vite, TypeScript, Tailwind CSS and Lucide icons on the front end. Python, FastAPI and Uvicorn on the
          back end. FFmpeg, Pillow, PyMuPDF, pypdf, ReportLab and OpenCV are added in later phases.
        </p>
      </Section>
      <Section title="Honest by design">
        <p>
          Tools are marked Planned until they work. There are no fake progress bars or placeholder buttons.
        </p>
      </Section>
    </PageShell>
  );
}
