"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useState, useRef, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function Navigation(): React.ReactNode {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <nav className="sticky top-0 z-50 bg-bg-page border-b border-border">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3L4 14h7v7l9-11h-7V3z" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-text-primary">
            ScoreForge
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          <AuthLoading>
            <div className="w-9 h-9 rounded-full bg-bg-secondary animate-pulse" />
          </AuthLoading>

          <Unauthenticated>
            <Link
              href="/sign-in"
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="btn-primary !py-2 !px-4 !min-h-0"
            >
              Get Started
            </Link>
          </Unauthenticated>

          <Authenticated>
            {/* User menu */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-bg-secondary transition-colors"
                aria-label="Open user menu"
              >
                <div className="w-9 h-9 flex items-center justify-center text-sm font-semibold text-white bg-brand rounded-full">
                  {initials}
                </div>
              </button>

              {menuOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-fadeIn">
                  {/* User info */}
                  <div className="p-4 border-b border-border">
                    <p className="font-medium text-text-primary truncate">
                      {user?.name || "User"}
                    </p>
                    <p className="text-sm text-text-muted truncate">
                      {user?.email}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="p-2">
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-text-secondary rounded-lg hover:bg-bg-secondary transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                      </svg>
                      Dashboard
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-text-secondary rounded-lg hover:bg-bg-secondary transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>

                    <div className="my-2 h-px bg-border" />

                    <button
                      onClick={() => { setMenuOpen(false); signOut(); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-error rounded-lg hover:bg-error-light transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Authenticated>
        </div>
      </div>
    </nav>
  );
}
