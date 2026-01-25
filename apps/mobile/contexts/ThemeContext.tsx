import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useColorScheme, Appearance } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  isDark: boolean;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [localTheme, setLocalTheme] = useState<ThemePreference>("light");
  const [hasInitialized, setHasInitialized] = useState(false);
  // Force re-render counter for when system theme changes
  const [, setForceUpdate] = useState(0);

  // Convex query and mutation
  const savedTheme = useQuery(api.users.getThemePreference);
  const setThemeMutation = useMutation(api.users.setThemePreference);

  // Sync local state with Convex when data loads
  useEffect(() => {
    if (savedTheme !== undefined) {
      // Query has resolved (could be null if no preference saved or not authenticated)
      if (savedTheme !== null) {
        setLocalTheme(savedTheme);
      }
      setHasInitialized(true);
    }
  }, [savedTheme]);

  // Listen to system color scheme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      // Force re-render when system theme changes
      setForceUpdate(n => n + 1);
    });
    return () => subscription.remove();
  }, []);

  const setTheme = useCallback(async (newTheme: ThemePreference) => {
    // Update local state immediately for responsive UI
    setLocalTheme(newTheme);

    // Save to Convex (will fail silently if not authenticated)
    try {
      await setThemeMutation({ theme: newTheme });
    } catch (error) {
      // User might not be authenticated, which is fine
      console.warn("Failed to save theme preference to server:", error);
    }
  }, [setThemeMutation]);

  const resolvedTheme: ResolvedTheme =
    localTheme === "system" ? (systemColorScheme ?? "dark") : localTheme;

  const isDark = resolvedTheme === "dark";

  // Create context value
  const contextValue: ThemeContextType = {
    theme: localTheme,
    resolvedTheme,
    setTheme,
    isDark,
    isLoading: !hasInitialized,
  };

  // Don't render children until we've loaded the saved preference
  // to avoid flash of wrong theme
  if (!hasInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
