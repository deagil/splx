"use client";

import {
  AlertTriangle,
  Asterisk,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Database,
  GalleryVerticalEnd,
  Loader2,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  type CompleteOnboardingState,
  completeOnboarding,
} from "@/app/onboarding/actions";
import { toast } from "@/components/shared/toast";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TextLengthIndicator } from "@/components/ui/text-length-indicator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { generateSlug } from "@/lib/utils/slug";
import { WorkspacePreview } from "./workspace-preview";

type Step = 1 | 2 | 3 | 4 | 5;

const TOTAL_STEPS = 5;

interface OnboardingInitialValues {
  ai_generation_guidance: string;
  business_description: string;
  database_connection: string;
  firstname: string;
  job_title: string;
  lastname: string;
  profile_pic_url: string;
  role_experience: string;
  selected_plan: "lite" | "plus" | "pro";
  technical_proficiency: "less" | "regular" | "more";
  tone_of_voice: "friendly" | "balanced" | "efficient" | string;
  workspace_name: string;
  workspace_profile_pic_url: string;
  workspace_url: string;
}

const PROFICIENCY_OPTIONS: Array<{
  value: OnboardingInitialValues["technical_proficiency"];
  label: string;
  description: string;
}> = [
  {
    description: "Simpler language, expanded instructions and explanations.",
    label: "Prefer Guidance",
    value: "less",
  },
  {
    description: "Balanced level of technical detail and general explanations.",
    label: "Balanced",
    value: "regular",
  },
  {
    description:
      "Increased technical specifics, assumed understanding of system.",
    label: "Prefer Details",
    value: "more",
  },
];

const TONE_OPTIONS: Array<{
  value: "friendly" | "balanced" | "efficient";
  label: string;
  description: string;
  text: string;
}> = [
  {
    description: "Bubbly and joyful while on the job.",
    label: "Friendly",
    text: "Use a friendly, bubbly, and playful tone while maintaining professionalism and appropriateness. Be warm, enthusiastic, and engaging in responses.",
    value: "friendly",
  },
  {
    description: "Pleasant to work with and always helpful.",
    label: "Balanced",
    text: "Maintain a balanced, professional yet approachable tone. Be warm when appropriate but also efficient and clear in communication.",
    value: "balanced",
  },
  {
    description: "Direct and to the point, no fluff. Gets stuff done.",
    label: "Efficient",
    text: "Use a concise, matter-of-fact tone that prioritizes clarity and brevity. Be direct and helpful while remaining polite and not unfun.",
    value: "efficient",
  },
];

// Helper function to get tone text from selection
function getToneText(value: string): string {
  const option = TONE_OPTIONS.find((opt) => opt.value === value);
  return option?.text || value;
}

type OnboardingFormProps = React.ComponentPropsWithoutRef<"div"> & {
  initialValues: OnboardingInitialValues;
};

// Helper to detect if existing tone_of_voice matches a predefined option
function detectToneValue(
  toneText: string
): "friendly" | "balanced" | "efficient" | string {
  if (!toneText) {
    return "balanced"; // Default to balanced
  }
  // Check if text matches any predefined option
  for (const option of TONE_OPTIONS) {
    if (
      toneText.toLowerCase().includes(option.value.toLowerCase()) ||
      option.text.toLowerCase() === toneText.toLowerCase().trim()
    ) {
      return option.value;
    }
  }
  // If doesn't match, return as-is (custom text)
  return toneText;
}

