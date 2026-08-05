"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function WizardStepIndicator({
  currentStep,
  totalSteps,
}: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center gap-4">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        const isPending = step > currentStep;

        return (
          <div className="flex items-center" key={step}>
            <div className="flex items-center">
              {/* Step circle */}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted &&
                    "border-primary bg-primary text-primary-foreground",
                  isCurrent &&
                    "border-primary bg-primary text-primary-foreground",
                  isPending && "border-muted-foreground/30 bg-background"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="font-medium text-xs">{step}</span>
                )}
              </div>

              {/* Connecting line */}
              {step < totalSteps && (
                <div
                  className={cn(
                    "h-0.5 w-12 transition-colors",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          </div>
        );
      })}
      <div className="ml-auto text-muted-foreground text-sm">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
}
