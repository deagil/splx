import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import type { TableRecord } from "@/lib/server/tables/types";
import { ApiError } from "@/server/api/responses";
import {
  buildDelete,
  buildInsert,
  buildUpdate,
  parseOrderDirection,
  parsePagination,
  type ResolvedTable,
} from "./data";

const dialect = new PgDialect();

function compile(query: ReturnType<typeof buildInsert>) {
  const { sql, params } = dialect.sqlToQuery(query);
  return { sql, params };
}

// Only the fields the SQL builders actually read are populated.
const contactsTable: ResolvedTable = {
  config: { id: "contacts", name: "contacts", config: {} } as TableRecord,
  physicalName: "contacts",
  columns: ["id", "name", "qty", "notes", "workspace_id"],
  primaryKey: "id",
  hasWorkspaceColumn: true,
};

const noWorkspaceTable: ResolvedTable = {
  ...contactsTable,
  columns: ["id", "name", "qty", "notes"],
  hasWorkspaceColumn: false,
};

/**
 * The payload that exploited the old route. `typeof value === "object"` fell
 * through to `String(value)` and was spliced into `sql.raw()` unquoted.
 */
const INJECTION = ["1); DROP TABLE contacts; --"];
const INJECTION_STRING = "1); DROP TABLE contacts; --";

describe("buildInsert", () => {
  it("binds values as parameters instead of interpolating them", () => {
    const { sql, params } = compile(
      buildInsert(contactsTable, { name: "Ada", qty: 7 }, "ws-1")
    );

    expect(sql).not.toContain("Ada");
    expect(params).toContain("Ada");
    expect(params).toContain(7);
  });

  it("does not splice an array-valued injection payload into the statement", () => {
    const { sql, params } = compile(
      buildInsert(contactsTable, { qty: INJECTION }, "ws-1")
    );

    expect(sql).not.toContain("DROP TABLE");
    expect(sql.toLowerCase()).not.toContain("drop");
    // It survives as a bound parameter, serialised for jsonb columns.
    expect(params).toContain(JSON.stringify(INJECTION));
  });

  it("does not splice a string injection payload into the statement", () => {
    const { sql, params } = compile(
      buildInsert(contactsTable, { name: INJECTION_STRING }, "ws-1")
    );

    expect(sql).not.toContain("DROP TABLE");
    expect(params).toContain(INJECTION_STRING);
  });

  it("quotes the table and column identifiers", () => {
    const { sql } = compile(buildInsert(contactsTable, { name: "Ada" }, "ws-1"));
    expect(sql).toContain('"contacts"');
    expect(sql).toContain('"name"');
  });

  it("sets workspace_id itself when the column exists", () => {
    const { params } = compile(
      buildInsert(contactsTable, { name: "Ada" }, "ws-1")
    );
    expect(params).toContain("ws-1");
  });

  it("omits workspace_id when the physical table has no such column", () => {
    const { sql, params } = compile(
      buildInsert(noWorkspaceTable, { name: "Ada" }, "ws-1")
    );
    expect(sql).not.toContain("workspace_id");
    expect(params).not.toContain("ws-1");
  });

  it("rejects columns that do not exist on the table", () => {
    expect(() =>
      buildInsert(contactsTable, { name: "Ada", is_admin: true }, "ws-1")
    ).toThrow(ApiError);

    expect(() =>
      buildInsert(contactsTable, { name: "Ada", is_admin: true }, "ws-1")
    ).toThrow(/is_admin/);
  });

  it("refuses a caller-supplied workspace_id", () => {
    // Otherwise a caller could write rows into another workspace on a shared
    // physical table.
    expect(() =>
      buildInsert(contactsTable, { name: "Ada", workspace_id: "ws-2" }, "ws-1")
    ).toThrow(/managed by the server/);
  });

  it("rejects an empty body", () => {
    expect(() => buildInsert(contactsTable, {}, "ws-1")).toThrow(
      /at least one field/
    );
  });
});

describe("buildUpdate", () => {
  it("binds values and the record id as parameters", () => {
    const { sql, params } = compile(
      buildUpdate(contactsTable, "rec-1", { name: "Grace" }, "ws-1")
    );

    expect(sql).not.toContain("Grace");
    expect(params).toContain("Grace");
    expect(params).toContain("rec-1");
  });

  it("does not splice an injection payload into the SET clause", () => {
    const { sql } = compile(
      buildUpdate(contactsTable, "rec-1", { qty: INJECTION }, "ws-1")
    );
    expect(sql).not.toContain("DROP TABLE");
  });

  it("scopes the update by workspace when the column exists", () => {
    const { sql, params } = compile(
      buildUpdate(contactsTable, "rec-1", { name: "Grace" }, "ws-1")
    );
    expect(sql).toContain("workspace_id");
    expect(params).toContain("ws-1");
  });

  it("omits the workspace predicate when the column does not exist", () => {
    const { sql } = compile(
      buildUpdate(noWorkspaceTable, "rec-1", { name: "Grace" }, "ws-1")
    );
    expect(sql).not.toContain("workspace_id");
  });

  it("rejects an empty body rather than producing invalid SQL", () => {
    // The old route threw a bare Error here, which surfaced as a 500.
    expect(() => buildUpdate(contactsTable, "rec-1", {}, "ws-1")).toThrow(
      ApiError
    );
  });
});

describe("buildDelete", () => {
  it("binds the record id and scopes by workspace", () => {
    const { sql, params } = compile(
      buildDelete(contactsTable, "rec-1", "ws-1")
    );

    expect(params).toContain("rec-1");
    expect(params).toContain("ws-1");
    expect(sql).toContain("workspace_id");
    expect(sql).toContain("RETURNING");
  });

  it("does not interpolate the record id", () => {
    const { sql } = compile(
      buildDelete(contactsTable, INJECTION_STRING, "ws-1")
    );
    expect(sql).not.toContain("DROP TABLE");
  });
});

describe("parsePagination", () => {
  it("applies defaults", () => {
    expect(parsePagination(new URLSearchParams())).toEqual({
      limit: 100,
      offset: 0,
    });
  });

  it("accepts valid values", () => {
    expect(parsePagination(new URLSearchParams("limit=25&offset=50"))).toEqual({
      limit: 25,
      offset: 50,
    });
  });

  it("rejects non-numeric input instead of emitting LIMIT NaN", () => {
    // The old route ran Number.parseInt and interpolated the result, so
    // ?limit=abc produced "LIMIT NaN" and a 500 from Postgres.
    expect(() => parsePagination(new URLSearchParams("limit=abc"))).toThrow(
      ApiError
    );
    expect(() => parsePagination(new URLSearchParams("offset=abc"))).toThrow(
      ApiError
    );
  });

  it("rejects out-of-range values", () => {
    expect(() => parsePagination(new URLSearchParams("limit=0"))).toThrow();
    expect(() => parsePagination(new URLSearchParams("limit=100000"))).toThrow();
    expect(() => parsePagination(new URLSearchParams("offset=-1"))).toThrow();
  });
});

describe("parseOrderDirection", () => {
  it("defaults to asc and accepts both directions", () => {
    expect(parseOrderDirection(null)).toBe("asc");
    expect(parseOrderDirection("asc")).toBe("asc");
    expect(parseOrderDirection("desc")).toBe("desc");
  });

  it("rejects anything else rather than casting it through", () => {
    expect(() => parseOrderDirection("; DROP TABLE contacts")).toThrow(ApiError);
  });
});
