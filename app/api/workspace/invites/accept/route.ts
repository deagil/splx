import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/workspace/invites/accept?code={invite_id}
 * Accept a workspace invitation
 *
 * The invite acceptance trigger (accept_workspace_invite) will automatically
 * create the workspace_users entries with the roles specified in the invite.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get invite code from query params
  const { searchParams } = new URL(request.url);
  const inviteCode = searchParams.get("code");

  if (!inviteCode) {
    return NextResponse.json(
      { error: "Missing invite code" },
      { status: 400 }
    );
  }

  // Fetch the invite
  const { data: invite, error: inviteError } = await supabase
    .from("workspace_invites")
    .select("id, workspace_id, roles, email, accepted_at")
    .eq("id", inviteCode)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json(
      { error: "Invalid invite code" },
      { status: 404 }
    );
  }

  // Check if already accepted
  if (invite.accepted_at) {
    return NextResponse.json(
      { error: "Invite has already been accepted" },
      { status: 400 }
    );
  }

  // Optionally verify email matches (if invite was sent to specific email)
  if (invite.email && invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "This invite was sent to a different email address" },
      { status: 403 }
    );
  }

  // Check if user is already a member of this workspace
  const { data: existingMember } = await supabase
    .from("workspace_users")
    .select("id")
    .eq("workspace_id", invite.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    return NextResponse.json(
      { error: "You are already a member of this workspace" },
      { status: 400 }
    );
  }

  // Accept the invite - the trigger will create workspace_users entries
  const { data: acceptedInvite, error: acceptError } = await supabase
    .from("workspace_invites")
    .update({
      user_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", inviteCode)
    .select("id, workspace_id, roles")
    .single();

  if (acceptError) {
    console.error("Error accepting invite:", acceptError);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }

  // Fetch the workspace details to return
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("id", acceptedInvite.workspace_id)
    .single();

  return NextResponse.json({
    success: true,
    workspace,
    roles: acceptedInvite.roles,
  });
}
