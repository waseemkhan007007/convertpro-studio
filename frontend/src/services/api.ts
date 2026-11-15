import type { HealthResponse } from "../types";

// In development the Vite proxy forwards /api to the backend.
// For an online deployment, set VITE_API_BASE_URL in the frontend build.
const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`, { signal });
  if (!response.ok) {
    throw new Error(`Backend responded with status ${response.status}`);
  }
  return (await response.json()) as HealthResponse;
}
