"use client";

import {
  ArrowRight,
  Database,
  MessageSquare,
  PieChart,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSidebar } from "@/components/ui/sidebar";

interface WelcomeStateProps {
  hasConnectedApps: boolean;
  userName?: string | null;
}

export function WelcomeState({
  userName,
  hasConnectedApps,
}: WelcomeStateProps) {
  // If userName is provided (from profile.firstname), use it. Otherwise fall back to generic.
  const firstName = userName || "there";
  const { toggleSidebar, open, setOpen } = useSidebar();
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/tables/sync", {
        credentials: "same-origin",
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to sync tables");
      }

      toast.success("Database synced successfully");
      router.refresh();
    } catch {
      toast.error("Failed to sync database");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartChat = () => {
    if (open) {
      // If already open, focus input? Or just do nothing?
      // User said: "Start chat should just open the chat sidebar if the sidebar state is closed"
      // If it's already open, maybe we don't need to do anything, or we can toggle it to point it out.
      // But usually "open if closed" implies idempotent "ensure open".
    } else {
      setOpen(true);
    }
  };

  return (
    <div className="space-y-8 py-8">
      <div className="space-y-2">
        <h1 className="font-bold text-4xl tracking-tight">
          Welcome to Splx, {firstName}.
        </h1>
        <p className="text-muted-foreground text-xl">
          Let's get your workspace set up.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Connect or Sync */}
        {hasConnectedApps ? (
          <Card className="border-dashed bg-muted/30 transition-colors hover:bg-muted/50">
            <CardHeader>
              <RefreshCw
                className={`mb-2 h-8 w-8 text-primary ${isSyncing ? "animate-spin" : ""}`}
              />
              <CardTitle>Sync Database</CardTitle>
              <CardDescription>
                Refresh your database schema to pull in the latest tables.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                disabled={isSyncing}
                onClick={handleSync}
              >
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed bg-muted/30 transition-colors hover:bg-muted/50">
            <CardHeader>
              <Database className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Connect Data</CardTitle>
              <CardDescription>
                Connect your database or API to start analyzing your data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/workspace-settings">
                  Connect Source <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 2: Start Chat */}
        <Card className="border-dashed bg-muted/30 transition-colors hover:bg-muted/50">
          <CardHeader>
            <MessageSquare className="mb-2 h-8 w-8 text-blue-500" />
            <CardTitle>Start a Chat</CardTitle>
            <CardDescription>
              Open the sidebar to start a new conversation with your data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={handleStartChat}
              variant="secondary"
            >
              Open Chat <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Create Report (always visible, disabled if no data) */}
        <Card
          className={`border-dashed transition-colors ${hasConnectedApps ? "bg-muted/30 hover:bg-muted/50" : "bg-muted/10 opacity-70"}`}
        >
          <CardHeader>
            <PieChart
              className={`mb-2 h-8 w-8 ${hasConnectedApps ? "text-emerald-500" : "text-emerald-500/30"}`}
            />
            <CardTitle>Create Report</CardTitle>
            <CardDescription>
              Build visual reports and dashboards from your data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasConnectedApps ? (
              <Button asChild className="w-full" variant="secondary">
                <Link href="/data/reports">
                  Report Wizard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button
                className="w-full cursor-not-allowed opacity-80"
                disabled
                variant="secondary"
              >
                Connect Data First
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
