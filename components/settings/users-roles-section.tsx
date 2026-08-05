"use client";

import { Mail, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkspaceUser {
  created_at: string;
  id: string;
  role_id: string;
  user_id: string;
  users: {
    id: string;
    email: string;
    firstname: string | null;
    lastname: string | null;
    avatar_url: string | null;
    job_title: string | null;
  };
}

interface Role {
  description: string | null;
  id: string;
  label: string;
  level: number;
  workspace_id: string;
}

interface Invite {
  created_at: string;
  email: string;
  id: string;
  invited_by: string;
  roles: string[];
  users: {
    id: string;
    email: string;
    firstname: string | null;
    lastname: string | null;
  };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function UsersRolesSection() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: usersData, error: usersError } = useSWR<{
    users: WorkspaceUser[];
  }>("/api/workspace/users", fetcher);

  const { data: rolesData, error: rolesError } = useSWR<{ roles: Role[] }>(
    "/api/workspace/roles",
    fetcher
  );

  const { data: invitesData } = useSWR<{ invites: Invite[] }>(
    "/api/workspace/invites",
    fetcher
  );

  const users = usersData?.users || [];
  const roles = rolesData?.roles || [];
  const invites = invitesData?.invites || [];

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail || !inviteRole) {
      toast.error("Please enter an email and select a role");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/workspace/invites", {
        body: JSON.stringify({ email: inviteEmail, roleId: inviteRole }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to invite user");
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("");
      mutate("/api/workspace/invites");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to invite user"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (
    workspaceUserId: string,
    newRoleId: string
  ) => {
    try {
      const response = await fetch("/api/workspace/users", {
        body: JSON.stringify({ roleId: newRoleId, workspaceUserId }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      toast.success("Role updated successfully");
      mutate("/api/workspace/users");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      );
    }
  };

  const handleRemoveUser = async (workspaceUserId: string) => {
    if (
      !confirm("Are you sure you want to remove this user from the workspace?")
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/workspace/users?id=${workspaceUserId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove user");
      }

      toast.success("User removed successfully");
      mutate("/api/workspace/users");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove user"
      );
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/workspace/invites?id=${inviteId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel invite");
      }

      toast.success("Invitation cancelled");
      mutate("/api/workspace/invites");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel invite"
      );
    }
  };

  const getInitials = (
    firstname: string | null,
    lastname: string | null,
    email: string
  ) => {
    if (firstname && lastname) {
      return `${firstname[0]}${lastname[0]}`.toUpperCase();
    }
    if (firstname) {
      return firstname.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getRoleLabel = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.label || roleId;
  };

  const getRoleLevel = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.level || 0;
  };

  const getRoleColor = (roleId: string) => {
    const roleLower = roleId.toLowerCase();
    if (roleLower === "admin" || roleLower === "owner") {
      return "border-l-red-500";
    }
    if (
      roleLower === "builder" ||
      roleLower === "dev" ||
      roleLower === "developer"
    ) {
      return "border-l-orange-500";
    }
    if (
      roleLower === "user" ||
      roleLower === "staff" ||
      roleLower === "member"
    ) {
      return "border-l-blue-500";
    }
    return "border-l-border";
  };

  // Sort users by role level (highest to lowest)
  const sortedUsers = [...users].sort((a, b) => {
    const levelA = getRoleLevel(a.role_id);
    const levelB = getRoleLevel(b.role_id);
    return levelB - levelA; // Descending order
  });

  if (usersError || rolesError) {
    return (
      <div className="text-destructive">
        Failed to load workspace users or roles
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Invite new user section */}
      <form className="space-y-6" onSubmit={handleInviteUser}>
        <FieldGroup>
          <div className="flex items-end gap-4">
            <Field className="flex-1">
              <FieldLabel htmlFor="invite-email">
                Invite user by email
              </FieldLabel>
              <Input
                id="invite-email"
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                type="email"
                value={inviteEmail}
              />
            </Field>
            <Field className="w-48">
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <Select onValueChange={setInviteRole} value={inviteRole}>
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button disabled={isSubmitting} type="submit">
              <UserPlus className="mr-2 h-4 w-4" />
              Send invite
            </Button>
          </div>
          <FieldDescription>
            Send an invitation to join this workspace with the selected role.
          </FieldDescription>
        </FieldGroup>
      </form>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Pending invitations</h3>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                key={invite.id}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{invite.email}</p>
                    <p className="text-muted-foreground text-xs">
                      Invited by {invite.users.firstname || invite.users.email}{" "}
                      • {getRoleLabel(invite.roles[0])}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleCancelInvite(invite.id)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workspace members list */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Workspace members</h3>
        <div className="space-y-2">
          {sortedUsers.map((workspaceUser) => (
            <div
              className={`flex items-center justify-between rounded-lg border border-l-4 bg-card p-3 ${getRoleColor(workspaceUser.role_id)}`}
              key={workspaceUser.id}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={workspaceUser.users.avatar_url || undefined}
                  />
                  <AvatarFallback>
                    {getInitials(
                      workspaceUser.users.firstname,
                      workspaceUser.users.lastname,
                      workspaceUser.users.email
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {workspaceUser.users.firstname &&
                    workspaceUser.users.lastname
                      ? `${workspaceUser.users.firstname} ${workspaceUser.users.lastname}`
                      : workspaceUser.users.email}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {workspaceUser.users.email}
                    {!!workspaceUser.users.job_title &&
                      ` • ${workspaceUser.users.job_title}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(value) =>
                    handleUpdateRole(workspaceUser.id, value)
                  }
                  value={workspaceUser.role_id}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => handleRemoveUser(workspaceUser.id)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
