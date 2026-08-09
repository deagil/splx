import { Suspense } from "react";
import { TemplateEditor } from "@/components/comms/template-editor";
import { AppLoader } from "@/components/shared/app-loader";

/**
 * No container, no page heading: the editor owns the whole frame and must not
 * scroll.
 *
 * The app shell (`components/sidebar/app-shell-main.tsx:23`) wraps this in
 * `flex-1 overflow-auto px-6 pb-6`, which already gives a definite height — no
 * `100vh` math needed. The negative margins cancel that padding so the editor
 * runs edge to edge, and the `+1.5rem` height makes up the 24px that `h-full`
 * loses to the parent's bottom padding.
 */
export default async function CommsTemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  return (
    <div className="-mx-6 -mb-6 h-[calc(100%+1.5rem)] min-h-0 overflow-hidden">
      <Suspense fallback={<AppLoader label="Loading template" />}>
        <TemplateEditor templateId={templateId} />
      </Suspense>
    </div>
  );
}
