"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WizardState } from "@/lib/build/table-wizard/types";
import { canProceedToNextStep } from "@/lib/build/table-wizard/validation";

interface WizardNavigationProps {
  currentStep: number;
  goToStep: (step: number) => void;
  state: WizardState;
  totalSteps: number;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  state,
  goToStep,
}: WizardNavigationProps) {
  const canGoNext = canProceedToNextStep(currentStep, state);
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  const handleBack = () => {
    if (!isFirstStep) {
      goToStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext && !isLastStep) {
      goToStep(currentStep + 1);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <Button
        disabled={isFirstStep}
        onClick={handleBack}
        type="button"
        variant="outline"
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="text-muted-foreground text-sm">
        {!canGoNext && "Please complete all required fields to continue"}
      </div>

      {isLastStep ? null : (
        <Button disabled={!canGoNext} onClick={handleNext} type="button">
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
