import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import {
  gluestackLightConfig,
  gluestackDarkConfig,
  gluestackCustomConfig,
} from "../styles/gluestack.config.js";

export type Theme = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export interface GluestackThemeProviderProps {
  children: ReactNode;
  initialTheme?: Theme;
}

export const GluestackThemeProvider: React.FC<GluestackThemeProviderProps> = ({
  children,
  initialTheme,
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (initialTheme) return initialTheme;
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("mdq-theme");
        if (saved === "light" || saved === "dark" || saved === "auto") {
          return saved;
        }
      } catch {
        // Fallback when localStorage is restricted
      }
    }
    return "auto";
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };
    if (media.addEventListener) {
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    } else if ("addListener" in media) {
      (media as any).addListener(listener);
      return () => (media as any).removeListener(listener);
    }
  }, []);

  const resolvedTheme: ResolvedTheme = theme === "auto" ? systemTheme : theme;

  const activeConfig = resolvedTheme === "dark" ? gluestackDarkConfig : gluestackLightConfig;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", resolvedTheme);
      document.body.style.fontFamily = activeConfig.tokens.fonts.body;
      document.body.style.backgroundColor =
        resolvedTheme === "dark"
          ? activeConfig.tokens.colors.backgroundDark950
          : activeConfig.tokens.colors.backgroundLight0;
      document.body.style.color =
        resolvedTheme === "dark"
          ? activeConfig.tokens.colors.textDark50
          : activeConfig.tokens.colors.textLight900;
    }
  }, [resolvedTheme, activeConfig]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("mdq-theme", newTheme);
      } catch {
        // Fallback when localStorage is restricted
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      <GluestackUIProvider config={activeConfig} colorMode={resolvedTheme}>
        {children}
      </GluestackUIProvider>
    </ThemeContext.Provider>
  );
};

export const Provider = GluestackThemeProvider;

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within GluestackThemeProvider");
  }
  return context;
}
