"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface WizardOption {
  label: string;
  value: string;
}

interface BaseStepProps {
  message: string;
  options?: WizardOption[];
}

type QuestionStepProps = BaseStepProps & {
  type: "question";
  onSelect: (value: string) => void;
};

type VariantsStepProps = BaseStepProps & {
  type: "variants";
  onSelect: (value: string) => void;
};

type ClarificationStepProps = BaseStepProps & {
  type: "clarification";
  onSubmit: (response: string) => void;
};

type FinalStepProps<T> = BaseStepProps & {
  type: "final";
  data: T;
  renderPreview: (data: T) => React.ReactNode;
  onSave: () => void;
  onImprove?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
  improveLabel?: string;
};

export type WizardStepProps<T = unknown> =
  | QuestionStepProps
  | VariantsStepProps
  | ClarificationStepProps
  | FinalStepProps<T>;

export function WizardStepRenderer<T>(props: WizardStepProps<T>) {
  const { type, message } = props;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        initial={{ opacity: 0, x: 20 }}
        key={type + message}
        transition={{ duration: 0.2 }}
      >
        {type === "question" && <QuestionStep {...props} />}
        {type === "variants" && <VariantsStep {...props} />}
        {type === "clarification" && <ClarificationStep {...props} />}
        {type === "final" && <FinalStep {...(props as FinalStepProps<T>)} />}
      </motion.div>
    </AnimatePresence>
  );
}

function QuestionStep({ message, options = [], onSelect }: QuestionStepProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="font-medium text-sm">{message}</p>
      </div>
      {options.length > 0 && (
        <div className="flex flex-col gap-2">
          {options.map((option, index) => (
            <Button
              className="w-full justify-start text-left"
              key={index}
              onClick={() => onSelect(option.value)}
              variant="outline"
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function VariantsStep({ message, options = [], onSelect }: VariantsStepProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (value: string, index: number) => {
    setSelectedIndex(index);
    onSelect(value);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="font-medium text-sm">{message}</p>
      </div>
      {options.length > 0 && (
        <div className="flex flex-col gap-2">
          {options.map((option, index) => (
            <Button
              className="w-full justify-between"
              key={index}
              onClick={() => handleSelect(option.value, index)}
              variant={selectedIndex === index ? "primary" : "outline"}
            >
              <span className="flex-1 text-left">{option.label}</span>
              {selectedIndex === index && <Check className="ml-2 h-4 w-4" />}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function ClarificationStep({ message, onSubmit }: ClarificationStepProps) {
  const [response, setResponse] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (response.trim()) {
      onSubmit(response.trim());
      setResponse("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="font-medium text-sm">{message}</p>
      </div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <Textarea
          className="min-h-[100px] resize-none"
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Type your response here..."
          value={response}
        />
        <Button className="w-full" disabled={!response.trim()} type="submit">
          Submit
        </Button>
      </form>
    </div>
  );
}

function FinalStep<T>({
  message,
  data,
  renderPreview,
  onSave,
  onImprove,
  isSaving = false,
  saveLabel = "Save",
  improveLabel = "Improve Further",
}: FinalStepProps<T>) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-gradient-to-br from-primary/5 via-primary/2 to-primary/5 p-4">
        <p className="font-medium text-sm">{message}</p>
      </div>

      {/* Custom preview content */}
      <div className="rounded-lg border bg-background p-4">
        {renderPreview(data)}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {!!onImprove && (
          <Button
            className="flex-1"
            disabled={isSaving}
            onClick={onImprove}
            variant="outline"
          >
            <Sparkles className="mr-2 h-3 w-3" />
            {improveLabel}
          </Button>
        )}
        <Button className="flex-1" disabled={isSaving} onClick={onSave}>
          {isSaving ? (
            "Saving..."
          ) : (
            <>
              <Check className="mr-2 h-3 w-3" />
              {saveLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
