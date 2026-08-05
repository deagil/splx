"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardLoadingProps {
  className?: string;
  description?: string;
  title?: string;
}

export function WizardLoading({
  title = "Processing...",
  description = "AI is analyzing your request",
  className,
}: WizardLoadingProps) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-lg border bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-4",
        className
      )}
      exit={{ opacity: 0, scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            ease: "linear",
            repeat: Number.POSITIVE_INFINITY,
          }}
        >
          <Sparkles className="h-5 w-5 text-primary" />
        </motion.div>
        <div className="flex-1">
          <div className="font-medium text-sm">{title}</div>
          <div className="mt-1 text-muted-foreground text-xs">
            {description}
          </div>
        </div>
      </div>

      {/* Animated progress bar */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          animate={{ x: "200%" }}
          className="h-full bg-primary/50"
          initial={{ x: "-100%" }}
          style={{ width: "50%" }}
          transition={{
            duration: 1.5,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      </div>
    </motion.div>
  );
}
