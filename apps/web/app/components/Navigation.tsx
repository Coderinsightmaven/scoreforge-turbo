"use client";

import { useState } from "react";
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
import { Home, Settings, LogOut, Shield, Braces, Menu, X } from "lucide-react";

export function Navigation(): React.ReactNode {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const isSiteAdmin = useQuery(api.siteAdmin.checkIsSiteAdmin);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <nav className="sticky top-0 z-40 w-full px-4 py-3 sm:px-6 no-print">
      <div className="container">
        <div className="flex items-center justify-between gap-4">
          <Link href="/dashboard" className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-200 group-hover:scale-105">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M13 3L4 14h7v7l9-11h-7V3z" />
              </svg>
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-foreground">
              ScoreForge
            </span>
          </Link>

          <Authenticated>
            <div className="hidden items-center gap-1 md:flex">
              <Link
                href="/dashboard"
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/brackets/quick"
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Quick Bracket
              </Link>
            </div>
          </Authenticated>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <AuthLoading>
              <Skeleton className="h-9 w-9 rounded-full" />
            </AuthLoading>

            <Unauthenticated>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button variant="brand" asChild className="hidden sm:inline-flex">
                <Link href="/sign-up">Create Account</Link>
              </Button>
              {/* Mobile hamburger for unauthenticated users */}
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </Unauthenticated>

            <Authenticated>
              {/* Mobile hamburger for quick nav (visible below md breakpoint) */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full border border-transparent p-0 hover:border-brand/40"
                    aria-label="Open user menu"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
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

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="mt-3 border-t border-border pt-3 animate-fadeIn">
            <Authenticated>
              <div className="flex flex-col gap-1 md:hidden">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  href="/brackets/quick"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Braces className="h-4 w-4" />
                  Quick Bracket
                </Link>
              </div>
            </Authenticated>
            <Unauthenticated>
              <div className="flex flex-col gap-2 sm:hidden">
                <Button variant="ghost" asChild className="w-full justify-start">
                  <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button variant="brand" asChild className="w-full justify-start">
                  <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>
                    Create Account
                  </Link>
                </Button>
              </div>
            </Unauthenticated>
          </div>
        )}
      </div>
    </nav>
  );
}
