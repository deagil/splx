import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/workspace/users
 * List all users in the workspace with their roles
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get workspace_id from workspace_users table
  const { data: workspaceUserData, error: workspaceUserError } = await supabase
    .from("workspace_users")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (workspaceUserError || !workspaceUserData) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const workspaceId = workspaceUserData.workspace_id;

  // Fetch all workspace users
  const { data: workspaceUsers, error } = await supabase
    .from("workspace_users")
    .select("id, role_id, created_at, user_id")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workspace users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!workspaceUsers || workspaceUsers.length === 0) {
    return NextResponse.json({ users: [] });
  }

  // Fetch user details from public.users table
  const userIds = workspaceUsers.map((wu) => wu.user_id);
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("id, email, firstname, lastname, avatar_url, job_title")
    .in("id", userIds);

  if (usersError) {
    console.error("Error fetching users data:", usersError);
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  // Combine the data
  const usersMap = new Map(usersData?.map((u) => [u.id, u]) || []);
  const combinedUsers = workspaceUsers.map((wu) => ({
    ...wu,
    users: usersMap.get(wu.user_id) || null,
  }));

  return NextResponse.json({ users: combinedUsers });
}

/**
 * PATCH /api/workspace/users
 * Update a user's role in the workspace
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { workspaceUserId, roleId } = body;

  if (!workspaceUserId || !roleId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Get workspace_id and check permissions
  const { data: currentUserWorkspace, error: currentUserError } = await supabase
    .from("workspace_users")
    .select("workspace_id, role_id")
    .eq("user_id", user.id)
    .single();

  if (currentUserError || !currentUserWorkspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // TODO: Add proper RBAC check here to ensure user has permission to update roles
  // For now, we'll allow the update

  // Update the user's role
  const { error: updateError } = await supabase
    .from("workspace_users")
    .update({ role_id: roleId, updated_at: new Date().toISOString() })
    .eq("id", workspaceUserId)
    .eq("workspace_id", currentUserWorkspace.workspace_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/workspace/users
 * Remove a user from the workspace
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceUserId = searchParams.get("id");

  if (!workspaceUserId) {
    return NextResponse.json(
      { error: "Missing workspace user ID" },
      { status: 400 }
    );
  }

  // Get workspace_id and check permissions
  const { data: currentUserWorkspace, error: currentUserError } = await supabase
    .from("workspace_users")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (currentUserError || !currentUserWorkspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Delete the workspace user
  const { error: deleteError } = await supabase
    .from("workspace_users")
    .delete()
    .eq("id", workspaceUserId)
    .eq("workspace_id", currentUserWorkspace.workspace_id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
