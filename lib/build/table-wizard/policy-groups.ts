import type { RLSPolicyGroup } from "@/lib/server/tables/schema";

/**
 * Client-safe policy groups for the wizard
 * These match the default policy groups from the server
 */
export const DEFAULT_POLICY_GROUPS: RLSPolicyGroup[] = [
  {
    description: "Full CRUD access for workspace members",
    id: "workspace_member_full",
    name: "Workspace Member Full Access",
    policies: [
      {
        description: "Allow workspace members to select records",
        expression: "user_is_workspace_member(workspace_id)",
        id: "workspace_member_select",
        name: "Workspace Member Select",
        policy_type: "select",
      },
      {
        description: "Allow workspace members to insert records",
        expression: "user_is_workspace_member(workspace_id)",
        id: "workspace_member_insert",
        name: "Workspace Member Insert",
        policy_type: "insert",
        with_check_expression: "user_is_workspace_member(workspace_id)",
      },
      {
        description: "Allow workspace members to update records",
        expression: "user_is_workspace_member(workspace_id)",
        id: "workspace_member_update",
        name: "Workspace Member Update",
        policy_type: "update",
        with_check_expression: "user_is_workspace_member(workspace_id)",
      },
      {
        description: "Allow workspace members to delete records",
        expression: "user_is_workspace_member(workspace_id)",
        id: "workspace_member_delete",
        name: "Workspace Member Delete",
        policy_type: "delete",
      },
    ],
  },
  {
    description: "Read-only access for workspace members",
    id: "workspace_member_readonly",
    name: "Workspace Member Read-Only",
    policies: [
      {
        description: "Allow workspace members to select records",
        expression: "user_is_workspace_member(workspace_id)",
        id: "workspace_member_select",
        name: "Workspace Member Select",
        policy_type: "select",
      },
    ],
  },
  {
    description: "Full CRUD access for specific roles",
    id: "role_based_full",
    name: "Role-Based Full Access",
    policies: [
      {
        description: "Allow users with specific roles to select records",
        expression:
          "user_has_workspace_role(workspace_id, ARRAY['admin', 'dev'])",
        id: "role_based_select",
        name: "Role-Based Select",
        policy_type: "select",
      },
      {
        description: "Allow users with specific roles to insert records",
        expression:
          "user_has_workspace_role(workspace_id, ARRAY['admin', 'dev'])",
        id: "role_based_insert",
        name: "Role-Based Insert",
        policy_type: "insert",
        with_check_expression:
          "user_has_workspace_role(workspace_id, ARRAY['admin', 'dev'])",
      },
      {
        description: "Allow users with specific roles to update records",
        expression:
          "user_has_workspace_role(workspace_id, ARRAY['admin', 'dev'])",
        id: "role_based_update",
        name: "Role-Based Update",
        policy_type: "update",
        with_check_expression:
          "user_has_workspace_role(workspace_id, ARRAY['admin', 'dev'])",
      },
      {
        description: "Allow users with specific roles to delete records",
        expression:
          "user_has_workspace_role(workspace_id, ARRAY['admin', 'dev'])",
        id: "role_based_delete",
        name: "Role-Based Delete",
        policy_type: "delete",
      },
    ],
  },
  {
    description: "Public read access, no write access",
    id: "public_readonly",
    name: "Public Read-Only",
    policies: [
      {
        description: "Allow anyone to select records",
        expression: "true",
        id: "public_select",
        name: "Public Select",
        policy_type: "select",
      },
    ],
  },
  {
    description: "Full access only for record owners",
    id: "private_full",
    name: "Private Full Access",
    policies: [
      {
        description: "Only allow record owner to select",
        expression: "created_by = auth.uid()",
        id: "private_select",
        name: "Private Select",
        policy_type: "select",
      },
      {
        description: "Only allow record owner to insert",
        expression: "created_by = auth.uid()",
        id: "private_insert",
        name: "Private Insert",
        policy_type: "insert",
        with_check_expression: "created_by = auth.uid()",
      },
      {
        description: "Only allow record owner to update",
        expression: "created_by = auth.uid()",
        id: "private_update",
        name: "Private Update",
        policy_type: "update",
        with_check_expression: "created_by = auth.uid()",
      },
      {
        description: "Only allow record owner to delete",
        expression: "created_by = auth.uid()",
        id: "private_delete",
        name: "Private Delete",
        policy_type: "delete",
      },
    ],
  },
];
