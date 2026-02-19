"use client";

import type { CardComponentProps } from "onborda";
import { Button } from "@/components/ui/button";

type CommandOnboardingCardProps = CardComponentProps & {
  onFinish: () => void;
};

export function CommandOnboardingCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  arrow,
  onFinish,
}: CommandOnboardingCardProps) {
  const isLast = currentStep + 1 === totalSteps;

  return (
    <div className="relative max-w-xs rounded-2xl border border-border/70 bg-bg-primary p-4 shadow-[var(--shadow-card)]">
      <div className="absolute -top-5 left-6">{arrow}</div>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand">
          {step.icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </p>
          <h3 className="mt-2 text-sm font-semibold text-foreground">{step.title}</h3>
          <div className="mt-2 text-sm text-muted-foreground">{step.content}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={prevStep} disabled={currentStep === 0}>
          Back
        </Button>
        <Button
          variant="brand"
          size="sm"
          onClick={() => {
            if (isLast) {
              onFinish();
            }
            nextStep();
          }}
        >
          {isLast ? "Finish" : "Next"}
        </Button>
      </div>
    </div>
  );
}
