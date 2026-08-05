import { Suspense } from "react";
import { ListenersView } from "@/components/automation/listeners-view";
import { AppLoader } from "@/components/shared/app-loader";

export default function AutomationListenersPage() {
  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="font-bold text-3xl tracking-tight">Listeners</h1>
        <p className="mt-2 text-muted-foreground">
          Bind event types to workflows. When a matching fact is emitted, a
          schedule row is enqueued and the worker runs the steps.
        </p>
      </div>

      <Suspense fallback={<AppLoader label="Loading listeners" />}>
        <ListenersView />
      </Suspense>
    </div>
  );
}
