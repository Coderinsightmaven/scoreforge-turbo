"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Loader2,
  Zap,
  LayoutGrid,
  Users,
  Smartphone,
  Trophy,
  Download,
  Sparkles,
  Menu,
  X,
} from "lucide-react";

// Tennis ball component with realistic styling
function TennisBall(): React.JSX.Element {
  return (
    <div className="pointer-events-none">
      <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16">
        {/* Ball shadow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/20 rounded-full blur-sm" />
        {/* Main ball */}
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-yellow-300 via-lime-400 to-yellow-400 shadow-lg">
          {/* Tennis ball seam - curved line */}
          <div className="absolute inset-1 rounded-full border-2 border-white/60"
            style={{
              clipPath: 'polygon(0 40%, 30% 20%, 70% 20%, 100% 40%, 100% 60%, 70% 80%, 30% 80%, 0 60%)'
            }}
          />
          {/* Highlight */}
          <div className="absolute top-2 left-2 w-4 h-4 md:w-5 md:h-5 rounded-full bg-white/40 blur-sm" />
          {/* Fuzzy texture overlay */}
          <div className="absolute inset-0 rounded-full opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)',
              backgroundSize: '4px 4px'
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Keyframes CSS for tennis ball animation - mobile and desktop versions
const tennisBounceKeyframes = `
  /* Mobile animation - smaller horizontal drift */
  @keyframes tennisBounce {
    0% {
      top: -60px;
      transform: translateX(0) rotate(0deg);
    }
    12% {
      top: 50vh;
      transform: translateX(5px) rotate(180deg);
    }
    24% {
      top: 20vh;
      transform: translateX(10px) rotate(360deg);
    }
    36% {
      top: 55vh;
      transform: translateX(18px) rotate(540deg);
    }
    48% {
      top: 30vh;
      transform: translateX(25px) rotate(720deg);
    }
    60% {
      top: 60vh;
      transform: translateX(32px) rotate(900deg);
    }
    72% {
      top: 40vh;
      transform: translateX(40px) rotate(1080deg);
    }
    84% {
      top: 65vh;
      transform: translateX(48px) rotate(1260deg);
    }
    100% {
      top: 105vh;
      transform: translateX(55px) rotate(1440deg);
    }
  }

  /* Desktop animation - larger horizontal drift */
  @media (min-width: 640px) {
    @keyframes tennisBounce {
      0% {
        top: -80px;
        transform: translateX(0) rotate(0deg);
      }
      12% {
        top: 55vh;
        transform: translateX(15px) rotate(180deg);
      }
      24% {
        top: 25vh;
        transform: translateX(30px) rotate(360deg);
      }
      36% {
        top: 60vh;
        transform: translateX(50px) rotate(540deg);
      }
      48% {
        top: 35vh;
        transform: translateX(70px) rotate(720deg);
      }
      60% {
        top: 65vh;
        transform: translateX(90px) rotate(900deg);
      }
      72% {
        top: 45vh;
        transform: translateX(110px) rotate(1080deg);
      }
      84% {
        top: 70vh;
        transform: translateX(130px) rotate(1260deg);
      }
      100% {
        top: 110vh;
        transform: translateX(160px) rotate(1440deg);
      }
    }
  }
`;

// Bouncing tennis balls animation overlay
function TennisBallAnimation(): React.JSX.Element | null {
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Fade out after animation completes
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted || !isVisible) return null;

  // Ball configurations with different positions, delays, and trajectories
  // Mobile shows 3 balls, desktop shows all 5
  // Mobile positions are more left-aligned since balls drift right
  const balls = [
    { id: 1, startX: '5%', startXDesktop: '10%', delay: 0, duration: 2.0, desktopOnly: false },
    { id: 2, startX: '35%', startXDesktop: '40%', delay: 0.15, duration: 1.8, desktopOnly: false },
    { id: 3, startX: '60%', startXDesktop: '70%', delay: 0.3, duration: 2.1, desktopOnly: false },
    { id: 4, startX: '25%', startXDesktop: '25%', delay: 0.4, duration: 2.3, desktopOnly: true },
    { id: 5, startX: '55%', startXDesktop: '55%', delay: 0.2, duration: 1.9, desktopOnly: true },
  ];

  // Generate CSS for responsive ball positions
  const ballPositionStyles = balls.map((ball) => `
    .tennis-ball-${ball.id} {
      left: ${ball.startX};
    }
    @media (min-width: 640px) {
      .tennis-ball-${ball.id} {
        left: ${ball.startXDesktop};
      }
    }
  `).join('');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: tennisBounceKeyframes + ballPositionStyles }} />
      <div
        className={`fixed inset-0 z-[100] pointer-events-none overflow-hidden transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        {balls.map((ball) => (
          <div
            key={ball.id}
            className={`tennis-ball-${ball.id} ${ball.desktopOnly ? 'hidden sm:block' : ''}`}
            style={{
              position: 'absolute',
              top: '-60px',
              animation: `tennisBounce ${ball.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${ball.delay}s forwards`,
            }}
          >
            <TennisBall />
          </div>
        ))}
      </div>
    </>
  );
}

export default function LandingPage(): React.ReactNode {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Tennis Ball Animation */}
      <TennisBallAnimation />

      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>

      <Authenticated>
        <LandingContent isAuthenticated />
      </Authenticated>

      <Unauthenticated>
        <LandingContent isAuthenticated={false} />
      </Unauthenticated>
    </div>
  );
}

function LoadingScreen(): React.JSX.Element {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="relative">
        <div className="absolute inset-0 blur-xl bg-amber-500/30 animate-pulse rounded-full" />
        <Loader2 className="relative w-12 h-12 text-amber-500 animate-spin" />
      </div>
    </div>
  );
}

function Logo({ size = "default" }: { size?: "default" | "small" }): React.JSX.Element {
  const iconSize = size === "small" ? "w-4 h-4" : "w-5 h-5";
  const containerSize = size === "small" ? "w-7 h-7" : "w-9 h-9";

  return (
    <div className={`${containerSize} bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/25`}>
      <Zap className={`${iconSize} text-white drop-shadow-sm`} />
    </div>
  );
}

function GlowOrb({ className }: { className?: string }): React.JSX.Element {
  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-30 pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}

function MobileNav({ isAuthenticated }: { isAuthenticated: boolean }): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3 group">
          <Logo />
          <span className="text-lg font-semibold text-foreground group-hover:text-amber-500 transition-colors">
            ScoreForge
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <Button variant="brand" className="shadow-lg shadow-amber-500/25" asChild>
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button variant="brand" className="shadow-lg shadow-amber-500/25" asChild>
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="sm:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <div className="container py-4 space-y-3">
            {isAuthenticated ? (
              <Button variant="brand" className="w-full" asChild onClick={() => setIsOpen(false)}>
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" className="w-full" asChild onClick={() => setIsOpen(false)}>
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button variant="brand" className="w-full" asChild onClick={() => setIsOpen(false)}>
                  <Link href="/sign-up">Get Started Free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function LandingContent({ isAuthenticated }: { isAuthenticated: boolean }): React.JSX.Element {
  const features = [
    {
      icon: LayoutGrid,
      title: "Multiple formats",
      description: "Single elimination, double elimination, or round robin — pick what works for you.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Zap,
      title: "Live scoring",
      description: "Score matches as they happen. Made a mistake? Just hit undo.",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: Users,
      title: "Invite helpers",
      description: "Let others help score matches. You stay in control of your tournament.",
      gradient: "from-violet-500 to-purple-500",
    },
    {
      icon: Smartphone,
      title: "Works on any device",
      description: "Use your phone, tablet, or computer. Everything syncs automatically.",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      icon: Trophy,
      title: "Tennis & volleyball",
      description: "Proper scoring rules for each sport, including tiebreaks and set points.",
      gradient: "from-rose-500 to-pink-500",
    },
    {
      icon: Download,
      title: "Export results",
      description: "Download your match results as a spreadsheet when you're done.",
      gradient: "from-indigo-500 to-blue-500",
    },
  ];

  const steps = [
    {
      step: "1",
      title: "Create your tournament",
      description: "Choose your sport, set the format, and add your players.",
    },
    {
      step: "2",
      title: "Generate brackets",
      description: "We handle seeding and bye placement automatically.",
    },
    {
      step: "3",
      title: "Score matches live",
      description: "Tap to score. Winners advance. Everyone stays updated.",
    },
  ];

  return (
    <div className="relative">
      {/* Background Glow Effects */}
      <GlowOrb className="w-[600px] h-[600px] bg-amber-500 -top-48 -right-48" />
      <GlowOrb className="w-[500px] h-[500px] bg-orange-500 top-[800px] -left-64" />
      <GlowOrb className="w-[400px] h-[400px] bg-amber-400 top-[1600px] right-0" />

      {/* Navigation */}
      <MobileNav isAuthenticated={isAuthenticated} />

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 md:py-32">
        <div className="container relative px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            {/* Floating badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-medium mb-6 sm:mb-8 animate-fadeIn">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
              Free for small tournaments
            </div>

            {/* Main headline with gradient */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 sm:mb-6 animate-slideUp">
              <span className="text-foreground">Run tournaments</span>
              <br />
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                with ease
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto animate-slideUp delay-1 px-2">
              Create brackets, track scores in real-time, and manage your competitions — all in one place.
              <span className="text-foreground font-medium"> Perfect for tennis and volleyball.</span>
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-slideUp delay-2 px-4 sm:px-0">
              <Button
                variant="brand"
                size="lg"
                className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/40 hover:scale-105 transition-all"
                asChild
              >
                <Link href={isAuthenticated ? "/dashboard" : "/sign-up"}>
                  {isAuthenticated ? "Go to Dashboard" : "Start Your Tournament"}
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 hover:bg-secondary/80 hover:scale-105 transition-all"
                asChild
              >
                <Link href="/brackets/quick">Try Bracket Generator</Link>
              </Button>
            </div>

            {/* Social proof hint */}
            <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-muted-foreground animate-fadeIn delay-3">
              No credit card required. Set up in under a minute.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-b from-secondary/50 to-background">
        <div className="container px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <Badge variant="outline" className="mb-3 sm:mb-4">
              Simple process
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              How it works
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto px-4">
              Get your tournament running in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {steps.map((item, i) => (
              <div
                key={item.step}
                className="relative group animate-slideUp"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-[2px] bg-gradient-to-r from-amber-500/50 to-transparent" />
                )}

                <Card className="relative overflow-hidden border-2 border-transparent hover:border-amber-500/30 transition-all duration-300 bg-card/50 backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="text-center pb-2">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
                      {item.step}
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base text-center">
                      {item.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-16 sm:py-24">
        <div className="container px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <Badge variant="outline" className="mb-3 sm:mb-4">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Everything you need
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto px-4">
              Simple tools that just work, so you can focus on running your event
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="group relative overflow-hidden border-2 border-transparent hover:border-amber-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 sm:hover:-translate-y-1 animate-slideUp"
                  style={{ animationDelay: `${i * 75}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="relative pb-2 sm:pb-4">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-3 sm:mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <CardTitle className="text-lg sm:text-xl group-hover:text-amber-500 transition-colors">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative pt-0">
                    <CardDescription className="text-sm sm:text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 sm:py-24">
        <div className="container px-4 sm:px-6">
          <div className="relative max-w-4xl mx-auto">
            {/* Gradient border card */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-2xl sm:rounded-3xl blur-sm opacity-75" />
            <div className="relative bg-card rounded-2xl sm:rounded-3xl p-6 sm:p-12 md:p-16 text-center overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                  backgroundSize: '24px 24px'
                }} />
              </div>

              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white mb-4 sm:mb-6 shadow-xl shadow-amber-500/30">
                  <Trophy className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>

                <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
                  {isAuthenticated ? "Ready for your next tournament?" : "Ready to get started?"}
                </h2>
                <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-xl mx-auto px-2">
                  {isAuthenticated
                    ? "Head to your dashboard to create and manage tournaments."
                    : "Create your first tournament in less than a minute. It's completely free."}
                </p>
                <Button
                  variant="brand"
                  size="lg"
                  className="text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-6 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/40 hover:scale-105 transition-all"
                  asChild
                >
                  <Link href={isAuthenticated ? "/dashboard" : "/sign-up"}>
                    {isAuthenticated ? "Go to Dashboard" : "Create Your Tournament"}
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 sm:py-12 border-t border-border/50">
        <div className="container px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Logo size="small" />
              <span className="font-semibold text-foreground">ScoreForge</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} ScoreForge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
