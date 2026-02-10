"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle(): React.ReactNode {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-bg-secondary"
        aria-label="Toggle theme"
      >
        <span className="h-4 w-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-bg-secondary text-muted-foreground transition-all duration-200 hover:border-brand/60 hover:text-foreground"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <Sun
        className={`absolute h-4 w-4 transition-all ${
          isDark ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        }`}
      />
      <Moon
        className={`absolute h-4 w-4 transition-all ${
          isDark ? "scale-100 rotate-0 opacity-100 text-brand" : "scale-75 -rotate-90 opacity-0"
        }`}
      />
    </button>
  );
}
