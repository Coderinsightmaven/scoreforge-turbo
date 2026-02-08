"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@repo/convex";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/app/components/Skeleton";
import { Home, Settings, LogOut, Shield, Braces } from "lucide-react";

export function Navigation(): React.ReactNode {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const isSiteAdmin = useQuery(api.siteAdmin.checkIsSiteAdmin);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <nav className="sticky top-0 z-40 w-full px-3 py-2 sm:px-5 sm:py-3 no-print">
      <div className="container border-b border-border/75 pb-2 sm:pb-3">
        <div
          className="flex items-center justify-between gap-4"
          style={{ minHeight: "var(--nav-height)" }}
        >
          <Link href="/dashboard" className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand/45 bg-brand text-text-inverse transition-transform duration-200 group-hover:-translate-y-0.5">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M13 3L4 14h7v7l9-11h-7V3z" />
              </svg>
            </div>
            <div className="leading-none">
              <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foreground">
                ScoreForge
              </p>
              <div className="flex items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  Operations Desk
                </p>
                <span className="live-dot" />
              </div>
            </div>
          </Link>

          <Authenticated>
            <div className="hidden items-center gap-5 md:flex">
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/brackets/quick"
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Quick Bracket
              </Link>
            </div>
          </Authenticated>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            <AuthLoading>
              <Skeleton className="h-9 w-9 rounded-full" />
            </AuthLoading>

            <Unauthenticated>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button variant="brand" asChild>
                <Link href="/sign-up">Create Account</Link>
              </Button>
            </Unauthenticated>

            <Authenticated>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full border border-transparent p-0 hover:border-brand/40"
                    aria-label="Open user menu"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand/55 bg-brand text-sm font-bold text-text-inverse shadow-[var(--shadow-sm)]">
                      {initials}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2">
                  <DropdownMenuLabel className="font-normal">
                    <div className="space-y-1">
                      <p className="truncate font-medium text-foreground">{user?.name || "User"}</p>
                      <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <Home className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/brackets/quick" className="cursor-pointer">
                      <Braces className="mr-2 h-4 w-4" />
                      Quick Bracket
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  {isSiteAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Site Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => signOut()}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Authenticated>
          </div>
        </div>
      </div>
    </nav>
  );
}
