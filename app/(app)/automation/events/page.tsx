import { Suspense } from "react";
import { AutomationEventsView } from "@/components/automation/events-page-view";
import { AppLoader } from "@/components/shared/app-loader";

export default function AutomationEventsPage() {
  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="font-bold text-3xl tracking-tight">Events</h1>
        <p className="mt-2 text-muted-foreground">
          Register event types Listeners can subscribe to.
        </p>
      </div>

      <Suspense fallback={<AppLoader label="Loading events" />}>
        <AutomationEventsView />
      </Suspense>
    </div>
  );
}
