import { Suspense } from "react";
import { TemplatesListView } from "@/components/comms/templates-list-view";
import { AppLoader } from "@/components/shared/app-loader";

export default function CommsTemplatesPage() {
  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="font-bold text-3xl tracking-tight">Email templates</h1>
        <p className="mt-2 text-muted-foreground">
          Create transactional emails, declare the data they need, and send them
          from workflows.
        </p>
      </div>

      <Suspense fallback={<AppLoader label="Loading templates" />}>
        <TemplatesListView />
      </Suspense>
    </div>
  );
}
