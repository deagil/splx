import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/workspace/roles
 * List all roles available in the workspace
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

  // Fetch all roles for this workspace
  const { data: roles, error } = await supabase
    .from("roles")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("level", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ roles });
}
