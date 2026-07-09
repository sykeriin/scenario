import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ThemeName, applyTheme } from "@/lib/themes";

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "Black & Yellow",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(
    () => (localStorage.getItem("scenario-theme") as ThemeName) || "Black & Yellow"
  );

  const setTheme = useCallback((name: ThemeName) => {
    setThemeState(name);
    localStorage.setItem("scenario-theme", name);
    applyTheme(name);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
