import { describe, expect, it } from "vitest";
import { DEFAULT_ROLE_PERMISSIONS } from "./definitions";
import { checkPermissionAgainstMap, permissionMatches } from "./match";

const staticMap: Record<string, string[]> = Object.fromEntries(
  Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, permissions]) => [
    role,
    [...permissions],
  ])
);

describe("permissionMatches", () => {
  it("grants everything for the bare wildcard", () => {
    expect(permissionMatches("*", "data.delete")).toBe(true);
    expect(permissionMatches("*", "anything.at.all")).toBe(true);
  });

  it("matches exact permissions", () => {
    expect(permissionMatches("pages.edit", "pages.edit")).toBe(true);
    expect(permissionMatches("pages.edit", "pages.view")).toBe(false);
  });

  it("expands resource wildcards", () => {
    expect(permissionMatches("data.*", "data.create")).toBe(true);
    expect(permissionMatches("data.*", "data.delete")).toBe(true);
    expect(permissionMatches("data.*", "pages.view")).toBe(false);
  });

  it("does not let a resource wildcard leak across resources with a shared prefix", () => {
    // "data.*" must not grant "database.view"
    expect(permissionMatches("data.*", "database.view")).toBe(false);
  });

  it("does not treat a partial string as a match", () => {
    expect(permissionMatches("pages.view", "pages.viewer")).toBe(false);
    expect(permissionMatches("pages.view", "pages")).toBe(false);
  });
});

describe("checkPermissionAgainstMap", () => {
  it("denies unknown roles rather than defaulting open", () => {
    expect(
      checkPermissionAgainstMap(staticMap, ["nonexistent"], "pages.view")
    ).toBe(false);
    expect(checkPermissionAgainstMap(staticMap, [], "pages.view")).toBe(false);
  });

  it("grants admin everything via the wildcard", () => {
    for (const permission of [
      "pages.edit",
      "data.delete",
      "workspace.billing",
      "workspace.manage",
      "reports.edit",
    ]) {
      expect(checkPermissionAgainstMap(staticMap, ["admin"], permission)).toBe(
        true
      );
    }
  });

  it("grants builder the reports and chat permissions the old static map omitted", () => {
    // Regression: the previous ROLE_CAPABILITIES map had no reports.* or chat.*
    // entries, so these returned false while the DB and RLS both granted them.
    expect(
      checkPermissionAgainstMap(staticMap, ["builder"], "reports.view")
    ).toBe(true);
    expect(
      checkPermissionAgainstMap(staticMap, ["builder"], "reports.edit")
    ).toBe(true);
    expect(
      checkPermissionAgainstMap(staticMap, ["builder"], "chat.create")
    ).toBe(true);
  });

  it("keeps viewer read-only", () => {
    expect(checkPermissionAgainstMap(staticMap, ["viewer"], "data.view")).toBe(
      true
    );
    expect(
      checkPermissionAgainstMap(staticMap, ["viewer"], "data.create")
    ).toBe(false);
    expect(checkPermissionAgainstMap(staticMap, ["viewer"], "data.edit")).toBe(
      false
    );
    expect(
      checkPermissionAgainstMap(staticMap, ["viewer"], "data.delete")
    ).toBe(false);
    expect(checkPermissionAgainstMap(staticMap, ["viewer"], "pages.edit")).toBe(
      false
    );
  });

  it("does not grant non-admins workspace administration", () => {
    for (const role of ["builder", "user", "viewer"]) {
      expect(
        checkPermissionAgainstMap(staticMap, [role], "workspace.users")
      ).toBe(false);
      expect(
        checkPermissionAgainstMap(staticMap, [role], "workspace.billing")
      ).toBe(false);
      expect(
        checkPermissionAgainstMap(staticMap, [role], "workspace.manage")
      ).toBe(false);
    }
  });

  it("canonicalises the permission strings routes gated on but nothing granted", () => {
    // /api/data/[tableName]/schema gated on "data.read", which existed in
    // neither the static map nor role_permissions, so every non-admin got 403.
    expect(checkPermissionAgainstMap(staticMap, ["viewer"], "data.read")).toBe(
      true
    );
    expect(checkPermissionAgainstMap(staticMap, ["user"], "data.update")).toBe(
      true
    );
    expect(
      checkPermissionAgainstMap(staticMap, ["viewer"], "data.update")
    ).toBe(false);
  });

  it("takes the union across multiple roles", () => {
    expect(
      checkPermissionAgainstMap(staticMap, ["viewer", "builder"], "pages.edit")
    ).toBe(true);
  });
});
