"use client";

import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";
import { AnimatedMarkdown } from "flowtoken";
import { cn } from "@/lib/utils";

type ResponseProps = ComponentProps<typeof Streamdown> & {
  /** Enable streaming animation effects */
  isStreaming?: boolean;
};

export const Response = memo(
  ({ className, isStreaming = false, children, ...props }: ResponseProps) => {
    const content = typeof children === "string" ? children : "";
    
    // Use FlowToken's AnimatedMarkdown for streaming content with smooth fade-in
    if (isStreaming && content) {
      return (
        <div
          className={cn(
            "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto",
            className
          )}
          data-streaming="true"
        >
          <AnimatedMarkdown
            content={content}
            animation="fadeIn"
            animationDuration="0.5s"
            animationTimingFunction="ease-in-out"
            sep="word"
          />
        </div>
      );
    }
    
    // Use Streamdown for non-streaming content (completed messages)
    return (
      <Streamdown
        className={cn(
          "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto",
          className
        )}
        {...props}
      >
        {children}
      </Streamdown>
    );
  },
  (prevProps, nextProps) => 
    prevProps.children === nextProps.children && 
    prevProps.isStreaming === nextProps.isStreaming
);

Response.displayName = "Response";
