"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type UnionKeys<T> = T extends T ? keyof T : never;
type Expand<T> = T extends T ? { [K in keyof T]: T[K] } : never;
type OneOf<T extends {}[]> = {
  [K in keyof T]: Expand<T[K] & Partial<Record<Exclude<UnionKeys<T[number]>, keyof T[K]>, never>>>;
}[number];

export type Classname = string;
export type WeightedDateEntry = {
  date: Date;
  weight: number;
};

interface DatesPerVariantProps {
  datesPerVariant: Date[][];
}

interface WeightedDatesProps {
  weightedDates: WeightedDateEntry[];
}

type VariantDatesInput = OneOf<[DatesPerVariantProps, WeightedDatesProps]>;

export type CalendarHeatmapProps = React.ComponentProps<typeof DayPicker> & {
  variantClassnames: Classname[];
} & VariantDatesInput;

function useModifiers(
  variantClassnames: Classname[],
  datesPerVariant: Date[][]
): [Record<string, Date[]>, Record<string, string>] {
  const noOfVariants = variantClassnames.length;

  const variantLabels = [...Array(noOfVariants)].map((_, idx) => `__variant${idx}`);

  const modifiers = variantLabels.reduce(
    (acc, key, index) => {
      acc[key] = datesPerVariant[index] ?? [];
      return acc;
    },
    {} as Record<string, Date[]>
  );

  const modifiersClassNames = variantLabels.reduce(
    (acc, key, index) => {
      acc[key] = variantClassnames[index] ?? "";
      return acc;
    },
    {} as Record<string, string>
  );

  return [modifiers, modifiersClassNames];
}

function categorizeDatesPerVariant(weightedDates: WeightedDateEntry[], noOfVariants: number) {
  const sortedEntries = weightedDates.sort((a, b) => a.weight - b.weight);
  const categorizedRecord = [...Array(noOfVariants)].map(() => [] as Date[]);

  if (sortedEntries.length === 0) {
    return categorizedRecord;
  }

  const minNumber = sortedEntries[0]?.weight ?? 0;
  const maxNumber = sortedEntries[sortedEntries.length - 1]?.weight ?? minNumber;
  const range = minNumber === maxNumber ? 1 : (maxNumber - minNumber) / noOfVariants;

  sortedEntries.forEach((entry) => {
    const category = Math.min(Math.floor((entry.weight - minNumber) / range), noOfVariants - 1);
    const bucket = categorizedRecord[category];
    if (bucket) {
      bucket.push(entry.date);
    }
  });

  return categorizedRecord;
}

function CalendarHeatmap({
  variantClassnames,
  datesPerVariant,
  weightedDates,
  className,
  classNames = {},
  showOutsideDays = true,
  ...props
}: CalendarHeatmapProps) {
  const noOfVariants = variantClassnames.length;

  const normalizedWeightedDates = weightedDates ?? [];
  const normalizedDatesPerVariant =
    datesPerVariant ?? categorizeDatesPerVariant(normalizedWeightedDates, noOfVariants);

  const [modifiers, modifiersClassNames] = useModifiers(
    variantClassnames,
    normalizedDatesPerVariant
  );

  return (
    <DayPicker
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.75rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation = "left" }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}

CalendarHeatmap.displayName = "CalendarHeatmap";

export { CalendarHeatmap };
