import { format } from "date-fns";

export type PermissionChange = {
  role_id: string;
  permission: string;
  action: "add" | "remove";
  description?: string;
};

export function generateMigrationSql(changes: PermissionChange[]): string {
  const timestamp = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
  const filenameTimestamp = format(new Date(), "yyyyMMddHHmmss");
  
  const additions = changes.filter((c) => c.action === "add");
  const removals = changes.filter((c) => c.action === "remove");

  let sql = `-- Migration: Update Role Permissions
-- Generated: ${timestamp}
-- Note: Review carefully before applying.

`;

  if (additions.length > 0) {
    sql += `-- ADD PERMISSIONS
INSERT INTO public.role_permissions (role_id, permission, description) VALUES
`;
    
    const values = additions.map((c) => {
      const desc = c.description ? `'${c.description.replace(/'/g, "''")}'` : 'NULL';
      return `  ('${c.role_id}', '${c.permission}', ${desc})`;
    });

    sql += values.join(",\n") + "\nON CONFLICT (role_id, permission) DO NOTHING;\n\n";
  }

  if (removals.length > 0) {
    sql += `-- REMOVE PERMISSIONS
-- Commented out for safety. Uncomment to apply.
`;
    
    removals.forEach((c) => {
      sql += `-- DELETE FROM public.role_permissions WHERE role_id = '${c.role_id}' AND permission = '${c.permission}';\n`;
    });
    sql += "\n";
  }

  sql += `-- SYNC REMINDER: Update lib/server/tenant/permissions.ts ROLE_CAPABILITIES to match these changes.\n`;

  return sql;
}

export function generateMigrationFilename(): string {
  const timestamp = format(new Date(), "yyyyMMddHHmmss");
  return `${timestamp}_update_permissions.sql`;
}
