"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@repo/convex";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/app/components/Skeleton";
import { cn } from "@/lib/utils";
import { Braces, Gauge, LogOut, Settings, Shield, X } from "lucide-react";

type NavigationProps = {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

const navItems = [
  {
    label: "Ops Console",
    href: "/dashboard",
    icon: Gauge,
    activePaths: ["/dashboard", "/tournaments", "/matches"],
  },
  {
    label: "Quick Bracket",
    href: "/brackets/quick",
    icon: Braces,
    activePaths: ["/brackets/quick"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    activePaths: ["/settings"],
  },
];

export function Navigation({ mobileOpen, onMobileOpenChange }: NavigationProps): React.ReactNode {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const isSiteAdmin = useQuery(api.siteAdmin.checkIsSiteAdmin);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const isActive = (paths: string[]) =>
    paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  return (
    <>
      <aside
        id="onborda-nav"
        className="sticky top-0 hidden h-screen w-72 flex-col border-r border-border/70 bg-bg-primary/90 px-6 py-6 lg:flex no-print"
      >
        <div className="flex h-full flex-col">
          <Link href="/dashboard" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/40 bg-brand/15 text-brand">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Arena Ops
              </p>
              <p className="text-lg font-semibold text-foreground">ScoreForge</p>
            </div>
          </Link>

          <div className="mt-8">
            <p className="text-caption text-muted-foreground">Operations</p>
            <nav className="mt-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.activePaths);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm font-semibold transition-all",
                      active
                        ? "border-brand/40 bg-brand/15 text-foreground shadow-[var(--shadow-sm)]"
                        : "border-transparent text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-bg-primary text-muted-foreground transition",
                        active
                          ? "border-brand/40 text-brand"
                          : "group-hover:border-brand/30 group-hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {isSiteAdmin && (
                <Link
                  href="/admin"
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm font-semibold transition-all",
                    isActive(["/admin"])
                      ? "border-brand/40 bg-brand/15 text-foreground shadow-[var(--shadow-sm)]"
                      : "border-transparent text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-bg-primary text-muted-foreground transition",
                      isActive(["/admin"])
                        ? "border-brand/40 text-brand"
                        : "group-hover:border-brand/30 group-hover:text-foreground"
                    )}
                  >
                    <Shield className="h-4 w-4" />
                  </span>
                  <span>Site Admin</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-border bg-bg-secondary/80 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-text-inverse">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user?.name || "User"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email || "Signed in"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-50 flex lg:hidden no-print",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/60 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => onMobileOpenChange(false)}
        />
        <div
          className={cn(
            "relative h-full w-[85%] max-w-xs border-r border-border bg-bg-primary p-5 transition-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/40 bg-brand/15 text-brand">
                <Gauge className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                  Arena Ops
                </p>
                <p className="text-base font-semibold text-foreground">ScoreForge</p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMobileOpenChange(false)}
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-6">
            <p className="text-caption text-muted-foreground">Operations</p>
            <nav className="mt-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.activePaths);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => onMobileOpenChange(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm font-semibold transition-all",
                      active
                        ? "border-brand/40 bg-brand/15 text-foreground"
                        : "border-transparent text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-bg-primary text-muted-foreground transition",
                        active
                          ? "border-brand/40 text-brand"
                          : "group-hover:border-brand/30 group-hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {isSiteAdmin && (
                <Link
                  href="/admin"
                  onClick={() => onMobileOpenChange(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm font-semibold transition-all",
                    isActive(["/admin"])
                      ? "border-brand/40 bg-brand/15 text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-bg-primary text-muted-foreground transition",
                      isActive(["/admin"])
                        ? "border-brand/40 text-brand"
                        : "group-hover:border-brand/30 group-hover:text-foreground"
                    )}
                  >
                    <Shield className="h-4 w-4" />
                  </span>
                  <span>Site Admin</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="mt-8 space-y-4">
            <AuthLoading>
              <Skeleton className="h-20 w-full rounded-2xl" />
            </AuthLoading>
            <Authenticated>
              <div className="rounded-2xl border border-border bg-bg-secondary/80 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-text-inverse">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {user?.name || "User"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.email || "Signed in"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <ThemeToggle />
                  <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </div>
            </Authenticated>
            <Unauthenticated>
              <div className="flex flex-col gap-2">
                <Button variant="outline" asChild>
                  <Link href="/sign-in" onClick={() => onMobileOpenChange(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button variant="brand" asChild>
                  <Link href="/sign-up" onClick={() => onMobileOpenChange(false)}>
                    Create Account
                  </Link>
                </Button>
              </div>
            </Unauthenticated>
          </div>
        </div>
      </div>
    </>
  );
}
