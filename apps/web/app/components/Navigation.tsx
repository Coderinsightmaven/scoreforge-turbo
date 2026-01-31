"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function Navigation(): React.ReactNode {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const tournaments = useQuery(api.tournaments.listMyTournaments, {});
  const isSiteAdmin = useQuery(api.siteAdmin.checkIsSiteAdmin);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const liveMatchCount = tournaments?.reduce((acc, t) => acc + t.liveMatchCount, 0) || 0;
  const hasLiveActivity = liveMatchCount > 0;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path) && path !== "/dashboard";
  };

  const navLinks: { href: string; label: string }[] = [];

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-200 ${
          isScrolled
            ? "bg-bg-primary shadow-sm"
            : "glass"
        }`}
      >
        <div className="flex items-center justify-between h-[var(--nav-height)] px-5 lg:px-8 max-w-[1400px] mx-auto">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 group relative">
            <img
              src="/logo.png"
              alt="ScoreForge"
              className="w-9 h-9 object-contain"
            />
            {hasLiveActivity && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full animate-pulse" />
            )}
            <span className="font-display text-xl text-text-primary hidden sm:block">
              ScoreForge
            </span>
          </Link>

          {/* Center Nav - Desktop */}
          <Authenticated>
            {navLinks.length > 0 && (
              <div className="hidden lg:flex items-center bg-bg-secondary rounded-full p-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                      isActive(link.href)
                        ? "bg-bg-primary text-text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </Authenticated>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <AuthLoading>
              <div className="w-9 h-9 rounded-full bg-bg-tertiary animate-pulse" />
            </AuthLoading>

            <Unauthenticated>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-full hover:bg-accent-bright transition-all shadow-sm"
              >
                Get started
              </Link>
            </Unauthenticated>

            <Authenticated>
              {/* Live indicator */}
              {hasLiveActivity && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-success-pale rounded-full">
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-success">{liveMatchCount} live</span>
                </div>
              )}

              {/* Profile */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className={`flex items-center gap-2 p-1.5 rounded-full transition-all ${
                    profileOpen ? "bg-bg-tertiary" : "hover:bg-bg-secondary"
                  }`}
                >
                  <div className="w-8 h-8 flex items-center justify-center text-xs font-semibold text-white bg-accent rounded-full">
                    {initials}
                  </div>
                  <svg
                    className={`w-4 h-4 text-text-muted transition-transform ${profileOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {profileOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-bg-primary rounded-2xl shadow-lg border border-border overflow-hidden animate-fadeInDown">
                    <div className="p-4 bg-bg-secondary">
                      <p className="font-medium text-text-primary truncate">{user?.name || "User"}</p>
                      <p className="text-sm text-text-muted truncate">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-text-secondary rounded-lg hover:text-text-primary hover:bg-bg-secondary transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </Link>
                      {isSiteAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-text-secondary rounded-lg hover:text-accent hover:bg-accent/5 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                          </svg>
                          Site Admin
                        </Link>
                      )}
                      <button
                        onClick={() => { setProfileOpen(false); signOut(); }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-text-secondary text-left rounded-lg hover:text-error hover:bg-error-pale transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              {navLinks.length > 0 && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden flex items-center justify-center w-9 h-9 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    )}
                  </svg>
                </button>
              )}
            </Authenticated>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <Authenticated>
        {navLinks.length > 0 && mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-[900] bg-black/20 backdrop-blur-sm lg:hidden animate-fadeIn"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed top-[var(--nav-height)] left-0 right-0 z-[950] lg:hidden animate-fadeInDown p-4">
              <div className="bg-bg-primary rounded-2xl shadow-lg border border-border overflow-hidden">
                <div className="p-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                        isActive(link.href)
                          ? "bg-accent-pale text-accent"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                      }`}
                    >
                      <span className="font-medium">{link.label}</span>
                      {isActive(link.href) && (
                        <span className="w-2 h-2 bg-accent rounded-full" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </Authenticated>
    </>
  );
}
