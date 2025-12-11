import type { TenantContext } from "./context";

const ROLE_CAPABILITIES: Record<string, readonly string[]> = {
  admin: [
    "*",
    "pages.view",
    "pages.edit",
    "tables.view",
    "tables.edit",
    "data.view",
    "data.create",
    "data.edit",
    "data.delete",
  ],
  builder: [
    "pages.view",
    "pages.edit",
    "tables.view",
    "tables.edit",
    "data.view",
    "data.create",
    "data.edit",
    "data.delete",
  ],
  user: [
    "pages.view",
    "tables.view",
    "data.view",
    "data.create",
    "data.edit",
    "data.delete",
  ],
  viewer: ["pages.view", "tables.view", "data.view"],
};

export function hasCapability(
  tenant: TenantContext,
  capability: string,
): boolean {
  return tenant.roles.some((role) => {
    const capabilities = ROLE_CAPABILITIES[role] ?? [];
    return capabilities.includes("*") || capabilities.includes(capability);
  });
}

export function requireCapability(
  tenant: TenantContext,
  capability: string,
): void {
  if (!hasCapability(tenant, capability)) {
    throw new Error("Forbidden");
  }
}
