import { redirect } from "next/navigation";

export default function LegacyEventsRedirect() {
  redirect("/automation/events");
}
