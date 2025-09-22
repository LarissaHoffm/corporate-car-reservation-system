import * as React from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function getSystemPrefersDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark = theme === "dark" || (theme === "system" && getSystemPrefersDark());
  root.classList.toggle("dark", isDark);
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "app-theme",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem(storageKey) as Theme | null) : null;
    return stored ?? defaultTheme;
  });

  const setTheme = React.useCallback(
    (t: Theme) => {
      setThemeState(t);
      localStorage.setItem(storageKey, t);
      applyTheme(t);
    },
    [storageKey]
  );

  React.useEffect(() => {
    applyTheme(theme);
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  const value = React.useMemo<ThemeContextValue>(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
