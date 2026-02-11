"use client";

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { api } from "@repo/convex";
import { Navigation } from "../components/Navigation";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Menu, X } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [maintenanceDismissed, setMaintenanceDismissed] = useState(false);
  const maintenanceStatus = useQuery(api.siteAdmin.getMaintenanceStatus);
  const isSiteAdmin = useQuery(api.siteAdmin.checkIsSiteAdmin);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("scoreforge-sidebar-collapsed");
      if (stored !== null) {
        setSidebarCollapsed(stored === "true");
      }
    } catch (error) {
      void error;
    }
  }, []);

  useEffect(() => {
    if (!maintenanceStatus?.maintenanceMode) {
      setMaintenanceDismissed(false);
    }
  }, [maintenanceStatus?.maintenanceMode]);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("scoreforge-sidebar-collapsed", String(next));
      } catch (error) {
        void error;
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen">
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>

      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>

      <Authenticated>
        <div className="min-h-screen animate-fadeIn">
          <div className="flex min-h-screen">
            <Navigation
              mobileOpen={mobileNavOpen}
              onMobileOpenChange={setMobileNavOpen}
              collapsed={sidebarCollapsed}
              onToggleCollapse={handleToggleSidebar}
            />
            <div className="flex min-h-screen flex-1 flex-col">
              <Dialog
                open={Boolean(
                  maintenanceStatus?.maintenanceMode && !(isSiteAdmin && maintenanceDismissed)
                )}
                onOpenChange={(open) => {
                  if (!open && isSiteAdmin) {
                    setMaintenanceDismissed(true);
                  }
                }}
              >
                <DialogContent showCloseButton={false} className="max-w-md p-0 overflow-hidden">
                  <div className="relative p-6 text-center">
                    {isSiteAdmin && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="absolute right-3 top-3"
                        onClick={() => setMaintenanceDismissed(true)}
                        aria-label="Dismiss maintenance notice"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <DialogTitle className="mb-2 text-center">Maintenance Mode</DialogTitle>
                    <DialogDescription className="text-center">
                      {maintenanceStatus?.maintenanceMessage ||
                        "We’re performing maintenance. Some actions may be unavailable."}
                    </DialogDescription>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="icon"
                className="fixed left-4 top-4 z-40 lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <main className="flex-1 px-4 pb-12 pt-6 lg:px-10">
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
            </div>
          </div>
        </div>
      </Authenticated>
    </div>
  );
}

function LoadingScreen(): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary">
          <div className="absolute inset-0 rounded-full border-2 border-brand/70 animate-orbit" />
          <Image
            src="/logo.png"
            alt="ScoreForge"
            width={64}
            height={64}
            className="h-7 w-7 object-contain"
          />
        </div>
        <p className="text-caption text-muted-foreground">Loading ops</p>
      </div>
    </div>
  );
}

function RedirectToSignIn(): React.ReactNode {
  const router = useRouter();

  useEffect(() => {
    router.push("/sign-in");
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-full border border-border bg-secondary px-4 py-2">
        <Image
          src="/logo.png"
          alt="ScoreForge"
          width={64}
          height={64}
          className="h-6 w-6 object-contain"
        />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Redirecting
        </span>
      </div>
    </div>
  );
}
