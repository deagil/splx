import { redirect } from "next/navigation";

export default function LegacyWorkflowsRedirect() {
  redirect("/automation/workflows");
}
