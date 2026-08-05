"use client";

import { GalleryVerticalEnd } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { type SendOTPState, sendOTP } from "@/app/signin/actions";
import { toast } from "@/components/shared/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const isSubmittingRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  const [state, formAction] = useActionState<SendOTPState, FormData>(sendOTP, {
    status: "idle",
  });

  useEffect(() => {
    if (state.status === "success" && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      toast({
        description: state.message ?? "OTP code sent to your email",
        type: "success",
      });
      if (email) {
        router.push(`/otp?email=${encodeURIComponent(email)}`);
      }
    } else if (state.status === "failed") {
      isSubmittingRef.current = false;
      hasNavigatedRef.current = false;
      toast({
        description: state.message ?? "Failed to send OTP code",
        type: "error",
      });
    } else if (state.status === "invalid_email") {
      isSubmittingRef.current = false;
      hasNavigatedRef.current = false;
      toast({
        description: state.message ?? "Please enter a valid email address",
        type: "error",
      });
    }
  }, [state, router, email]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (isSubmittingRef.current || hasNavigatedRef.current) {
      return;
    }

    if (!email.trim()) {
      return;
    }

    isSubmittingRef.current = true;

    // Optimistic navigation - navigate immediately after form submission
    // The toast and error handling will still work via the state effect
    setTimeout(() => {
      if (!hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        toast({
          description: "OTP code sent to your email",
          type: "success",
        });
        router.push(`/otp?email=${encodeURIComponent(email)}`);
      }
    }, 100);

    // Submit the form
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      void formAction(formData);
    });
  };

  const isDisabled =
    state.status === "in_progress" ||
    isSubmittingRef.current ||
    hasNavigatedRef.current ||
    isPending;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a
              className="flex flex-col items-center gap-2 font-medium"
              href="#"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Acme Inc.</span>
            </a>
            <h1 className="font-bold text-xl">Welcome to Acme Inc.</h1>
            <div className="text-center text-sm">
              Enter your email to receive a verification code
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                disabled={isDisabled}
                id="email"
                name="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane.appleseed@email.com"
                required
                type="email"
                value={email}
              />
            </div>
            <Button className="w-full" disabled={isDisabled} type="submit">
              {isDisabled ? "Sending..." : "Continue"}
            </Button>
          </div>
        </div>
      </form>
      <div className="text-balance text-center text-muted-foreground text-xs [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
