"use client";

import { Authenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <AuthLoading>
        <div className="fixed inset-0 flex items-center justify-center bg-bg-primary z-50">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent animate-pulse" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3L4 14h7v7l9-11h-7V3z" />
            </svg>
          </div>
        </div>
      </AuthLoading>

      <Authenticated>
        <RedirectToDashboard />
      </Authenticated>

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

function RedirectToDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-bg-primary z-50">
      <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
        <svg className="w-5 h-5 text-accent animate-pulse" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 3L4 14h7v7l9-11h-7V3z" />
        </svg>
      </div>
    </div>
  );
}
