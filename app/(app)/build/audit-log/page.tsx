import { Suspense } from "react";
import { AuditLogView } from "@/components/build/audit-log-view";
import { AppLoader } from "@/components/shared/app-loader";
import { requireDevAccess } from "../dev-access";

async function AuditLogPageContent() {
  const denied = await requireDevAccess();
  if (denied) {
    return denied;
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="font-bold text-3xl tracking-tight">Audit Log</h1>
        <p className="mt-2 text-muted-foreground">
          Every mutation made through the API control plane, newest first.
          Select a row to see the full change payload.
        </p>
      </div>

      {/* useSearchParams needs a Suspense boundary during prerender. */}
      <Suspense fallback={null}>
        <AuditLogView />
      </Suspense>
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={<AppLoader label="Loading audit log" />}>
      <AuditLogPageContent />
    </Suspense>
  );
}
