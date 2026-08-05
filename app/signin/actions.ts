"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().email();

export interface SendOTPState {
  message?: string;
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_email";
}

export async function sendOTP(
  _: SendOTPState,
  formData: FormData
): Promise<SendOTPState> {
  try {
    const email = formData.get("email");
    const validatedEmail = emailSchema.parse(email);

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: validatedEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      // Handle rate limiting errors more gracefully
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes("rate limit") ||
        errorMessage.includes("too many") ||
        errorMessage.includes("for security reasons")
      ) {
        return {
          message:
            "Too many requests. Please wait a moment before requesting another code.",
          status: "failed",
        };
      }

      return {
        message: error.message,
        status: "failed",
      };
    }

    return {
      message: "OTP code sent to your email",
      status: "success",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        message: "Please enter a valid email address",
        status: "invalid_email",
      };
    }

    return {
      message: "Failed to send OTP code",
      status: "failed",
    };
  }
}
