import { ArrowLeft, Clock, Download, FileUp, Info, LoaderCircle } from "lucide-react";
import JSZip from "jszip";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useBackendStatus } from "../hooks/useBackendStatus";
import { getToolBySlug } from "../tools/registry";
import NotFound from "./NotFound";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

type PreviewItem = {
  url: string;
  label: string;
};

type GeneratedResult = {
  downloadUrl: string;
  downloadName: string;
  mediaType: string;
  previewItems: PreviewItem[];
};

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((f) => (
        <li key={f} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {f}
        </li>
      ))}
    </ul>
  );
}

function ReadyToolForm({ tool }: { tool: NonNullable<ReturnType<typeof getToolBySlug>> }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [pageSize, setPageSize] = useState("A4");
  const [orientation, setOrientation] = useState("portrait");
  const [fitToPage, setFitToPage] = useState(true);
  const [mode, setMode] = useState("horizontal");
  const [spacing, setSpacing] = useState(12);
  const [margin, setMargin] = useState(12);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [outputFormat, setOutputFormat] = useState("PNG");
  const [pageSelection, setPageSelection] = useState("all");
  const [resolution, setResolution] = useState(150);
  const [audioBitrate, setAudioBitrate] = useState("192");
  const [videoResolution, setVideoResolution] = useState("1280:720");
  const [videoQuality, setVideoQuality] = useState("medium");
  const [extractAudio, setExtractAudio] = useState(false);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(28);
  const [inpaintRadius, setInpaintRadius] = useState(5);
  const [hasMaskSelection, setHasMaskSelection] = useState(false);
  const [maskCanvasReady, setMaskCanvasReady] = useState(false);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingMask = useRef(false);

  useEffect(() => {
    if (!result) return;
    const urls = new Set([result.downloadUrl, ...result.previewItems.map((item) => item.url)]);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [result]);

  const accept = useMemo(() => {
    if (tool.slug === "image-to-pdf" || tool.slug === "image-merger" || tool.slug === "watermark-remover") {
      return "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
    }
    if (tool.slug === "audio-to-mp3") {
      return "audio/mpeg,audio/wav,audio/x-m4a,audio/flac,audio/ogg,.mp3,.wav,.m4a,.aac,.flac,.ogg,.wma,.webm";
    }
    if (tool.slug === "video-to-mp4") {
      return "video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,.mp4,.mov,.avi,.mkv,.webm,.flv,.wmv";
    }
    return "application/pdf,.pdf";
  }, [tool.slug]);

  useEffect(() => {
    if (tool.slug !== "watermark-remover" || selectedFiles.length === 0) {
      setSourcePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedFiles[0]);
    setSourcePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedFiles, tool.slug]);

  const handleFiles = (nextFiles: FileList | null) => {
    if (!nextFiles) {
      setSelectedFiles([]);
      setHasMaskSelection(false);
      setMaskCanvasReady(false);
      setResult(null);
      return;
    }

    const files = Array.from(nextFiles);
    const isSingleFileTool =
      tool.slug === "pdf-to-image" ||
      tool.slug === "audio-to-mp3" ||
      tool.slug === "video-to-mp4" ||
      tool.slug === "watermark-remover";
    setSelectedFiles(isSingleFileTool ? files.slice(0, 1) : files);
    setHasMaskSelection(false);
    setMaskCanvasReady(false);
    setResult(null);
    setError(null);
  };

  const handleMaskStart = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
    const y = ((event.clientY - bounds.top) / bounds.height) * canvas.height;
    context.strokeStyle = "#ffffff";
    context.lineWidth = brushSize * (canvas.width / bounds.width);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x, y);
    context.stroke();
    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingMask.current = true;
    setHasMaskSelection(true);
  };

  const handleMaskMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !isDrawingMask.current) return;

    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
    const y = ((event.clientY - bounds.top) / bounds.height) * canvas.height;
    context.lineTo(x, y);
    context.stroke();
  };

  const clearMask = () => {
    const canvas = maskCanvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasMaskSelection(false);
  };

  const initializeMaskCanvas = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    canvas.width = event.currentTarget.naturalWidth;
    canvas.height = event.currentTarget.naturalHeight;
    setHasMaskSelection(false);
    setMaskCanvasReady(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isSingleFileTool =
      tool.slug === "pdf-to-image" ||
      tool.slug === "audio-to-mp3" ||
      tool.slug === "video-to-mp4" ||
      tool.slug === "watermark-remover";

    if (isSingleFileTool && selectedFiles.length !== 1) {
      setError("Choose exactly one file for this conversion.");
      return;
    }

    if (tool.slug === "watermark-remover" && !hasMaskSelection) {
      setError("Brush over the watermark area before processing.");
      return;
    }

    if (!isSingleFileTool && selectedFiles.length === 0) {
      setError("Choose at least one file to process.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();

      if (isSingleFileTool) {
        formData.set("file", selectedFiles[0]);
      } else {
        selectedFiles.forEach((file) => formData.append("files", file));
      }

      if (tool.slug === "image-to-pdf") {
        formData.set("page_size", pageSize);
        formData.set("orientation", orientation);
        formData.set("fit_to_page", String(fitToPage));
      }

      if (tool.slug === "pdf-to-image") {
        formData.set("pages", pageSelection);
        formData.set("output_format", outputFormat);
        formData.set("resolution", String(resolution));
      }

      if (tool.slug === "image-merger") {
        formData.set("mode", mode);
        formData.set("spacing", String(spacing));
        formData.set("margin", String(margin));
        formData.set("background_color", backgroundColor);
        formData.set("output_format", outputFormat);
      }

      if (tool.slug === "audio-to-mp3") {
        formData.set("bitrate", audioBitrate);
      }

      if (tool.slug === "video-to-mp4") {
        formData.set("resolution", videoResolution);
        formData.set("quality", videoQuality);
        formData.set("extract_audio", String(extractAudio));
      }

      if (tool.slug === "watermark-remover") {
        const canvas = maskCanvasRef.current;
        if (!canvas) {
          throw new Error("The image selection is not ready yet. Please try again.");
        }
        const maskBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Could not create the selection mask. Please try again."));
          }, "image/png");
        });
        formData.set("mask_file", new File([maskBlob], "selection.png", { type: "image/png" }));
        formData.set("radius", String(inpaintRadius));
        formData.set("output_format", outputFormat);
      }

      const response = await fetch(`${API_BASE}/tools/${tool.slug}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "Conversion failed.");
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error("The converter returned an empty file. Please try again.");
      }

      const mediaType = (response.headers.get("content-type") ?? blob.type)
        .split(";", 1)[0]
        .trim()
        .toLowerCase();
      const previewItems: PreviewItem[] = [];
      if (mediaType === "application/zip" || mediaType === "application/x-zip-compressed") {
        const archive = await JSZip.loadAsync(blob);
        const images = Object.values(archive.files).filter(
          (entry) => !entry.dir && /\.(png|jpe?g|webp)$/i.test(entry.name),
        );
        if (images.length === 0) {
          throw new Error("The converted ZIP contains no previewable image pages.");
        }
        const imageBlobs = await Promise.all(
          images.map(async (entry) => ({
            name: entry.name,
            blob: new Blob([await entry.async("uint8array")], {
              type: entry.name.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
            }),
          })),
        );
        imageBlobs.forEach(({ name, blob: imageBlob }) => {
          previewItems.push({ url: URL.createObjectURL(imageBlob), label: name });
        });
      } else if (
        mediaType.startsWith("image/") ||
        mediaType === "application/pdf" ||
        mediaType.startsWith("audio/") ||
        mediaType.startsWith("video/")
      ) {
        previewItems.push({ url: "", label: "Result" });
      } else {
        throw new Error(`The converter returned an unsupported result format (${mediaType || "unknown"}).`);
      }

      const downloadUrl = URL.createObjectURL(blob);
      if (previewItems.length === 1 && previewItems[0].url === "") {
        previewItems[0].url = downloadUrl;
      } else if (previewItems.length > 0 && previewItems[0].url === "") {
        previewItems.forEach((item) => {
          item.url = downloadUrl;
        });
      }

      const disposition = response.headers.get("content-disposition");
      const encodedFilename = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plainFilename = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
      const filename = encodedFilename
        ? decodeURIComponent(encodedFilename)
        : plainFilename ?? (
            tool.slug === "image-to-pdf" ? "combined.pdf"
            : tool.slug === "pdf-merger" ? "merged.pdf"
            : tool.slug === "pdf-to-image" ? (mediaType.includes("zip") ? "pdf-pages.zip" : "page.png")
            : tool.slug === "image-merger" ? `merged.${outputFormat.toLowerCase()}`
            : tool.slug === "watermark-remover" ? `cleaned.${outputFormat === "PNG" ? "png" : "jpg"}`
            : tool.slug === "audio-to-mp3" || extractAudio ? "converted.mp3"
            : "converted.mp4"
          );

      setResult({
        downloadUrl,
        downloadName: filename,
        mediaType,
        previewItems,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Conversion failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMergeTool = tool.slug === "image-merger" || tool.slug === "pdf-merger";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
        <FileUp className="h-4 w-4" aria-hidden="true" />
        Upload files
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600 transition hover:border-violet-400 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-violet-500 dark:hover:bg-violet-500/10">
        <span className="font-medium text-slate-800 dark:text-slate-100">Choose files</span>
        <span className="mt-1">{selectedFiles.length > 0 ? `${selectedFiles.length} selected` : "No files selected yet"}</span>
        <input
          type="file"
          multiple={
            tool.slug !== "pdf-to-image" &&
            tool.slug !== "audio-to-mp3" &&
            tool.slug !== "video-to-mp4" &&
            tool.slug !== "watermark-remover"
          }
          accept={accept}
          onChange={(event) => handleFiles(event.target.files)}
          className="hidden"
        />
      </label>

      {tool.slug === "watermark-remover" && sourcePreviewUrl && (
        <section className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Paint the area to clean</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Brush over the watermark and a small margin around it. The marked overlay is sent with the image for local inpainting.
            </p>
          </div>
          <div className="overflow-auto rounded-lg bg-slate-100 p-2 text-center dark:bg-slate-950">
            <div className="relative inline-block max-w-full align-middle">
              <img
                src={sourcePreviewUrl}
                alt="Image selected for watermark cleanup"
                onLoad={initializeMaskCanvas}
                className="block max-h-[70vh] max-w-full object-contain"
              />
              <canvas
                ref={maskCanvasRef}
                aria-label="Paint the watermark area to remove"
                onPointerDown={handleMaskStart}
                onPointerMove={handleMaskMove}
                onPointerUp={() => { isDrawingMask.current = false; }}
                onPointerCancel={() => { isDrawingMask.current = false; }}
                className={`absolute inset-0 h-full w-full touch-none cursor-crosshair ${
                  maskCanvasReady ? "opacity-50" : "pointer-events-none opacity-0"
                }`}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <span>Brush size: {brushSize}px</span>
              <input
                type="range"
                min={5}
                max={100}
                value={brushSize}
                onChange={(event) => setBrushSize(Number(event.target.value))}
                className="w-full accent-violet-600"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <span>Cleanup strength</span>
              <select
                value={inpaintRadius}
                onChange={(event) => setInpaintRadius(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value={3}>Subtle</option>
                <option value={5}>Balanced</option>
                <option value={10}>Strong</option>
                <option value={15}>Very strong</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <span>Output format</span>
              <select
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="PNG">PNG</option>
                <option value="JPG">JPG</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={clearMask}
            disabled={!hasMaskSelection}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Clear selection
          </button>
        </section>
      )}

      {tool.slug === "image-to-pdf" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Page size</span>
            <select value={pageSize} onChange={(event) => setPageSize(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
              <option value="A4">A4</option>
              <option value="letter">Letter</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Orientation</span>
            <select value={orientation} onChange={(event) => setOrientation(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>

          <label className="flex items-center gap-2 pt-8 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={fitToPage} onChange={(event) => setFitToPage(event.target.checked)} />
            Fit to page
          </label>
        </div>
      )}

      {tool.slug === "image-merger" && (
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Layout</span>
            <select value={mode} onChange={(event) => setMode(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
              <option value="grid">Grid</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Spacing</span>
            <input type="number" min={0} max={100} value={spacing} onChange={(event) => setSpacing(Number(event.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
          </label>

          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Margin</span>
            <input type="number" min={0} max={100} value={margin} onChange={(event) => setMargin(Number(event.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
          </label>

          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Output</span>
            <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
              <option value="PNG">PNG</option>
              <option value="JPG">JPG</option>
            </select>
          </label>
        </div>
      )}

      {tool.slug === "image-merger" && (
        <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <span>Background color</span>
          <input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-950" />
        </label>
      )}

      {tool.slug === "pdf-to-image" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Pages</span>
            <input
              type="text"
              value={pageSelection}
              onChange={(event) => setPageSelection(event.target.value)}
              placeholder="all or 1-3,5"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Output format</span>
            <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
              <option value="PNG">PNG</option>
              <option value="JPG">JPG</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Resolution</span>
            <input type="number" min={72} max={300} value={resolution} onChange={(event) => setResolution(Number(event.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
          </label>
        </div>
      )}

      {tool.slug === "audio-to-mp3" && (
        <div className="grid gap-4 sm:grid-cols-1">
          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Bitrate</span>
            <select value={audioBitrate} onChange={(event) => setAudioBitrate(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
              <option value="128">128 kbps</option>
              <option value="192">192 kbps</option>
              <option value="256">256 kbps</option>
              <option value="320">320 kbps</option>
            </select>
          </label>
        </div>
      )}

      {tool.slug === "video-to-mp4" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Resolution</span>
            <input
              type="text"
              value={videoResolution}
              onChange={(event) => setVideoResolution(event.target.value)}
              placeholder="1280:720"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Quality</span>
            <select value={videoQuality} onChange={(event) => setVideoQuality(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label className="flex items-center gap-2 pt-8 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={extractAudio} onChange={(event) => setExtractAudio(event.target.checked)} />
            Extract audio only
          </label>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={
            isSubmitting ||
            selectedFiles.length === 0 ||
            (tool.slug === "watermark-remover" && !hasMaskSelection)
          }
          className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Processing…
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />
              {tool.slug === "pdf-to-image"
                ? "Render pages"
                : tool.slug === "audio-to-mp3"
                  ? "Convert audio"
                  : tool.slug === "video-to-mp4"
                    ? "Convert video"
                    : tool.slug === "watermark-remover"
                      ? "Clean marked area"
                    : isMergeTool
                      ? "Merge files"
                      : "Convert files"}
            </>
          )}
        </button>

        {result && (
          <a
            href={result.downloadUrl}
            download={result.downloadName}
            className="inline-flex items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200"
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Download result
          </a>
        )}
      </div>

      {result && tool.slug !== "watermark-remover" && (
        <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700" aria-live="polite">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Generated result preview</h2>
          {result.previewItems.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The result was generated and is available to download, but this file contains no previewable pages.
            </p>
          ) : result.mediaType.startsWith("image/") || result.mediaType.includes("zip") ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {result.previewItems.map((item) => (
                <figure key={item.url} className="space-y-2">
                  {result.previewItems.length > 1 && (
                    <figcaption className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.label}</figcaption>
                  )}
                  <img
                    src={item.url}
                    alt={item.label === "Result" ? "Generated result preview" : `Preview of ${item.label}`}
                    className="max-h-[60vh] w-full rounded-xl border border-slate-200 object-contain dark:border-slate-700"
                  />
                </figure>
              ))}
            </div>
          ) : result.mediaType === "application/pdf" ? (
            <iframe
              src={result.downloadUrl}
              title="Generated PDF preview"
              className="h-[70vh] w-full rounded-xl border border-slate-200 dark:border-slate-700"
            />
          ) : result.mediaType.startsWith("audio/") ? (
            <audio src={result.downloadUrl} controls className="w-full">
              Your browser does not support audio previews.
            </audio>
          ) : result.mediaType.startsWith("video/") ? (
            <video src={result.downloadUrl} controls className="max-h-[70vh] w-full rounded-xl bg-black">
              Your browser does not support video previews.
            </video>
          ) : null}
        </section>
      )}

      {tool.slug === "watermark-remover" && result && sourcePreviewUrl && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Before and after</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <figure className="space-y-2">
              <figcaption className="text-xs font-medium text-slate-600 dark:text-slate-400">Original</figcaption>
              <img
                src={sourcePreviewUrl}
                alt="Original image before watermark cleanup"
                className="max-h-[50vh] w-full rounded-xl border border-slate-200 object-contain dark:border-slate-700"
              />
            </figure>
            <figure className="space-y-2">
              <figcaption className="text-xs font-medium text-slate-600 dark:text-slate-400">Cleaned preview</figcaption>
              <img
                src={result.previewItems[0]?.url}
                alt="Preview of the cleaned image"
                className="max-h-[50vh] w-full rounded-xl border border-slate-200 object-contain dark:border-slate-700"
              />
            </figure>
          </div>
        </section>
      )}
    </form>
  );
}

export default function ToolPage() {
  const { slug } = useParams();
  const tool = getToolBySlug(slug);
  const { status, health } = useBackendStatus();

  if (!tool) return <NotFound />;

  const Icon = tool.icon;
  const limitMb = health
    ? tool.limitKind === "video"
      ? health.limits.max_video_upload_mb
      : health.limits.max_upload_mb
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 rounded text-sm text-slate-600 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-400 dark:hover:text-violet-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All tools
      </Link>

      <div className="mt-6 flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{tool.name}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{tool.longDescription}</p>
        </div>
      </div>

      {tool.status === "planned" && (
        <div role="status" className="mt-8 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            <strong>Not built yet.</strong> This tool is scheduled for Phase {tool.phase}. Nothing on this page
            processes files yet, and there is intentionally no upload button.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold">Accepted input formats</h2>
          <div className="mt-3"><Chips items={tool.inputFormats} /></div>
          <h2 className="mt-5 text-sm font-semibold">Output</h2>
          <div className="mt-3"><Chips items={tool.outputFormats} /></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold">Limits and requirements</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-400">Maximum upload size</dt>
              <dd className="font-medium">
                {limitMb !== null ? `${limitMb} MB` : status === "checking" ? "Checking…" : "Backend offline"}
              </dd>
            </div>
            {tool.needsFfmpeg && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600 dark:text-slate-400">FFmpeg</dt>
                <dd className="font-medium">
                  {health ? (health.ffmpeg.available ? "Detected" : "Not found by backend") : "Unknown"}
                </dd>
              </div>
            )}
            {health && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600 dark:text-slate-400">Temporary file retention</dt>
                <dd className="font-medium">{health.limits.file_retention_minutes} min</dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Limits are set in the backend <code>.env</code> file.
          </p>
        </section>
      </div>

      {tool.status === "ready" && <ReadyToolForm tool={tool} />}

      {tool.notes.length > 0 && (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Info className="h-4 w-4" aria-hidden="true" /> Good to know
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {tool.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
