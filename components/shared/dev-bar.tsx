"use client";

import type { User } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogsIcon } from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConsoleLogs } from "@/hooks/use-console-logs";
import {
  type EnvironmentType,
  getEnvironmentType,
  isDevelopmentEnvironment,
  isStagingEnvironment,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function DevBar() {
  const [user, setUser] = useState<User | null>(null);
  const nextPathname = usePathname();
  const { logCount, copyLogsToClipboard } = useConsoleLogs();
  const [copied, setCopied] = useState(false);
  const [pathname, setPathname] = useState<string>(
    typeof window === "undefined" ? nextPathname : window.location.pathname
  );

  // Check Supabase auth state
  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Use window.location.pathname as the source of truth for the actual browser URL
  // This ensures we always show the real browser path, including after redirects
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Always use the actual browser URL - this catches server-side redirects
      setPathname(window.location.pathname);
    }
  }, []);

  const envType = getEnvironmentType();
  const isDev = isDevelopmentEnvironment;
  const isStaging = isStagingEnvironment;

  // Only render in dev or staging
  if (!isDev && !isStaging) {
    return null;
  }

  const gitBranch = process.env.NEXT_PUBLIC_GIT_BRANCH || "unknown";

  const handleCopyLogs = async () => {
    const success = await copyLogsToClipboard();
    if (success) {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  const envColors: Record<EnvironmentType, string> = {
    development: "bg-blue-950/50 border-blue-800/50 text-blue-200",
    production: "bg-green-950/50 border-green-800/50 text-green-200",
    staging: "bg-amber-950/50 border-amber-800/50 text-amber-200",
  };

  const envColor = envColors[envType];

  return (
    <div
      className={cn(
        "fixed right-0 bottom-0 left-0 z-50 flex h-7 items-center gap-2 border-t px-3 font-mono text-xs",
        envColor
      )}
    >
      {/* Auth Status */}
      <Badge
        className="h-5 border-current/30 bg-transparent px-1.5 text-[10px]"
        variant="outline"
      >
        {user ? <>{user.email || "Logged in"} (user)</> : "Logged out"}
      </Badge>

      {/* Git Branch */}
      <Badge
        className="h-5 border-current/30 bg-transparent px-1.5 text-[10px]"
        variant="outline"
      >
        {gitBranch}
      </Badge>

      {/* Current Route */}
      <span className="truncate text-[10px] opacity-70">{pathname}</span>

      <div className="flex-1" />

      {/* Dev-only quick links */}
      {!!isDev && (
        <>
          <Button
            className="h-5 px-2 text-[10px] hover:bg-current/10"
            onClick={() => {
              window.open("http://localhost:54323", "_blank");
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Supabase
          </Button>
          <Button
            className="h-5 px-2 text-[10px] hover:bg-current/10"
            onClick={() => {
              window.open("http://localhost:54324", "_blank");
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Mailpit
          </Button>
        </>
      )}

      {/* Console Logs */}
      <Button
        className="h-5 gap-1 px-2 text-[10px] hover:bg-current/10"
        onClick={handleCopyLogs}
        size="sm"
        title="Copy console logs as markdown"
        type="button"
        variant="ghost"
      >
        <LogsIcon size={12} />
        {logCount > 0 && (
          <Badge
            className="h-3 min-w-3 border-current/30 bg-current/20 px-0.5 text-[9px]"
            variant="outline"
          >
            {logCount}
          </Badge>
        )}
        {!!copied && (
          <span className="ml-1 text-[9px] opacity-70">Copied!</span>
        )}
      </Button>
    </div>
  );
}
