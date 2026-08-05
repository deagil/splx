import { Suspense } from "react";
import { EventsView } from "@/components/build/events-view";
import { requireDevAccess } from "../dev-access";

export default async function EventsPage() {
  const denied = await requireDevAccess();
  if (denied) {
    return denied;
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="font-bold text-3xl tracking-tight">Events</h1>
        <p className="mt-2 text-muted-foreground">
          The event outbox, newest first. Nothing drains it yet, so every event
          is unprocessed — a future automation runner will consume these.
        </p>
      </div>

      <Suspense fallback={null}>
        <EventsView />
      </Suspense>
    </div>
  );
}
