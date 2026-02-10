import { Skeleton } from "@/app/components/Skeleton";

export function TabSkeleton() {
  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex flex-col p-4 bg-card border border-border rounded-lg"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <div className="ml-auto">
                <Skeleton className="h-5 w-16 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-4 w-8 flex-shrink-0" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
