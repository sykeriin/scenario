import { createContext, useContext, useState, type ReactNode } from "react";

interface SystemChatContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const SystemChatContext = createContext<SystemChatContextValue | null>(null);

export function SystemChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SystemChatContext.Provider value={{ open, setOpen, toggle: () => setOpen((v) => !v) }}>
      {children}
    </SystemChatContext.Provider>
  );
}

export function useSystemChat() {
  const ctx = useContext(SystemChatContext);
  if (!ctx) {
    return {
      open: false,
      setOpen: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}
