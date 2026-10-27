// Global open/close state for the Heart Assistant drawer, so it can be
// triggered from anywhere (the bottom tab, a dashboard card, or an edge
// swipe) and keeps its conversation alive across tab switches since it's
// mounted once at the root instead of per-screen.
import { createContext, useCallback, useContext, useState } from "react";

const AssistantContext = createContext(null);

export function AssistantProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openAssistant = useCallback(() => setOpen(true), []);
  const closeAssistant = useCallback(() => setOpen(false), []);
  const toggleAssistant = useCallback(() => setOpen((o) => !o), []);

  return (
    <AssistantContext.Provider value={{ open, openAssistant, closeAssistant, toggleAssistant }}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within an AssistantProvider");
  return ctx;
}
