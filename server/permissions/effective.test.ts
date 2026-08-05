import { describe, expect, it } from "vitest";
import {
  checkPermissionAgainstMap,
  resolveEffectivePermissions,
  type RolePermissionRow,
} from "./match";

const WS_A = "aaaaaaaa-0000-0000-0000-000000000001";
const WS_B = "bbbbbbbb-0000-0000-0000-000000000002";

/**
 * These cases mirror the SQL `effective_role_permissions()` helper exactly. If
 * the two disagree, the API and RLS disagree about what a role can do — so the
 * same scenarios are asserted here and against a real Postgres in the
 * migration's verification steps.
 */
const rows: RolePermissionRow[] = [
  // Global defaults.
  { role_id: "admin", permission: "*", workspace_id: null },
  { role_id: "builder", permission: "pages.view", workspace_id: null },
  { role_id: "builder", permission: "pages.edit", workspace_id: null },
  { role_id: "builder", permission: "data.delete", workspace_id: null },
  // Workspace A narrows builder and defines a custom role.
  { role_id: "builder", permission: "pages.view", workspace_id: WS_A },
  { role_id: "auditor", permission: "data.view", workspace_id: WS_A },
  { role_id: "auditor", permission: "reports.view", workspace_id: WS_A },
];

describe("resolveEffectivePermissions", () => {
  it("uses the global set for a role the workspace does not override", () => {
    const map = resolveEffectivePermissions(rows, WS_B);
    expect(map.builder.sort()).toEqual(
      ["data.delete", "pages.edit", "pages.view"].sort()
    );
  });

  it("replaces the global set entirely when the workspace overrides a role", () => {
    const map = resolveEffectivePermissions(rows, WS_A);
    // Override, not union: pages.edit and data.delete are gone.
    expect(map.builder).toEqual(["pages.view"]);
  });

  it("resolves a custom role that has no global rows at all", () => {
    // This is the bug the migration fixes: previously a custom role got
    // nothing from either source and was denied everything.
    const map = resolveEffectivePermissions(rows, WS_A);
    expect(map.auditor.sort()).toEqual(["data.view", "reports.view"]);
    expect(checkPermissionAgainstMap(map, ["auditor"], "data.view")).toBe(true);
  });

  it("does not leak one workspace's overrides into another", () => {
    const map = resolveEffectivePermissions(rows, WS_B);
    expect(map.auditor).toBeUndefined();
    expect(checkPermissionAgainstMap(map, ["auditor"], "data.view")).toBe(false);
  });

  it("leaves roles the workspace does not mention untouched", () => {
    const map = resolveEffectivePermissions(rows, WS_A);
    expect(map.admin).toEqual(["*"]);
    expect(checkPermissionAgainstMap(map, ["admin"], "anything.at.all")).toBe(
      true
    );
  });

  it("returns an empty map when there are no rows", () => {
    expect(resolveEffectivePermissions([], WS_A)).toEqual({});
  });

  it("restricts an overridden role in practice", () => {
    const a = resolveEffectivePermissions(rows, WS_A);
    const b = resolveEffectivePermissions(rows, WS_B);

    expect(checkPermissionAgainstMap(a, ["builder"], "data.delete")).toBe(false);
    expect(checkPermissionAgainstMap(b, ["builder"], "data.delete")).toBe(true);
  });
});
