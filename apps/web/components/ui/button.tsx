import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border text-sm font-semibold tracking-[0.06em] transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "border-border bg-foreground text-background hover:bg-foreground/90",
        destructive:
          "border-destructive bg-destructive text-text-inverse hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline: "border-border bg-transparent text-foreground hover:bg-secondary/80",
        secondary: "border-border bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost:
          "border-transparent text-muted-foreground hover:bg-bg-secondary/80 hover:text-foreground",
        link: "border-transparent text-foreground underline-offset-4 hover:underline",
        brand:
          "border-brand/60 bg-brand text-text-inverse font-bold shadow-[var(--shadow-glow)] hover:bg-brand-hover hover:-translate-y-0.5",
        editorial:
          "border-transparent text-foreground font-semibold relative after:absolute after:bottom-1 after:left-3 after:right-3 after:h-0.5 after:bg-brand after:scale-x-0 after:origin-left after:transition-transform hover:after:scale-x-100",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        xs: "h-6 gap-1 px-3 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 has-[>svg]:px-3 text-[0.78rem]",
        lg: "h-12 px-7 has-[>svg]:px-5 text-[0.95rem]",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
