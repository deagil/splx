import { redirect } from "next/navigation";

export default function LegacyCommsSettingsRedirect() {
  redirect("/workspace-settings?section=email");
}
