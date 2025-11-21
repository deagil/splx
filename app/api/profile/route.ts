import { NextResponse } from "next/server";
import { getUserProfile } from "@/app/(app)/profile/actions";

export async function GET() {
  try {
    const profile = await getUserProfile();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
