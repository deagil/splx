import type { RLSPolicyGroup, RLSPolicyTemplate } from "../schema";

/**
 * Default RLS policy templates
 */
export const DEFAULT_RLS_POLICY_TEMPLATES: Record<string, RLSPolicyTemplate> = {
  private_delete: {
    description: "Only allow record owner to delete",
    expression: "created_by = auth.uid()",
    id: "private_delete",
    name: "Private Delete",
    policy_type: "delete",
  },
  private_insert: {
    description: "Only allow record owner to insert",
    expression: "created_by = auth.uid()",
    id: "private_insert",
    name: "Private Insert",
    policy_type: "insert",
    with_check_expression: "created_by = auth.uid()",
  },
  private_select: {
    description: "Only allow record owner to select",
    expression: "created_by = auth.uid()",
    id: "private_select",
    name: "Private Select",
    policy_type: "select",
  },
  private_update: {
    description: "Only allow record owner to update",
    expression: "created_by = auth.uid()",
    id: "private_update",
    name: "Private Update",
    policy_type: "update",
    with_check_expression: "created_by = auth.uid()",
  },
  public_select: {
    description: "Allow anyone to select records",
    expression: "true",
    id: "public_select",
    name: "Public Select",
    policy_type: "select",
  },
  role_based_delete: {
    description: "Allow users with specific roles to delete records",
    expression: "user_has_workspace_role(workspace_id, ARRAY['admin', 'dev'])",
    id: "role_based_delete",
    name: "Role-Based Delete",
    policy_type: "delete",
  },
  role_based_insert: {
    description: "Allow users with specific roles to insert records",
    expression: "user_has_workspace_role(workspace_id, ARRAY['admin', 'dev'])",
    id: "role_based_insert",
    name: "Role-Based Insert",
    policy_type: "insert",
    with_check_expression:
      "user_has_workspace_role(workspace_id, ARRAY['admin', 'dev'])",
  },
  role_based_select: {
    description: "Allow users with specific roles to select records",
    expression: "user_has_workspace_role(workspace_id, ARRAY['admin', 'dev'])",
    id: "role_based_select",
    name: "Role-Based Select",
    policy_type: "select",
  },
  role_based_update: {
    description: "Allow users with specific roles to update records",
    expression: "user_has_workspace_role(workspace_id, ARRAY['admin', 'dev'])",
    id: "role_based_update",
    name: "Role-Based Update",
    policy_type: "update",
    with_check_expression:
      "user_has_workspace_role(workspace_id, ARRAY['admin', 'dev'])",
  },
  workspace_member_delete: {
    description: "Allow workspace members to delete records",
    expression: "user_is_workspace_member(workspace_id)",
    id: "workspace_member_delete",
    name: "Workspace Member Delete",
    policy_type: "delete",
  },
  workspace_member_insert: {
    description: "Allow workspace members to insert records",
    expression: "user_is_workspace_member(workspace_id)",
    id: "workspace_member_insert",
    name: "Workspace Member Insert",
    policy_type: "insert",
    with_check_expression: "user_is_workspace_member(workspace_id)",
  },
  workspace_member_select: {
    description: "Allow workspace members to select records",
    expression: "user_is_workspace_member(workspace_id)",
    id: "workspace_member_select",
    name: "Workspace Member Select",
    policy_type: "select",
  },
  workspace_member_update: {
    description: "Allow workspace members to update records",
    expression: "user_is_workspace_member(workspace_id)",
    id: "workspace_member_update",
    name: "Workspace Member Update",
    policy_type: "update",
    with_check_expression: "user_is_workspace_member(workspace_id)",
  },
};

/**
 * Default RLS policy groups
 */
export const DEFAULT_RLS_POLICY_GROUPS: Record<string, RLSPolicyGroup> = {
  private_full: {
    description: "Full access only for record owners",
    id: "private_full",
    name: "Private Full Access",
    policies: [
      DEFAULT_RLS_POLICY_TEMPLATES.private_select,
      DEFAULT_RLS_POLICY_TEMPLATES.private_insert,
      DEFAULT_RLS_POLICY_TEMPLATES.private_update,
      DEFAULT_RLS_POLICY_TEMPLATES.private_delete,
    ],
  },
  public_readonly: {
    description: "Public read access, no write access",
    id: "public_readonly",
    name: "Public Read-Only",
    policies: [DEFAULT_RLS_POLICY_TEMPLATES.public_select],
  },
  role_based_full: {
    description: "Full CRUD access for specific roles",
    id: "role_based_full",
    name: "Role-Based Full Access",
    policies: [
      DEFAULT_RLS_POLICY_TEMPLATES.role_based_select,
      DEFAULT_RLS_POLICY_TEMPLATES.role_based_insert,
      DEFAULT_RLS_POLICY_TEMPLATES.role_based_update,
      DEFAULT_RLS_POLICY_TEMPLATES.role_based_delete,
    ],
  },
  workspace_member_full: {
    description: "Full CRUD access for workspace members",
    id: "workspace_member_full",
    name: "Workspace Member Full Access",
    policies: [
      DEFAULT_RLS_POLICY_TEMPLATES.workspace_member_select,
      DEFAULT_RLS_POLICY_TEMPLATES.workspace_member_insert,
      DEFAULT_RLS_POLICY_TEMPLATES.workspace_member_update,
      DEFAULT_RLS_POLICY_TEMPLATES.workspace_member_delete,
    ],
  },
  workspace_member_readonly: {
    description: "Read-only access for workspace members",
    id: "workspace_member_readonly",
    name: "Workspace Member Read-Only",
    policies: [DEFAULT_RLS_POLICY_TEMPLATES.workspace_member_select],
  },
};

/**
 * Gets a default policy template by ID
 */
export function getDefaultPolicyTemplate(
  templateId: string
): RLSPolicyTemplate | null {
  return DEFAULT_RLS_POLICY_TEMPLATES[templateId] ?? null;
}

/**
 * Gets all default policy templates
 */
export function getAllDefaultPolicyTemplates(): RLSPolicyTemplate[] {
  return Object.values(DEFAULT_RLS_POLICY_TEMPLATES);
}

/**
 * Gets a default policy group by ID
 */
export function getDefaultPolicyGroup(groupId: string): RLSPolicyGroup | null {
  return DEFAULT_RLS_POLICY_GROUPS[groupId] ?? null;
}

/**
 * Gets all default policy groups
 */
export function getAllDefaultPolicyGroups(): RLSPolicyGroup[] {
  return Object.values(DEFAULT_RLS_POLICY_GROUPS);
}

/**
 * Creates a custom policy group from template IDs
 */
export function createPolicyGroupFromTemplates(
  id: string,
  name: string,
  description: string | undefined,
  templateIds: string[]
): RLSPolicyGroup {
  const policies = templateIds
    .map((templateId) => getDefaultPolicyTemplate(templateId))
    .filter((template): template is RLSPolicyTemplate => template !== null);

  return {
    description,
    id,
    name,
    policies,
  };
}
