import { redirect } from "next/navigation";

export default function LegacyAutomationsListenersRedirect() {
  redirect("/automation/listeners");
}
