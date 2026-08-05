"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardPreviewPanelProps {
  children: React.ReactNode;
  className?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function WizardPreviewPanel({
  isEmpty = false,
  emptyIcon,
  emptyMessage = "Preview will appear here",
  emptyDescription = "Describe what you want to create and the preview will update as the AI processes your request.",
  children,
  className,
}: WizardPreviewPanelProps) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col items-center justify-center overflow-y-auto p-6",
        className
      )}
    >
      <AnimatePresence mode="wait">
        {isEmpty ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center text-center"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="empty"
            transition={{ duration: 0.2 }}
          >
            <div className="mb-4 rounded-full bg-background p-4 shadow-sm">
              {emptyIcon ?? (
                <FileQuestion className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <p className="font-medium text-foreground">{emptyMessage}</p>
            <p className="mt-2 max-w-sm text-muted-foreground text-sm">
              {emptyDescription}
            </p>
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-2xl"
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            key="content"
            transition={{
              damping: 25,
              duration: 0.4,
              stiffness: 300,
              type: "spring",
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
