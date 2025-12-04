import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/workspace/invites
 * List all pending invites for the workspace
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

  // Fetch all pending invites (not accepted)
  const { data: invites, error } = await supabase
    .from("workspace_invites")
    .select("id, email, roles, created_at, invited_by")
    .eq("workspace_id", workspaceId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!invites || invites.length === 0) {
    return NextResponse.json({ invites: [] });
  }

  // Fetch inviter user details
  const inviterIds = [...new Set(invites.map((inv) => inv.invited_by))];
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("id, email, firstname, lastname")
    .in("id", inviterIds);

  if (usersError) {
    console.error("Error fetching inviter data:", usersError);
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  // Combine the data
  const usersMap = new Map(usersData?.map((u) => [u.id, u]) || []);
  const combinedInvites = invites.map((inv) => ({
    ...inv,
    users: usersMap.get(inv.invited_by) || null,
  }));

  return NextResponse.json({ invites: combinedInvites });
}

/**
 * POST /api/workspace/invites
 * Create a new workspace invite
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { email, roleId } = body;

  if (!email || !roleId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Get workspace_id
  const { data: workspaceUserData, error: workspaceUserError } = await supabase
    .from("workspace_users")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (workspaceUserError || !workspaceUserData) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const workspaceId = workspaceUserData.workspace_id;

  // Check if user is already in workspace
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existingUser) {
    const { data: existingMember } = await supabase
      .from("workspace_users")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", existingUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this workspace" },
        { status: 400 }
      );
    }
  }

  // Create the invite
  const { data: invite, error: inviteError } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      email,
      roles: [roleId],
      invited_by: user.id,
    })
    .select()
    .single();

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  // TODO: Send invitation email here

  return NextResponse.json({ invite });
}

/**
 * DELETE /api/workspace/invites
 * Cancel/revoke a workspace invite
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const inviteId = searchParams.get("id");

  if (!inviteId) {
    return NextResponse.json(
      { error: "Missing invite ID" },
      { status: 400 }
    );
  }

  // Get workspace_id
  const { data: workspaceUserData, error: workspaceUserError } = await supabase
    .from("workspace_users")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (workspaceUserError || !workspaceUserData) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Delete the invite
  const { error: deleteError } = await supabase
    .from("workspace_invites")
    .delete()
    .eq("id", inviteId)
    .eq("workspace_id", workspaceUserData.workspace_id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
