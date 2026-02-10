"use client";

import { useTheme } from "next-themes";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useEffect, useRef } from "react";

/**
 * Syncs the theme preference with Convex.
 * - On mount, loads the saved theme from Convex and applies it
 * - When theme changes locally, saves it to Convex
 */
export function ThemeSyncProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  const { theme, setTheme } = useTheme();
  const savedTheme = useQuery(api.users.getThemePreference);
  const setThemeMutation = useMutation(api.users.setThemePreference);
  const hasInitialized = useRef(false);
  const lastSyncedTheme = useRef<string | null>(null);

  // Load theme from Convex on initial mount
  useEffect(() => {
    if (savedTheme !== undefined && !hasInitialized.current) {
      hasInitialized.current = true;
      if (savedTheme !== null && savedTheme !== theme) {
        setTheme(savedTheme);
        lastSyncedTheme.current = savedTheme;
      } else {
        lastSyncedTheme.current = theme ?? null;
      }
    }
  }, [savedTheme, theme, setTheme]);

  // Sync theme changes to Convex
  useEffect(() => {
    if (!hasInitialized.current) return;
    if (!theme) return;
    if (theme === lastSyncedTheme.current) return;

    // Theme has changed locally, save to Convex
    lastSyncedTheme.current = theme;

    const validThemes = ["light", "dark", "system"] as const;
    if (validThemes.includes(theme as (typeof validThemes)[number])) {
      setThemeMutation({ theme: theme as "light" | "dark" | "system" }).catch((error) => {
        // User might not be authenticated
        console.warn("Failed to save theme preference:", error);
      });
    }
  }, [theme, setThemeMutation]);

  return <>{children}</>;
}
