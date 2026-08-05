"use client";

import { GalleryVerticalEnd } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { type VerifyOTPState, verifyOTP } from "@/app/otp/actions";
import { sendOTP } from "@/app/signin/actions";
import { toast } from "@/components/shared/toast";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

export function OTPForm({ className, ...props }: React.ComponentProps<"div">) {
  const _router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otpValue, setOtpValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState<VerifyOTPState, FormData>(
    verifyOTP,
    {
      status: "idle",
    }
  );

  useEffect(() => {
    if (state.status === "failed") {
      toast({
        description: state.message ?? "Invalid OTP code",
        type: "error",
      });
    } else if (state.status === "invalid_data") {
      toast({
        description: state.message ?? "Please enter a valid 6-digit code",
        type: "error",
      });
    }
  }, [state]);

  const handleResend = () => {
    if (!email) {
      toast({
        description: "Email address is required",
        type: "error",
      });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", email);
      const result = await sendOTP({ status: "idle" }, formData);
      if (result.status === "success") {
        toast({
          description: "OTP code resent to your email",
          type: "success",
        });
      } else if (result.status === "failed") {
        toast({
          description: "Failed to resend OTP code",
          type: "error",
        });
      }
    });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form action={formAction}>
        <input name="email" type="hidden" value={email} />
        <input name="token" type="hidden" value={otpValue} />
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              className="flex flex-col items-center gap-2 font-medium"
              href="#"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Acme Inc.</span>
            </a>
            <h1 className="font-bold text-xl">Enter verification code</h1>
            <FieldDescription>
              We sent a 6-digit code to {email || "your email address"}
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel className="sr-only" htmlFor="otp">
              Verification code
            </FieldLabel>
            <InputOTP
              containerClassName="gap-4"
              disabled={state.status === "in_progress"}
              id="otp"
              maxLength={6}
              onChange={setOtpValue}
              required
              value={otpValue}
            >
              <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:h-16 *:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl">
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:h-16 *:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl">
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <FieldDescription className="text-center">
              Didn&apos;t receive the code?{" "}
              <button
                className="underline underline-offset-4"
                disabled={isPending}
                onClick={handleResend}
                type="button"
              >
                {isPending ? "Sending..." : "Resend"}
              </button>
            </FieldDescription>
          </Field>
          <Field>
            <Button
              disabled={otpValue.length !== 6 || state.status === "in_progress"}
              type="submit"
            >
              {state.status === "in_progress" ? "Verifying..." : "Verify"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
