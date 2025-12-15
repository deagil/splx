"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { GalleryVerticalEnd, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Loader2, Sparkles, AlertTriangle, Asterisk, Briefcase, User, Database, CreditCard, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { generateSlug } from "@/lib/utils/slug";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/components/shared/toast";
import {
  type CompleteOnboardingState,
  completeOnboarding,
} from "@/app/onboarding/actions";
import { TextLengthIndicator } from "@/components/ui/text-length-indicator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkspacePreview } from "./workspace-preview";

type Step = 1 | 2 | 3 | 4 | 5;

const TOTAL_STEPS = 5;

type OnboardingInitialValues = {
  firstname: string;
  lastname: string;
  job_title: string;
  profile_pic_url: string;
  role_experience: string;
  technical_proficiency: "less" | "regular" | "more";
  tone_of_voice: "friendly" | "balanced" | "efficient" | string;
  ai_generation_guidance: string;
  workspace_name: string;
  workspace_url: string;
  workspace_profile_pic_url: string;
  business_description: string;
  database_connection: string;
  selected_plan: "lite" | "plus" | "pro";
};

const PROFICIENCY_OPTIONS: Array<{
  value: OnboardingInitialValues["technical_proficiency"];
  label: string;
  description: string;
}> = [
  {
    value: "less",
    label: "Prefer Guidance",
    description: "Simpler language, expanded instructions and explanations.",
  },
  {
    value: "regular",
    label: "Balanced",
    description: "Balanced level of technical detail and general explanations.",
  },
  {
    value: "more",
    label: "Prefer Details",
    description: "Increased technical specifics, assumed understanding of system.",
  },
];

