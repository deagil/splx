import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CommsSettingsView } from "@/components/comms/settings-view";
import { ConnectedAppsSettings } from "@/components/settings/connected-apps-section";
import {
  ConnectedNodes,
  GradientMesh,
} from "@/components/settings/decorations";
import { IntegrationHeader } from "@/components/settings/integration-header";
import {
  SettingsLayout,
  type SettingsSection,
} from "@/components/settings/settings-layout";
import { UsersRolesSection } from "@/components/settings/users-roles-section";
import { AppLoader } from "@/components/shared/app-loader";
import type { AppMode } from "@/lib/app-mode";
import type { Workspace } from "@/lib/db/schema";
import { getAppMode } from "@/lib/server/tenant/context";
import { getWorkspaceData } from "./actions";
import { WorkspaceProfileForm } from "./workspace-form";

function createSections(
  mode: AppMode,
  workspace: Workspace
): SettingsSection[] {
  return [
    {
      content: <WorkspaceProfileForm workspace={workspace} />,
      description:
        "Update the details that represent your organisation across Splx.",
      headerDecoration: <GradientMesh />,
      id: "workspace-profile",
      title: "Workspace profile",
    },
    {
      content: <UsersRolesSection />,
      description:
        "Manage workspace members, send invitations, and assign roles.",
      headerDecoration: <ConnectedNodes />,
      id: "users-roles",
      title: "Users and roles",
    },
    {
      content: <ConnectedAppsSettings mode={mode} />,
      description:
        "Connect Splx to your data sources and AI providers. In local mode changes are written to .env.local, while hosted workspaces store credentials securely.",
      headerDecoration: <IntegrationHeader />,
      id: "connected-apps",
      title: "Connected apps",
    },
    {
      content: <CommsSettingsView />,
      description:
        "From address used for outbound email. Domain verification is managed in your email provider (Resend).",
      id: "email",
      title: "Email",
    },
  ];
}

async function WorkplaceSettingsContent({ section }: { section?: string }) {
  const mode = getAppMode();
  const workspace = await getWorkspaceData();

  if (!workspace) {
    redirect("/signin");
  }

  const sections = createSections(mode, workspace);

  return (
    <SettingsLayout
      description="Manage the identity, structure, and policies for your organisation."
      initialSectionId={section}
      sections={sections}
      title="Workplace Settings"
    />
  );
}

export default async function WorkplaceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={<AppLoader label="Loading workspace settings" />}>
      <WorkplaceSettingsContent section={params.section} />
    </Suspense>
  );
}