export function OnboardingForm({
  initialValues,
  className,
  ...props
}: OnboardingFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  // Initialize tone_of_voice - convert existing text to button value if it matches
  const initialToneValue =
    typeof initialValues.tone_of_voice === "string"
      ? detectToneValue(initialValues.tone_of_voice)
      : initialValues.tone_of_voice || "balanced";

  const [formData, setFormData] = useState<OnboardingInitialValues>({
    ...initialValues,
    tone_of_voice: initialToneValue,
    workspace_url:
      initialValues.workspace_url || generateSlug(initialValues.workspace_name),
  });
  const [isPending, startTransition] = useTransition();
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionVerified, setConnectionVerified] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Reset verification when connection string changes
    if (formData.database_connection) {
      setConnectionVerified(false);
    }
  }, [formData.database_connection]);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    // Mock API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setConnectionVerified(true);
    setIsTestingConnection(false);
  };
  const [slugAvailability, setSlugAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    error: boolean;
  }>({ available: null, checking: false, error: false });
  const slugCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, formAction] = useActionState<CompleteOnboardingState, FormData>(
    completeOnboarding,
    {
      status: "idle",
    }
  );

  useEffect(() => {
    if (state.status === "failed") {
      toast({
        description: state.message ?? "Failed to complete onboarding",
        type: "error",
      });
    } else if (state.status === "invalid_data") {
      toast({
        description: state.message ?? "Please fill in all required fields",
        type: "error",
      });
    }
  }, [state]);

  useEffect(() => {
    setFormData(initialValues);
  }, [initialValues]);

  const isBusy = state.status === "in_progress" || isPending;

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.trim().length === 0) {
      setSlugAvailability({ available: null, checking: false, error: false });
      return;
    }

    setSlugAvailability({ available: null, checking: true, error: false });

    try {
      const response = await fetch(
        `/api/workspace/check-slug?slug=${encodeURIComponent(slug)}`
      );

      // Check if response is actually JSON before consuming the body
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        // Clone the response to read it without consuming the original
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        console.error("Non-JSON response from API:", text.slice(0, 200));
        setSlugAvailability({ available: null, checking: false, error: true });
        return;
      }

      if (!response.ok) {
        const _errorData = await response
          .json()
          .catch(() => ({ message: "Failed to check availability" }));
        setSlugAvailability({ available: null, checking: false, error: true });
        return;
      }

      const data = await response.json();
      setSlugAvailability({
        available: data.available ?? false,
        checking: false,
        error: false,
      });
    } catch (error) {
      console.error("Error checking slug availability:", error);
      setSlugAvailability({ available: null, checking: false, error: true });
    }
  };

  const handleInputChange = <K extends keyof OnboardingInitialValues>(
    field: K,
    value: OnboardingInitialValues[K]
  ) => {
    if (field === "workspace_name" && !slugManuallyEdited) {
      // Auto-generate slug from workspace name if not manually edited
      const newSlug = generateSlug(value as string);
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        workspace_url: newSlug,
      }));

      // Check availability with debouncing
      if (slugCheckTimeoutRef.current) {
        clearTimeout(slugCheckTimeoutRef.current);
      }
      slugCheckTimeoutRef.current = setTimeout(() => {
        if (newSlug) {
          checkSlugAvailability(newSlug);
        }
      }, 500);
    } else if (field === "workspace_url") {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setSlugManuallyEdited(true);

      // Check availability with debouncing
      if (slugCheckTimeoutRef.current) {
        clearTimeout(slugCheckTimeoutRef.current);
      }
      const slugValue = value as string;
      slugCheckTimeoutRef.current = setTimeout(() => {
        if (slugValue) {
          checkSlugAvailability(generateSlug(slugValue));
        }
      }, 500);
    } else if (field === "firstname" || field === "lastname") {
      // Update workspace name when firstname or lastname changes
      const updatedData = { ...formData, [field]: value };
      const newFirstname =
        field === "firstname" ? (value as string) : formData.firstname;
      const newLastname =
        field === "lastname" ? (value as string) : formData.lastname;

      // Only auto-update workspace name if it's still the default or empty
      const shouldUpdateWorkspaceName =
        !formData.workspace_name ||
        formData.workspace_name === "My Workspace" ||
        formData.workspace_name === `${formData.firstname}'s workspace` ||
        formData.workspace_name ===
          `${formData.firstname} ${formData.lastname}'s workspace`;

      if (shouldUpdateWorkspaceName && (newFirstname || newLastname)) {
        const newWorkspaceName =
          newFirstname && newLastname
            ? `${newFirstname} ${newLastname}'s workspace`
            : newFirstname
              ? `${newFirstname}'s workspace`
              : "My Workspace";

        updatedData.workspace_name = newWorkspaceName;

        // Auto-generate slug if not manually edited
        if (!slugManuallyEdited) {
          const newSlug = generateSlug(newWorkspaceName);
          updatedData.workspace_url = newSlug;

          // Check availability with debouncing
          if (slugCheckTimeoutRef.current) {
            clearTimeout(slugCheckTimeoutRef.current);
          }
          slugCheckTimeoutRef.current = setTimeout(() => {
            if (newSlug) {
              checkSlugAvailability(newSlug);
            }
          }, 500);
        }
      }

      setFormData(updatedData);
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Check slug availability on mount if workspace_url exists
  useEffect(() => {
    if (formData.workspace_url) {
      checkSlugAvailability(formData.workspace_url);
    }
    return () => {
      if (slugCheckTimeoutRef.current) {
        clearTimeout(slugCheckTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.workspace_url, checkSlugAvailability]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (currentStep !== TOTAL_STEPS) {
      handleNext();
      return;
    }

    startTransition(() => {
      const formDataObj = new FormData();
      formDataObj.set("firstname", formData.firstname);
      formDataObj.set("lastname", formData.lastname);
      formDataObj.set("profile_pic_url", formData.profile_pic_url);
      formDataObj.set("job_title", formData.job_title);
      formDataObj.set("role_experience", formData.role_experience);
      formDataObj.set("technical_proficiency", formData.technical_proficiency);
      // Convert tone_of_voice selection to predefined text
      const toneText =
        typeof formData.tone_of_voice === "string" &&
        ["friendly", "balanced", "efficient"].includes(formData.tone_of_voice)
          ? getToneText(formData.tone_of_voice)
          : formData.tone_of_voice;
      formDataObj.set("tone_of_voice", toneText);
      formDataObj.set(
        "ai_generation_guidance",
        formData.ai_generation_guidance
      );
      formDataObj.set("workspace_name", formData.workspace_name);
      formDataObj.set("workspace_url", generateSlug(formData.workspace_url));
      formDataObj.set(
        "workspace_profile_pic_url",
        formData.workspace_profile_pic_url
      );
      formDataObj.set("business_description", formData.business_description);
      formDataObj.set("database_connection", formData.database_connection);
      formDataObj.set("selected_plan", formData.selected_plan);
      formAction(formDataObj);
    });
  };

  const getStepTitle = (step: Step) => {
    switch (step) {
      case 1:
        return "User Profile Setup";
      case 2:
        return "Setup Your Workspace";
      case 3:
        return "Assistant Preferences";
      case 4:
        return "Connect Data Source";
      case 5:
        return "Get the most out of Suplex";
      default:
        return "";
    }
  };

  const getStepDescription = (step: Step) => {
    switch (step) {
      case 1:
        return "Let your teammates and assistant know who you are.";
      case 2:
        return "Create a workspace to store your settings and customisations.";
      case 3:
        return "Fine-tune how your personal assistant collaborates with you.";
      case 4:
        return "Connect your primary database to power your workspace.";
      case 5:
        return "Start your free trial to experience AI-powered insights, documentation, and your personal assistant.";
      default:
        return "";
    }
  };

  const getStepIcon = (step: Step) => {
    switch (step) {
      case 1:
        return User;
      case 2:
        return Briefcase;
      case 3:
        return Sparkles;
      case 4:
        return Database;
      case 5:
        return CreditCard;
      default:
        return GalleryVerticalEnd;
    }
  };

  return (
    <div
      className={cn("flex h-full flex-col", className)}
      data-step={currentStep}
      {...props}
    >
      {/* Fixed Header */}
      <div className="flex flex-col gap-6 pb-6">
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const step = (i + 1) as Step;
            const isActive = step === currentStep;
            const isCompleted = step < currentStep;
            return (
              <div className="flex items-center gap-2" key={step}>
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full font-medium text-sm transition-colors",
                    isActive &&
                      "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                    isCompleted && "bg-primary text-primary-foreground",
                    !isActive &&
                      !isCompleted &&
                      "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? "✓" : String(step)}
                </div>
                {step < TOTAL_STEPS && (
                  <div
                    className={cn(
                      "h-0.5 w-8 transition-colors",
                      isCompleted ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <a className="flex flex-col items-center gap-2 font-medium" href="#">
            <div className="flex size-8 items-center justify-center rounded-md">
              {(() => {
                const IconComponent = getStepIcon(currentStep);
                return <IconComponent className="size-6" />;
              })()}
            </div>
            <span className="sr-only">Acme Inc.</span>
          </a>
          <h1 className="font-bold text-xl">{getStepTitle(currentStep)}</h1>
          <FieldDescription>{getStepDescription(currentStep)}</FieldDescription>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-12">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
          ref={formRef}
        >
          <div
            className={cn(
              "min-h-0 flex-1",
              currentStep === 5 ? "overflow-visible" : "overflow-y-auto"
            )}
          >
            <FieldGroup className="space-y-8 pr-1 pb-6">
              {currentStep === 1 && (
                <div className="fade-in slide-in-from-right-4 animate-in space-y-6 duration-300">
                  <Field>
                    <FieldLabel
                      className="items-center gap-1"
                      htmlFor="firstname"
                    >
                      First name
                      <Asterisk className="size-3 text-destructive" />
                    </FieldLabel>
                    <Input
                      disabled={isBusy}
                      id="firstname"
                      name="firstname"
                      onChange={(event) =>
                        handleInputChange("firstname", event.target.value)
                      }
                      placeholder="Casey"
                      required
                      type="text"
                      value={formData.firstname}
                    />
                  </Field>
                  <Field>
                    <FieldLabel
                      className="items-center gap-1"
                      htmlFor="lastname"
                    >
                      Last name
                      <Asterisk className="size-3 text-destructive" />
                    </FieldLabel>
                    <Input
                      disabled={isBusy}
                      id="lastname"
                      name="lastname"
                      onChange={(event) =>
                        handleInputChange("lastname", event.target.value)
                      }
                      placeholder="Morgan"
                      required
                      type="text"
                      value={formData.lastname}
                    />
                  </Field>
                  <Field>
                    <FieldLabel
                      className="items-center gap-2"
                      htmlFor="job_title"
                    >
                      Job title
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Sparkles className="size-4 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Helps assistant to understand your perspective and
                            expertise
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </FieldLabel>
                    <Input
                      disabled={isBusy}
                      id="job_title"
                      name="job_title"
                      onChange={(event) =>
                        handleInputChange("job_title", event.target.value)
                      }
                      placeholder="Operations Manager"
                      type="text"
                      value={formData.job_title}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="profile_pic_url">
                      Profile picture URL
                    </FieldLabel>
                    <Input
                      disabled={isBusy}
                      id="profile_pic_url"
                      name="profile_pic_url"
                      onChange={(event) =>
                        handleInputChange("profile_pic_url", event.target.value)
                      }
                      placeholder="https://example.com/avatar.png"
                      type="url"
                      value={formData.profile_pic_url}
                    />
                    <FieldDescription>
                      Provide a public image URL to personalise your account.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel
                      className="items-center gap-2"
                      htmlFor="role_experience"
                    >
                      How would you describe your role and experience?
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Sparkles className="size-4 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Shared with AI to improve responses if
                            personalisation is enabled
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </FieldLabel>
                    <Textarea
                      disabled={isBusy}
                      id="role_experience"
                      name="role_experience"
                      onChange={(event) =>
                        handleInputChange("role_experience", event.target.value)
                      }
                      placeholder="I lead the operations team and focus on process optimisation..."
                      rows={4}
                      value={formData.role_experience}
                    />
                    <TextLengthIndicator
                      className="mt-2"
                      length={formData.role_experience.length}
                      optimalRange={{ good: 200, max: 2000, min: 50 }}
                    />
                  </Field>
                </div>
              )}

              {currentStep === 2 && (
                <div className="fade-in slide-in-from-right-4 animate-in space-y-6 duration-300">
                  <Field>
                    <FieldLabel
                      className="items-center gap-1"
                      htmlFor="workspace_name"
                    >
                      Workspace name
                      <Asterisk className="size-3 text-destructive" />
                    </FieldLabel>
                    <Input
                      disabled={isBusy}
                      id="workspace_name"
                      name="workspace_name"
                      onChange={(event) =>
                        handleInputChange("workspace_name", event.target.value)
                      }
                      placeholder="Acme Operations"
                      required
                      type="text"
                      value={formData.workspace_name}
                    />
                    <FieldDescription>
                      Displayed across the product and used in AI prompts.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel
                      className="items-center gap-1"
                      htmlFor="workspace_url"
                    >
                      Workspace URL
                      <Asterisk className="size-3 text-destructive" />
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        className={cn(
                          (slugAvailability.checking ||
                            slugAvailability.available !== null ||
                            slugAvailability.error) &&
                            "pr-10",
                          slugAvailability.available === false &&
                            "border-destructive"
                        )}
                        disabled={isBusy}
                        id="workspace_url"
                        name="workspace_url"
                        onChange={(event) =>
                          handleInputChange("workspace_url", event.target.value)
                        }
                        placeholder="acme-operations"
                        required
                        type="text"
                        value={formData.workspace_url}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="absolute top-1/2 right-3 -translate-y-1/2 cursor-help">
                            {!!slugAvailability.checking && (
                              <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            )}
                            {!slugAvailability.checking &&
                              slugAvailability.available === true && (
                                <CheckCircle2 className="size-4 text-green-600" />
                              )}
                            {!slugAvailability.checking &&
                              slugAvailability.available === false && (
                                <XCircle className="size-4 text-destructive" />
                              )}
                            {!slugAvailability.checking &&
                              slugAvailability.error && (
                                <AlertTriangle className="size-4 text-yellow-600" />
                              )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {!!slugAvailability.checking &&
                              "Checking availability..."}
                            {!slugAvailability.checking &&
                              slugAvailability.available === true &&
                              "This workspace URL is available"}
                            {!slugAvailability.checking &&
                              slugAvailability.available === false &&
                              "This workspace URL is already taken"}
                            {!slugAvailability.checking &&
                              slugAvailability.error &&
                              "Error checking availability. Please try again."}
                            {!slugAvailability.checking &&
                              slugAvailability.available === null &&
                              !slugAvailability.error &&
                              "Checking workspace URL availability"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      {(slugAvailability.checking ||
                        slugAvailability.available !== null ||
                        slugAvailability.error) && (
                        <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                          {!!slugAvailability.checking && (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          )}
                          {!slugAvailability.checking &&
                            slugAvailability.available === true && (
                              <CheckCircle2 className="size-4 text-green-600" />
                            )}
                          {!slugAvailability.checking &&
                            slugAvailability.available === false && (
                              <XCircle className="size-4 text-destructive" />
                            )}
                          {!slugAvailability.checking &&
                            slugAvailability.error && (
                              <AlertTriangle className="size-4 text-yellow-600" />
                            )}
                        </div>
                      )}
                    </div>
                    <FieldDescription>
                      Used in your workspace URL (e.g.,
                      your-workspace.com/workspace/acme-operations)
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="workspace_profile_pic_url">
                      Workspace avatar URL
                    </FieldLabel>
                    <Input
                      disabled={isBusy}
                      id="workspace_profile_pic_url"
                      name="workspace_profile_pic_url"
                      onChange={(event) =>
                        handleInputChange(
                          "workspace_profile_pic_url",
                          event.target.value
                        )
                      }
                      placeholder="https://example.com/logo.png"
                      type="url"
                      value={formData.workspace_profile_pic_url}
                    />
                    <FieldDescription>
                      Optional image used in navigation and shared content.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel
                      className="items-center gap-2"
                      htmlFor="business_description"
                    >
                      What does your business do?
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Sparkles className="size-4 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Helps AI features understand your
                            organisation&apos;s context
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </FieldLabel>
                    <Textarea
                      disabled={isBusy}
                      id="business_description"
                      name="business_description"
                      onChange={(event) =>
                        handleInputChange(
                          "business_description",
                          event.target.value
                        )
                      }
                      placeholder="We provide logistics services for e-commerce retailers..."
                      rows={4}
                      value={formData.business_description}
                    />
                    <TextLengthIndicator
                      className="mt-2"
                      length={formData.business_description.length}
                      optimalRange={{ good: 200, max: 4000, min: 50 }}
                    />
                  </Field>
                </div>
              )}

              {currentStep === 3 && (
                <div className="fade-in slide-in-from-right-4 animate-in space-y-6 duration-300">
                  <Field>
                    <FieldLabel
                      className="items-center gap-2"
                      htmlFor="tone_of_voice"
                    >
                      Assistant tone of voice
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Sparkles className="size-4 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Guides how chatbots and AI features communicate with
                            you
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </FieldLabel>
                    <div className="w-full overflow-hidden">
                      <ToggleGroup
                        className="w-full"
                        onValueChange={(value) => {
                          if (
                            value &&
                            ["friendly", "balanced", "efficient"].includes(
                              value
                            )
                          ) {
                            handleInputChange(
                              "tone_of_voice",
                              value as "friendly" | "balanced" | "efficient"
                            );
                          }
                        }}
                        type="single"
                        value={
                          typeof formData.tone_of_voice === "string" &&
                          ["friendly", "balanced", "efficient"].includes(
                            formData.tone_of_voice
                          )
                            ? formData.tone_of_voice
                            : undefined
                        }
                      >
                        {TONE_OPTIONS.map((option) => (
                          <ToggleGroupItem
                            className="flex-1 py-2"
                            disabled={isBusy}
                            key={option.value}
                            value={option.value}
                          >
                            <span className="font-medium">{option.label}</span>
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                    <FieldDescription>
                      {TONE_OPTIONS.find(
                        (opt) => opt.value === formData.tone_of_voice
                      )?.description ??
                        "Select how AI should communicate with you. Friendly on the left, efficient on the right."}
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel
                      className="items-center gap-2"
                      htmlFor="technical_proficiency"
                    >
                      Technical explanations
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Sparkles className="size-4 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Adjusts the level of detail in AI-generated
                            suggestions
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </FieldLabel>
                    <div className="w-full overflow-hidden">
                      <ToggleGroup
                        className="w-full"
                        onValueChange={(value) => {
                          if (value) {
                            handleInputChange(
                              "technical_proficiency",
                              value as OnboardingInitialValues["technical_proficiency"]
                            );
                          }
                        }}
                        type="single"
                        value={formData.technical_proficiency}
                      >
                        {PROFICIENCY_OPTIONS.map((option) => (
                          <ToggleGroupItem
                            className="flex-1 py-2"
                            disabled={isBusy}
                            key={option.value}
                            value={option.value}
                          >
                            <span className="font-medium">{option.label}</span>
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                    <FieldDescription>
                      {PROFICIENCY_OPTIONS.find(
                        (opt) => opt.value === formData.technical_proficiency
                      )?.description ??
                        "Adjusts the level of detail in AI-generated suggestions. Less guidance on the left, more advanced on the right."}
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel
                      className="items-center gap-2"
                      htmlFor="ai_generation_guidance"
                    >
                      Instructions for your assistant
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Sparkles className="size-4 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Add prompts or preferences you want AI assistants to
                            follow
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </FieldLabel>
                    <Textarea
                      disabled={isBusy}
                      id="ai_generation_guidance"
                      name="ai_generation_guidance"
                      onChange={(event) =>
                        handleInputChange(
                          "ai_generation_guidance",
                          event.target.value
                        )
                      }
                      placeholder="Don't use em-dashes or emojis. Prefer TypeScript examples with comments when generating code. Avoid academic language."
                      rows={5}
                      value={formData.ai_generation_guidance}
                    />
                    <TextLengthIndicator
                      className="mt-2"
                      length={formData.ai_generation_guidance.length}
                      optimalRange={{ good: 200, max: 4000, min: 50 }}
                    />
                  </Field>
                </div>
              )}

              {currentStep === 4 && (
                <div className="fade-in slide-in-from-right-4 animate-in space-y-6 duration-300">
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                    <p className="text-muted-foreground text-sm">
                      Splx Studio works with your existing Postgres database.
                      Connect your primary data source to start building pages
                      and querying data.
                    </p>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="font-medium">Using Supabase?</span>
                      <a
                        className="text-blue-700 underline hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        href="https://supabase.com/docs/guides/database/connecting-to-postgres"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        View connection guide
                      </a>
                    </div>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="database_connection">
                      Postgres connection string
                    </FieldLabel>
                    <Input
                      className="font-mono text-sm"
                      disabled={isBusy}
                      id="database_connection"
                      name="database_connection"
                      onChange={(event) =>
                        handleInputChange(
                          "database_connection",
                          event.target.value
                        )
                      }
                      placeholder="postgresql://user:password@host:5432/database"
                      spellCheck={false}
                      type="text"
                      value={formData.database_connection}
                    />
                    <FieldDescription>
                      Format: postgresql://username:password@host:port/database
                    </FieldDescription>
                  </Field>

                  <div className="flex items-center gap-4">
                    <Button
                      className={cn(
                        connectionVerified &&
                          "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
                      )}
                      disabled={
                        isTestingConnection ||
                        !formData.database_connection ||
                        connectionVerified
                      }
                      onClick={handleTestConnection}
                      type="button"
                      variant={connectionVerified ? "outline" : undefined}
                    >
                      {isTestingConnection ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Testing...
                        </>
                      ) : connectionVerified ? (
                        <>
                          <Check className="mr-2 size-4" />
                          Connection Verified
                        </>
                      ) : (
                        "Test Connection"
                      )}
                    </Button>
                  </div>

                  <div className="rounded-lg border-blue-500 border-l-4 bg-blue-50/50 p-4 dark:bg-blue-950/20">
                    <p className="font-medium text-blue-900 text-sm dark:text-blue-100">
                      You can skip this for now
                    </p>
                    <p className="mt-1 text-blue-700 text-sm dark:text-blue-300">
                      If you&apos;re not ready to connect a database, you can
                      configure this later in Workspace Settings &gt; Connected
                      Apps.
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="fade-in slide-in-from-right-4 animate-in space-y-6 duration-300">
                  <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
                    {/* Lite Plan */}
                    <div
                      className={cn(
                        "flex h-full flex-col justify-between rounded-xl border p-6",
                        "bg-card transition-shadow hover:shadow-md"
                      )}
                    >
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg">Lite</h3>
                          <span className="my-3 block font-bold text-3xl tracking-tight">
                            Free
                          </span>
                          <p className="text-muted-foreground text-sm">
                            Core features to visualise your data
                          </p>
                        </div>

                        <hr className="border-dashed" />

                        <ul className="list-outside space-y-3 text-sm">
                          {[
                            "2 users",
                            "Block based page builder",
                            "Generate reports from chat",
                            "Trial AI features",
                          ].map((item, index) => (
                            <li
                              className="flex items-center gap-3 text-muted-foreground"
                              key={index}
                            >
                              <Check className="size-4 flex-shrink-0 text-primary" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button
                        className="mt-8 h-12 w-full text-base"
                        disabled={isBusy}
                        onClick={() => {
                          handleInputChange("selected_plan", "lite");
                          // Submit the form since this is the final step
                          setTimeout(() => formRef.current?.requestSubmit(), 0);
                        }}
                        type="button"
                        variant="outline"
                      >
                        Skip Trial
                      </Button>
                    </div>

                    {/* Plus Plan - Main focus */}
                    <div
                      className={cn(
                        "relative flex h-full flex-col justify-between overflow-hidden rounded-xl border-2 border-primary/20 p-6",
                        "bg-muted/30 shadow-lg dark:[--color-muted:var(--color-zinc-900)]"
                      )}
                    >
                      <div className="absolute top-0 right-0 p-3">
                        <div className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary text-xs uppercase">
                          7 day free trial
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg text-primary">
                            Plus
                          </h3>
                          <div className="my-3">
                            <span className="font-bold text-3xl tracking-tight">
                              £8
                            </span>{" "}
                            <span className="mt-1 ml-1 text-md text-muted-foreground">
                              {" "}
                              per month / user
                            </span>
                            {/* <p className="text-muted-foreground text-sm mt-1">then £8 per user/month</p> */}
                          </div>
                          <p className="text-muted-foreground text-sm">
                            Empower your team with AI assistants
                          </p>
                        </div>
                        <hr className="border-dashed" />

                        <ul className="list-outside space-y-3 text-sm">
                          {[
                            "Unlimited users",
                            "Per-user personal assistant",
                            "ChatGPT-like editor",
                            "Inline Insights",
                            "Included regular AI usage",
                            "Auto-documentation",
                            "Data retention cleanup",
                            "Priority support",
                          ].map((item, index) => (
                            <li className="flex items-center gap-3" key={index}>
                              <Check
                                className="size-4 flex-shrink-0 text-primary"
                                strokeWidth={2.5}
                              />
                              <span className="font-medium">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button
                        className="mt-8 h-12 w-full font-semibold text-base shadow-lg shadow-primary/20"
                        disabled={isBusy}
                        onClick={() => {
                          handleInputChange("selected_plan", "plus");
                          // Submit the form since this is the final step
                          setTimeout(() => formRef.current?.requestSubmit(), 0);
                        }}
                        type="button"
                      >
                        Start Free Trial
                      </Button>
                    </div>
                  </div>
                  {/* TODO: Add free trial disclaimer */}
                  {/* <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    No credit card required for your free trial
                  </p>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    Experience the full power of AI-enhanced data management. Cancel anytime or continue with Lite after your trial.
                  </p>
                </div> */}
                </div>
              )}
            </FieldGroup>
          </div>

          {/* Fixed Footer */}
          {currentStep !== 5 && (
            <div className="flex flex-col gap-4 border-t bg-background pt-4">
              <div className="flex items-center justify-between gap-4">
                <Button
                  className="flex items-center gap-2"
                  disabled={currentStep === 1 || isBusy}
                  onClick={handleBack}
                  type="button"
                  variant="outline"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>

                <div className="text-muted-foreground text-sm">
                  Step {currentStep} of {TOTAL_STEPS}
                </div>

                <Button
                  className="flex items-center gap-2"
                  disabled={
                    isBusy ||
                    (currentStep === 4 &&
                      Boolean(formData.database_connection) &&
                      !connectionVerified)
                  }
                  type="submit"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <FieldDescription className="text-center text-xs">
                You can update all of these settings later.
              </FieldDescription>
            </div>
          )}

          {/* Special footer for pricing step with just back button */}
          {currentStep === 5 && (
            <div className="flex flex-col gap-4 border-t bg-background pt-4">
              <div className="flex items-center justify-between gap-4">
                <Button
                  className="flex items-center gap-2"
                  disabled={isBusy}
                  onClick={handleBack}
                  type="button"
                  variant="outline"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>

                <div className="text-muted-foreground text-sm">
                  Step {currentStep} of {TOTAL_STEPS}
                </div>

                <div className="w-[88px]">{/* Spacer for alignment */}</div>
              </div>
              <FieldDescription className="text-center text-xs">
                You can manage your plan at any time in the Workspace Settings.
              </FieldDescription>
            </div>
          )}
        </form>
        <div className="sticky top-6 hidden flex-1 items-start justify-center lg:flex">
          <WorkspacePreview
            data={formData}
            isVerified={connectionVerified}
            step={currentStep}
          />
        </div>
      </div>
    </div>
  );
}
