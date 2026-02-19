"use client";

import { useState } from "react";
import Link from "next/link";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ArrowRight, Loader2, Menu, X } from "lucide-react";

interface NavLink {
  href: string;
  label: string;
}

export function LandingHeader({ navLinks }: { navLinks: NavLink[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="container py-6 sm:py-8 md:py-10">
      <div className="surface-panel surface-panel-rail px-4 py-3 sm:px-5 sm:py-4">
        {/* Top row: logo + hamburger (mobile) or logo + nav + CTA (desktop) */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-2.5 sm:gap-3">
            <Image
              src="/logo.png"
              alt="ScoreForge"
              width={80}
              height={80}
              className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20"
            />
            <div>
              <p className="text-base font-semibold leading-tight text-foreground sm:text-lg">
                ScoreForge
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground sm:text-xs">
                Command
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center justify-center gap-4 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-2 md:flex">
            <AuthButtons />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-bg-secondary text-muted-foreground transition-colors hover:text-foreground md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="mt-3 space-y-3 border-t border-border/60 pt-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:bg-bg-secondary hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-col gap-2 px-1 pb-1">
              <AuthButtons />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function AuthButtons() {
  return (
    <>
      <AuthLoading>
        <Button variant="outline" size="sm" disabled className="w-full md:w-auto">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading
        </Button>
      </AuthLoading>
      <Authenticated>
        <Button variant="brand" size="sm" asChild className="w-full md:w-auto">
          <Link href="/dashboard">
            Open Command
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </Authenticated>
      <Unauthenticated>
        <Button variant="outline" size="sm" asChild className="w-full md:w-auto">
          <Link href="/sign-in">Sign In</Link>
        </Button>
        <Button variant="brand" size="sm" asChild className="w-full md:w-auto">
          <Link href="/sign-up">
            Start Command
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </Unauthenticated>
    </>
  );
}
