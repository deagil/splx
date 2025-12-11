"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

type WizardPreviewPanelProps = {
  isEmpty?: boolean;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  emptyDescription?: string;
  children: React.ReactNode;
  className?: string;
};

export function WizardPreviewPanel({
  isEmpty = false,
  emptyIcon,
  emptyMessage = "Preview will appear here",
  emptyDescription = "Describe what you want to create and the preview will update as the AI processes your request.",
  children,
  className,
}: WizardPreviewPanelProps) {
  return (
    <div className={cn("relative flex h-full flex-col items-center justify-center overflow-y-auto p-6", className)}>
      <AnimatePresence mode="wait">
        {isEmpty ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center text-center"
          >
            <div className="mb-4 rounded-full bg-background p-4 shadow-sm">
              {emptyIcon ?? <FileQuestion className="h-8 w-8 text-muted-foreground" />}
            </div>
            <p className="font-medium text-foreground">{emptyMessage}</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {emptyDescription}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-2xl"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
