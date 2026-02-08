import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-semibold tracking-[0.03em] transition-[transform,background-color,color,border-color,box-shadow] duration-200 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/35 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border-brand/50 bg-primary/95 text-primary-foreground shadow-[var(--shadow-sm)] hover:border-brand-bright/70 hover:bg-primary hover:shadow-[var(--shadow-md)]",
        destructive:
          "border-destructive/55 bg-destructive text-white shadow-[var(--shadow-sm)] hover:bg-destructive/90 hover:shadow-[var(--shadow-md)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/85",
        outline:
          "border-border bg-background/80 text-foreground shadow-[var(--shadow-sm)] hover:border-border-strong hover:bg-secondary/80",
        secondary:
          "border-border bg-secondary text-secondary-foreground shadow-[var(--shadow-sm)] hover:border-border-strong hover:bg-secondary/90",
        ghost:
          "border-transparent text-muted-foreground hover:border-brand/35 hover:bg-accent/70 hover:text-accent-foreground dark:hover:bg-accent/65",
        link: "text-primary underline-offset-4 hover:underline",
        brand:
          "border-brand-bright/70 bg-brand text-text-inverse shadow-[var(--shadow-glow)] hover:bg-brand-hover hover:-translate-y-0.5 dark:bg-brand dark:text-text-inverse dark:hover:bg-brand-hover",
        editorial:
          "border-transparent text-brand hover:text-brand-hover font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-brand after:scale-x-0 after:origin-left after:transition-transform hover:after:scale-x-100",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 rounded-md gap-1.5 px-3.5 has-[>svg]:px-3",
        lg: "h-11 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
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
