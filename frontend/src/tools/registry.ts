import { Combine, Eraser, FileAudio, FileImage, Images, LayoutGrid, Video } from "lucide-react";
import type { ToolDefinition } from "../types";

// Single source of truth for every tool. "status" stays "planned" until the
// tool really processes files end to end (set to "ready" in its phase).
export const tools: ToolDefinition[] = [
  {
    slug: "audio-to-mp3",
    name: "Audio to MP3",
    shortDescription: "Convert WAV, M4A, AAC, FLAC and more to MP3 with a bitrate of your choice.",
    longDescription:
      "Upload an audio file, choose a bitrate (128, 192 or 320 kbps) and download an MP3. Conversion uses FFmpeg on your computer.",
    icon: FileAudio,
    inputFormats: ["WAV", "M4A", "AAC", "FLAC", "OGG", "WMA"],
    outputFormats: ["MP3"],
    phase: 4,
    status: "ready",
    needsFfmpeg: true,
    limitKind: "general",
    keywords: ["audio", "music", "sound", "mp3", "bitrate", "ffmpeg"],
    notes: ["Accepted formats depend on the installed FFmpeg build."],
  },
  {
    slug: "video-to-mp4",
    name: "Video to MP4",
    shortDescription: "Convert MOV, AVI, MKV and WebM to MP4, or extract the audio as MP3.",
    longDescription:
      "Convert a video to MP4 with resolution and quality settings, keeping the aspect ratio. Long conversions run as background jobs with real progress.",
    icon: Video,
    inputFormats: ["MOV", "AVI", "MKV", "WebM", "FLV", "WMV"],
    outputFormats: ["MP4", "MP3 (audio only)"],
    phase: 4,
    status: "ready",
    needsFfmpeg: true,
    limitKind: "video",
    keywords: ["video", "movie", "mp4", "mov", "mkv", "avi", "webm", "ffmpeg", "extract audio"],
    notes: [
      "Video conversion is CPU heavy and can be slow on older computers.",
      "Some codecs cannot be converted; you will see a clear error if so.",
    ],
  },
  {
    slug: "image-to-pdf",
    name: "Image to PDF",
    shortDescription: "Combine JPG, PNG and WebP images into one PDF with page size and order control.",
    longDescription:
      "Upload several images, drag them into order, pick A4 or Letter, portrait or landscape, and download a single PDF.",
    icon: FileImage,
    inputFormats: ["JPG", "JPEG", "PNG", "WebP"],
    outputFormats: ["PDF"],
    phase: 2,
    status: "ready",
    needsFfmpeg: false,
    limitKind: "general",
    keywords: ["image", "photo", "picture", "pdf", "jpg", "png", "webp", "combine"],
    notes: [],
  },
  {
    slug: "pdf-to-image",
    name: "PDF to Image",
    shortDescription: "Turn PDF pages into PNG or JPG images and download them as a ZIP.",
    longDescription:
      "Choose all pages or specific pages, set the output resolution, and download images (zipped when there is more than one).",
    icon: Images,
    inputFormats: ["PDF"],
    outputFormats: ["PNG", "JPG", "ZIP"],
    phase: 3,
    status: "ready",
    needsFfmpeg: false,
    limitKind: "general",
    keywords: ["pdf", "image", "png", "jpg", "pages", "zip", "render"],
    notes: ["Password-protected PDFs are rejected; this tool does not bypass protection."],
  },
  {
    slug: "watermark-remover",
    name: "Watermark Remover",
    shortDescription: "Brush over watermarks in images you own or are authorized to edit.",
    longDescription:
      "Paint over a watermark and preview the locally inpainted result before downloading. Results depend on the surrounding image and may need several brush passes.",
    icon: Eraser,
    inputFormats: ["JPG", "JPEG", "PNG", "WebP"],
    outputFormats: ["PNG", "JPG"],
    phase: 5,
    status: "ready",
    needsFfmpeg: false,
    limitKind: "general",
    keywords: ["watermark", "remove", "clean", "inpaint", "retouch", "logo", "image"],
    notes: [
      "Use only on images you own or have permission to edit.",
      "Inpainting reconstructs the marked area from nearby pixels; it cannot guarantee perfect results, especially on complex backgrounds.",
      "This tool does not bypass DRM, access controls or document protection.",
    ],
  },
  {
    slug: "image-merger",
    name: "Image Merger",
    shortDescription: "Join images horizontally, vertically or in a grid with spacing and background control.",
    longDescription:
      "Arrange two or more images in a row, column or custom grid. Set spacing, margins, alignment, background color and output size, then export PNG or JPG.",
    icon: LayoutGrid,
    inputFormats: ["JPG", "JPEG", "PNG", "WebP"],
    outputFormats: ["PNG", "JPG"],
    phase: 2,
    status: "ready",
    needsFfmpeg: false,
    limitKind: "general",
    keywords: ["image", "merge", "combine", "collage", "grid", "join", "stitch"],
    notes: [],
  },
  {
    slug: "pdf-merger",
    name: "PDF Merger",
    shortDescription: "Merge several PDFs into one, in the order you choose.",
    longDescription:
      "Upload PDFs, see each file's name and page count, reorder them and download one merged PDF. Page sizes and orientation are preserved.",
    icon: Combine,
    inputFormats: ["PDF"],
    outputFormats: ["PDF"],
    phase: 2,
    status: "ready",
    needsFfmpeg: false,
    limitKind: "general",
    keywords: ["pdf", "merge", "combine", "join", "documents"],
    notes: ["Corrupted or password-protected PDFs are rejected with a clear message."],
  },
];

export function getToolBySlug(slug: string | undefined): ToolDefinition | undefined {
  return tools.find((t) => t.slug === slug);
}

export function searchTools(query: string): ToolDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return tools;
  return tools.filter((t) => {
    const haystack = [
      t.name,
      t.shortDescription,
      ...t.keywords,
      ...t.inputFormats,
      ...t.outputFormats,
    ]
      .join(" ")
      .toLowerCase();
    return q.split(/\s+/).every((word) => haystack.includes(word));
  });
}
