import { redirect } from "next/navigation";
import { SettingsLayout, type SettingsSection } from "@/components/settings/settings-layout";
import { ConnectedAppsSettings } from "@/components/settings/connected-apps-section";
import { IntegrationHeader } from "@/components/settings/integration-header";
import { UsersRolesSection } from "@/components/settings/users-roles-section";
import { GradientMesh, ConnectedNodes } from "@/components/settings/decorations";
import type { AppMode } from "@/lib/app-mode";
import { getAppMode } from "@/lib/server/tenant/context";
import type { Workspace } from "@/lib/db/schema";
import { WorkspaceProfileForm } from "./workspace-form";
import { getWorkspaceData } from "./actions";

function createSections(mode: AppMode, workspace: Workspace): SettingsSection[] {
  return [
  {
    id: "workspace-profile",
    title: "Workspace profile",
    description:
      "Update the details that represent your organisation across Splx.",
    content: <WorkspaceProfileForm workspace={workspace} />,
    headerDecoration: <GradientMesh />,
  },
  {
    id: "users-roles",
    title: "Users and roles",
    description:
      "Manage workspace members, send invitations, and assign roles.",
    content: <UsersRolesSection />,
    headerDecoration: <ConnectedNodes />,
  },
  {
    id: "connected-apps",
    title: "Connected apps",
    description:
      "Connect Splx to your data sources and AI providers. In local mode changes are written to .env.local, while hosted workspaces store credentials securely.",
    content: <ConnectedAppsSettings mode={mode} />,
    headerDecoration: <IntegrationHeader />,
  },
];
}

export default async function WorkplaceSettingsPage() {
  const mode = getAppMode();
  const workspace = await getWorkspaceData();

  if (!workspace) {
    redirect("/signin");
  }

  const sections = createSections(mode, workspace);

  return (
    <SettingsLayout
      title="Workplace Settings"
      description="Manage the identity, structure, and policies for your organisation."
      sections={sections}
    />
  );
}


