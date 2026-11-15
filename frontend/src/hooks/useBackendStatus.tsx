import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchHealth } from "../services/api";
import type { HealthResponse } from "../types";

type BackendState = {
  status: "checking" | "online" | "offline";
  health: HealthResponse | null;
  refresh: () => void;
};

const BackendStatusContext = createContext<BackendState>({
  status: "checking",
  health: null,
  refresh: () => {},
});

export function BackendStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BackendState["status"]>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setStatus("checking");
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then((h) => {
        setHealth(h);
        setStatus("online");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setHealth(null);
        setStatus("offline");
      });
    return () => controller.abort();
  }, [tick]);

  return (
    <BackendStatusContext.Provider value={{ status, health, refresh }}>
      {children}
    </BackendStatusContext.Provider>
  );
}

export function useBackendStatus(): BackendState {
  return useContext(BackendStatusContext);
}