const TONE_OPTIONS: Array<{
  value: "friendly" | "balanced" | "efficient";
  label: string;
  description: string;
  text: string;
}> = [
  {
    value: "friendly",
    label: "Friendly",
    description: "Bubbly and joyful while on the job.",
    text: "Use a friendly, bubbly, and playful tone while maintaining professionalism and appropriateness. Be warm, enthusiastic, and engaging in responses.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Pleasant to work with and always helpful.",
    text: "Maintain a balanced, professional yet approachable tone. Be warm when appropriate but also efficient and clear in communication.",
  },
  {
    value: "efficient",
    label: "Efficient",
    description: "Direct and to the point, no fluff. Gets stuff done.",
    text: "Use a concise, matter-of-fact tone that prioritizes clarity and brevity. Be direct and helpful while remaining polite and not unfun.",
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
function detectToneValue(toneText: string): "friendly" | "balanced" | "efficient" | string {
  if (!toneText) return "balanced"; // Default to balanced
  // Check if text matches any predefined option
  for (const option of TONE_OPTIONS) {
    if (toneText.toLowerCase().includes(option.value.toLowerCase()) || 
        option.text.toLowerCase() === toneText.toLowerCase().trim()) {
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
  const initialToneValue = typeof initialValues.tone_of_voice === "string" 
    ? detectToneValue(initialValues.tone_of_voice)
    : initialValues.tone_of_voice || "balanced";
  
  const [formData, setFormData] = useState<OnboardingInitialValues>({
    ...initialValues,
    workspace_url: initialValues.workspace_url || generateSlug(initialValues.workspace_name),
    tone_of_voice: initialToneValue,
  });
  const [isPending, startTransition] = useTransition();
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionVerified, setConnectionVerified] = useState(false);

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
  }>({ checking: false, available: null, error: false });
  const slugCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, formAction] = useActionState<
    CompleteOnboardingState,
    FormData
  >(completeOnboarding, {
    status: "idle",
  });

  useEffect(() => {
    if (state.status === "failed") {
      toast({
        type: "error",
        description: state.message ?? "Failed to complete onboarding",
      });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: state.message ?? "Please fill in all required fields",
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
      setSlugAvailability({ checking: false, available: null, error: false });
      return;
    }

    setSlugAvailability({ checking: true, available: null, error: false });

    try {
      const response = await fetch(`/api/workspace/check-slug?slug=${encodeURIComponent(slug)}`);
      
      // Check if response is actually JSON before consuming the body
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        // Clone the response to read it without consuming the original
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        console.error("Non-JSON response from API:", text.substring(0, 200));
        setSlugAvailability({ checking: false, available: null, error: true });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to check availability" }));
        setSlugAvailability({ checking: false, available: null, error: true });
        return;
      }

      const data = await response.json();
      setSlugAvailability({ checking: false, available: data.available ?? false, error: false });
    } catch (error) {
      console.error("Error checking slug availability:", error);
      setSlugAvailability({ checking: false, available: null, error: true });
    }
  };

  const handleInputChange = <K extends keyof OnboardingInitialValues>(
    field: K,
    value: OnboardingInitialValues[K],
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
      const newFirstname = field === "firstname" ? (value as string) : formData.firstname;
      const newLastname = field === "lastname" ? (value as string) : formData.lastname;

      // Only auto-update workspace name if it's still the default or empty
      const shouldUpdateWorkspaceName =
        !formData.workspace_name ||
        formData.workspace_name === "My Workspace" ||
        formData.workspace_name === `${formData.firstname}'s workspace` ||
        formData.workspace_name === `${formData.firstname} ${formData.lastname}'s workspace`;

      if (shouldUpdateWorkspaceName && (newFirstname || newLastname)) {
        const newWorkspaceName = newFirstname && newLastname
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
  }, []);

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
      const toneText = typeof formData.tone_of_voice === "string" && ["friendly", "balanced", "efficient"].includes(formData.tone_of_voice)
        ? getToneText(formData.tone_of_voice)
        : formData.tone_of_voice;
      formDataObj.set("tone_of_voice", toneText);
      formDataObj.set(
        "ai_generation_guidance",
        formData.ai_generation_guidance,
      );
      formDataObj.set("workspace_name", formData.workspace_name);
      formDataObj.set("workspace_url", generateSlug(formData.workspace_url));
      formDataObj.set(
        "workspace_profile_pic_url",
        formData.workspace_profile_pic_url,
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
    <div className={cn("flex h-full flex-col", className)} data-step={currentStep} {...props}>
      {/* Fixed Header */}
      <div className="flex flex-col gap-6 pb-6">
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const step = (i + 1) as Step;
            const isActive = step === currentStep;
            const isCompleted = step < currentStep;
            return (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isActive &&
                      "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                    isCompleted && "bg-primary text-primary-foreground",
                    !isActive &&
                      !isCompleted &&
                      "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? "✓" : step}
                </div>
                {step < TOTAL_STEPS && (
                  <div
                    className={cn(
                      "h-0.5 w-8 transition-colors",
                      isCompleted ? "bg-primary" : "bg-muted",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <a
            href="#"
            className="flex flex-col items-center gap-2 font-medium"
          >
            <div className="flex size-8 items-center justify-center rounded-md">
              {(() => {
                const IconComponent = getStepIcon(currentStep);
                return <IconComponent className="size-6" />;
              })()}
            </div>
            <span className="sr-only">Acme Inc.</span>
          </a>
          <h1 className="text-xl font-bold">{getStepTitle(currentStep)}</h1>
          <FieldDescription>{getStepDescription(currentStep)}</FieldDescription>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row lg:gap-12">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn(
            "min-h-0 flex-1",
            currentStep === 5 ? "overflow-visible" : "overflow-y-auto"
          )}>
            <FieldGroup className="space-y-8 pb-6 pr-1">

            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field>
                  <FieldLabel htmlFor="firstname" className="items-center gap-1">
                    First name
                    <Asterisk className="size-3 text-destructive" />
                  </FieldLabel>
                  <Input
                    id="firstname"
                    name="firstname"
                    type="text"
                    placeholder="Casey"
                    required
                    value={formData.firstname}
                    onChange={(event) =>
                      handleInputChange("firstname", event.target.value)
                    }
                    disabled={isBusy}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastname" className="items-center gap-1">
                    Last name
                    <Asterisk className="size-3 text-destructive" />
                  </FieldLabel>
                  <Input
                    id="lastname"
                    name="lastname"
                    type="text"
                    placeholder="Morgan"
                    required
                    value={formData.lastname}
                    onChange={(event) =>
                      handleInputChange("lastname", event.target.value)
                    }
                    disabled={isBusy}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="job_title" className="items-center gap-2">
                    Job title
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Sparkles className="size-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Helps assistant to understand your perspective and expertise</p>
                      </TooltipContent>
                    </Tooltip>
                  </FieldLabel>
                  <Input
                    id="job_title"
                    name="job_title"
                    type="text"
                    placeholder="Operations Manager"
                    value={formData.job_title}
                    onChange={(event) =>
                      handleInputChange("job_title", event.target.value)
                    }
                    disabled={isBusy}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="profile_pic_url">
                    Profile picture URL
                  </FieldLabel>
                  <Input
                    id="profile_pic_url"
                    name="profile_pic_url"
                    type="url"
                    placeholder="https://example.com/avatar.png"
                    value={formData.profile_pic_url}
                    onChange={(event) =>
                      handleInputChange("profile_pic_url", event.target.value)
                    }
                    disabled={isBusy}
                  />
                  <FieldDescription>
                    Provide a public image URL to personalise your account.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="role_experience" className="items-center gap-2">
                    How would you describe your role and experience?
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Sparkles className="size-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Shared with AI to improve responses if personalisation is enabled</p>
                      </TooltipContent>
                    </Tooltip>
                  </FieldLabel>
                  <Textarea
                    id="role_experience"
                    name="role_experience"
                    placeholder="I lead the operations team and focus on process optimisation..."
                    rows={4}
                    value={formData.role_experience}
                    onChange={(event) =>
                      handleInputChange("role_experience", event.target.value)
                    }
                    disabled={isBusy}
                  />
                  <TextLengthIndicator
                    length={formData.role_experience.length}
                    optimalRange={{ min: 50, good: 200, max: 2000 }}
                    className="mt-2"
                  />
                </Field>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field>
                  <FieldLabel htmlFor="workspace_name" className="items-center gap-1">
                    Workspace name
                    <Asterisk className="size-3 text-destructive" />
                  </FieldLabel>
                  <Input
                    id="workspace_name"
                    name="workspace_name"
                    type="text"
                    placeholder="Acme Operations"
                    required
                    value={formData.workspace_name}
                    onChange={(event) =>
                      handleInputChange("workspace_name", event.target.value)
                    }
                    disabled={isBusy}
                  />
                  <FieldDescription>
                    Displayed across the product and used in AI prompts.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="workspace_url" className="items-center gap-1">
                    Workspace URL
                    <Asterisk className="size-3 text-destructive" />
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="workspace_url"
                      name="workspace_url"
                      type="text"
                      placeholder="acme-operations"
                      required
                      value={formData.workspace_url}
                      onChange={(event) =>
                        handleInputChange("workspace_url", event.target.value)
                      }
                      disabled={isBusy}
                      className={cn(
                        (slugAvailability.checking || slugAvailability.available !== null || slugAvailability.error) && "pr-10",
                        slugAvailability.available === false && "border-destructive",
                      )}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-help">
                          {slugAvailability.checking && (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          )}
                          {!slugAvailability.checking && slugAvailability.available === true && (
                            <CheckCircle2 className="size-4 text-green-600" />
                          )}
                          {!slugAvailability.checking && slugAvailability.available === false && (
                            <XCircle className="size-4 text-destructive" />
                          )}
                          {!slugAvailability.checking && slugAvailability.error && (
                            <AlertTriangle className="size-4 text-yellow-600" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {slugAvailability.checking && "Checking availability..."}
                          {!slugAvailability.checking && slugAvailability.available === true && "This workspace URL is available"}
                          {!slugAvailability.checking && slugAvailability.available === false && "This workspace URL is already taken"}
                          {!slugAvailability.checking && slugAvailability.error && "Error checking availability. Please try again."}
                          {!slugAvailability.checking && slugAvailability.available === null && !slugAvailability.error && "Checking workspace URL availability"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    {(slugAvailability.checking || slugAvailability.available !== null || slugAvailability.error) && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {slugAvailability.checking && (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        )}
                        {!slugAvailability.checking && slugAvailability.available === true && (
                          <CheckCircle2 className="size-4 text-green-600" />
                        )}
                        {!slugAvailability.checking && slugAvailability.available === false && (
                          <XCircle className="size-4 text-destructive" />
                        )}
                        {!slugAvailability.checking && slugAvailability.error && (
                          <AlertTriangle className="size-4 text-yellow-600" />
                        )}
                      </div>
                    )}
                  </div>
                  <FieldDescription>
                    Used in your workspace URL (e.g., your-workspace.com/workspace/acme-operations)
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="workspace_profile_pic_url">
                    Workspace avatar URL
                  </FieldLabel>
                  <Input
                    id="workspace_profile_pic_url"
                    name="workspace_profile_pic_url"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={formData.workspace_profile_pic_url}
                    onChange={(event) =>
                      handleInputChange(
                        "workspace_profile_pic_url",
                        event.target.value,
                      )
                    }
                    disabled={isBusy}
                  />
                  <FieldDescription>
                    Optional image used in navigation and shared content.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="business_description" className="items-center gap-2">
                    What does your business do?
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Sparkles className="size-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Helps AI features understand your organisation&apos;s context</p>
                      </TooltipContent>
                    </Tooltip>
                  </FieldLabel>
                  <Textarea
                    id="business_description"
                    name="business_description"
                    placeholder="We provide logistics services for e-commerce retailers..."
                    rows={4}
                    value={formData.business_description}
                    onChange={(event) =>
                      handleInputChange("business_description", event.target.value)
                    }
                    disabled={isBusy}
                  />
                  <TextLengthIndicator
                    length={formData.business_description.length}
                    optimalRange={{ min: 50, good: 200, max: 4000 }}
                    className="mt-2"
                  />
                </Field>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <Field>
                  <FieldLabel htmlFor="tone_of_voice" className="items-center gap-2">
                    Assistant tone of voice
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Sparkles className="size-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Guides how chatbots and AI features communicate with you</p>
                      </TooltipContent>
                    </Tooltip>
                  </FieldLabel>
                  <div className="w-full overflow-hidden">
                    <ToggleGroup
                      type="single"
                      value={typeof formData.tone_of_voice === "string" && ["friendly", "balanced", "efficient"].includes(formData.tone_of_voice)
                        ? formData.tone_of_voice
                        : undefined}
                      onValueChange={(value) => {
                        if (value && ["friendly", "balanced", "efficient"].includes(value)) {
                          handleInputChange(
                            "tone_of_voice",
                            value as "friendly" | "balanced" | "efficient",
                          );
                        }
                      }}
                      className="w-full"
                    >
                      {TONE_OPTIONS.map((option) => (
                        <ToggleGroupItem
                          key={option.value}
                          value={option.value}
                          disabled={isBusy}
                          className="flex-1 py-2"
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
                  <FieldLabel htmlFor="technical_proficiency" className="items-center gap-2">
                    Technical explanations
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Sparkles className="size-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Adjusts the level of detail in AI-generated suggestions</p>
                      </TooltipContent>
                    </Tooltip>
                  </FieldLabel>
                  <div className="w-full overflow-hidden">
                    <ToggleGroup
                      type="single"
                      value={formData.technical_proficiency}
                      onValueChange={(value) => {
                        if (value) {
                          handleInputChange(
                            "technical_proficiency",
                            value as OnboardingInitialValues["technical_proficiency"],
                          );
                        }
                      }}
                      className="w-full"
                    >
                      {PROFICIENCY_OPTIONS.map((option) => (
                        <ToggleGroupItem
                          key={option.value}
                          value={option.value}
                          disabled={isBusy}
                          className="flex-1 py-2"
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
                  <FieldLabel htmlFor="ai_generation_guidance" className="items-center gap-2">
                    Instructions for your assistant
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Sparkles className="size-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add prompts or preferences you want AI assistants to follow</p>
                      </TooltipContent>
                    </Tooltip>
                  </FieldLabel>
                  <Textarea
                    id="ai_generation_guidance"
                    name="ai_generation_guidance"
                    placeholder="Don't use em-dashes or emojis. Prefer TypeScript examples with comments when generating code. Avoid academic language."
                    rows={5}
                    value={formData.ai_generation_guidance}
                    onChange={(event) =>
                      handleInputChange(
                        "ai_generation_guidance",
                        event.target.value,
                      )
                    }
                    disabled={isBusy}
                  />
                  <TextLengthIndicator
                    length={formData.ai_generation_guidance.length}
                    optimalRange={{ min: 50, good: 200, max: 4000 }}
                    className="mt-2"
                  />
                </Field>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Splx Studio works with your existing Postgres database. Connect your primary data source to start building pages and querying data.
                  </p>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="font-medium">Using Supabase?</span>
                    <a
                      href="https://supabase.com/docs/guides/database/connecting-to-postgres"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 underline"
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
                    id="database_connection"
                    name="database_connection"
                    type="text"
                    placeholder="postgresql://user:password@host:5432/database"
                    value={formData.database_connection}
                    onChange={(event) =>
                      handleInputChange("database_connection", event.target.value)
                    }
                    disabled={isBusy}
                    spellCheck={false}
                    className="font-mono text-sm"
                  />
                  <FieldDescription>
                    Format: postgresql://username:password@host:port/database
                  </FieldDescription>
                </Field>

                <div className="flex items-center gap-4">
                   <Button 
                      type="button" 
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || !formData.database_connection || connectionVerified}
                      variant={connectionVerified ? "outline" : undefined}
                      className={cn(connectionVerified && "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50")}
                   >
                      {isTestingConnection ? (
                         <>
                           <Loader2 className="size-4 animate-spin mr-2" />
                           Testing...
                         </>
                      ) : connectionVerified ? (
                         <>
                           <Check className="size-4 mr-2" />
                           Connection Verified
                         </>
                      ) : (
                         "Test Connection"
                      )}
                   </Button>
                </div>

                <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    You can skip this for now
                  </p>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    If you&apos;re not ready to connect a database, you can configure this later in Workspace Settings &gt; Connected Apps.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
                    {/* Lite Plan */}
                    <div
                      className={cn(
                        "flex flex-col justify-between rounded-xl border p-6 h-full",
                        "bg-card hover:shadow-md transition-shadow"
                      )}
                    >
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg">Lite</h3>
                          <span className="my-3 block text-3xl font-bold tracking-tight">Free</span>
                          <p className="text-muted-foreground text-sm">Core features to visualise your data</p>
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
                              key={index}
                              className="flex items-center gap-3 text-muted-foreground"
                            >
                              <Check className="size-4 flex-shrink-0 text-primary" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-8 h-12 text-base"
                        onClick={() => {
                          handleInputChange("selected_plan", "lite");
                          handleNext();
                        }}
                        disabled={isBusy}
                      >
                        Skip Trial
                      </Button>
                    </div>

                    {/* Plus Plan - Main focus */}
                    <div
                      className={cn(
                        "flex flex-col justify-between rounded-xl border-2 border-primary/20 p-6 h-full relative overflow-hidden",
                        "bg-muted/30 shadow-lg dark:[--color-muted:var(--color-zinc-900)]"
                      )}
                    >
                      <div className="absolute top-0 right-0 p-3">
                         <div className="bg-primary/10 uppercase text-primary text-xs font-semibold px-2 py-1 rounded-full">
                            7 day free trial
                         </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg text-primary">Plus</h3>
                           <div className="my-3">
                              <span className="text-3xl font-bold tracking-tight">£8</span> <span className="text-muted-foreground text-md mt-1 ml-1"> per month / user</span>
                              {/* <p className="text-muted-foreground text-sm mt-1">then £8 per user/month</p> */}
                           </div>
                          <p className="text-muted-foreground text-sm">Empower your team with AI assistants</p>
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
                              <li
                                key={index}
                                className="flex items-center gap-3"
                              >
                                <Check className="size-4 flex-shrink-0 text-primary" strokeWidth={2.5} />
                                <span className="font-medium">{item}</span>
                              </li>
                            ))}
                        </ul>
                      </div>

                      <Button
                        type="button"
                        className="w-full mt-8 h-12 text-base font-semibold shadow-lg shadow-primary/20"
                        onClick={() => {
                          handleInputChange("selected_plan", "plus");
                          handleNext();
                        }}
                        disabled={isBusy}
                      >
                        Get Started
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
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1 || isBusy}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>

                <div className="text-sm text-muted-foreground">
                  Step {currentStep} of {TOTAL_STEPS}
                </div>

                <Button 
                   type="submit" 
                   disabled={isBusy || (currentStep === 4 && Boolean(formData.database_connection) && !connectionVerified)} 
                   className="flex items-center gap-2"
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
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isBusy}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>

                <div className="text-sm text-muted-foreground">
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
      <div className="hidden lg:flex flex-1 items-start justify-center sticky top-6">
        <WorkspacePreview step={currentStep} data={formData} isVerified={connectionVerified} />
      </div>
      </div>
    </div>
  );
}

