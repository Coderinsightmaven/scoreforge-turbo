"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import { ThemeSyncProvider } from "./components/ThemeSyncProvider";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <ConvexAuthProvider client={convex}>
        <ThemeSyncProvider>
          {children}
          <Toaster richColors closeButton toastOptions={{ style: { borderRadius: "6px" } }} />
        </ThemeSyncProvider>
      </ConvexAuthProvider>
    </ThemeProvider>
  );
}
