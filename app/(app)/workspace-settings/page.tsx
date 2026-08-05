import { redirect } from "next/navigation";
import { Suspense } from "react";
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
  ];
}

async function WorkplaceSettingsContent() {
  const mode = getAppMode();
  const workspace = await getWorkspaceData();

  if (!workspace) {
    redirect("/signin");
  }

  const sections = createSections(mode, workspace);

  return (
    <SettingsLayout
      description="Manage the identity, structure, and policies for your organisation."
      sections={sections}
      title="Workplace Settings"
    />
  );
}

export default function WorkplaceSettingsPage() {
  return (
    <Suspense fallback={<AppLoader label="Loading workspace settings" />}>
      <WorkplaceSettingsContent />
    </Suspense>
  );
}
