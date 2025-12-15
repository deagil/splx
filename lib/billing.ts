import type { Workspace } from "@/lib/db/schema";

export function isProPlan(workspace: Workspace) {
  return workspace.plan === "plus" || workspace.plan === "pro";
}

export function canAccessAI(workspace: Workspace) {
  return isProPlan(workspace);
}

export function canAccessCharts(workspace: Workspace) {
  // Available on all plans
  return true;
}

export function canAddUnlimitedUsers(workspace: Workspace) {
  return isProPlan(workspace);
}
