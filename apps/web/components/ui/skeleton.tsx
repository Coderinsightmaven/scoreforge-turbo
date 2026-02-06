import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-secondary animate-pulse rounded-[4px]", className)}
      {...props}
    />
  )
}

export { Skeleton }
