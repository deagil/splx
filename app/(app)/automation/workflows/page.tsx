import { Suspense } from "react";
import { WorkflowsView } from "@/components/build/workflows-view";
import { AppLoader } from "@/components/shared/app-loader";

export default function AutomationWorkflowsPage() {
  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="font-bold text-3xl tracking-tight">Workflows</h1>
        <p className="mt-2 text-muted-foreground">
          Step definitions for event-driven listeners and manual runs. Configure
          actions as JSON for now; the visual builder comes later.
        </p>
      </div>

      <Suspense fallback={<AppLoader label="Loading workflows" />}>
        <WorkflowsView />
      </Suspense>
    </div>
  );
}
