"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type WizardLoadingProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function WizardLoading({
  title = "Processing...",
  description = "AI is analyzing your request",
  className,
}: WizardLoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-lg border bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-4",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        >
          <Sparkles className="h-5 w-5 text-primary" />
        </motion.div>
        <div className="flex-1">
          <div className="font-medium text-sm">{title}</div>
          <div className="text-xs text-muted-foreground mt-1">{description}</div>
        </div>
      </div>

      {/* Animated progress bar */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full bg-primary/50"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{
            duration: 1.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          style={{ width: "50%" }}
        />
      </div>
    </motion.div>
  );
}
