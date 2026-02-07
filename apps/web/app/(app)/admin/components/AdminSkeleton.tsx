"use client";

export function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container py-8">
          <div className="h-5 w-32 bg-bg-secondary rounded animate-pulse mb-4" />
          <div className="h-8 w-64 bg-bg-secondary rounded animate-pulse mb-2" />
          <div className="h-5 w-80 bg-bg-secondary rounded animate-pulse" />
        </div>
      </div>
      <div className="border-b border-border bg-card">
        <div className="container">
          <div className="flex gap-6 py-4">
            <div className="h-5 w-16 bg-bg-secondary rounded animate-pulse" />
            <div className="h-5 w-16 bg-bg-secondary rounded animate-pulse" />
            <div className="h-5 w-20 bg-bg-secondary rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="container py-8">
        <div className="card p-6">
          <div className="h-12 w-full bg-bg-secondary rounded-lg animate-pulse mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 w-full bg-bg-secondary rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
