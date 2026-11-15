import type { LucideIcon } from "lucide-react";

export interface ToolDefinition {
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  icon: LucideIcon;
  inputFormats: string[];
  outputFormats: string[];
  /** Build phase in which this tool becomes functional. */
  phase: number;
  /** "ready" only once the tool really processes files end to end. */
  status: "planned" | "ready";
  needsFfmpeg: boolean;
  /** Which upload limit applies. */
  limitKind: "general" | "video";
  keywords: string[];
  notes: string[];
}

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
  environment: string;
  ffmpeg: { available: boolean; version: string | null };
  limits: {
    max_upload_mb: number;
    max_video_upload_mb: number;
    file_retention_minutes: number;
  };
}
