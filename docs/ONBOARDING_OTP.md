# Onboarding & OTP Authentication

## Overview

The Onboarding & OTP system handles new user registration, authentication, and initial workspace setup. Built on Supabase Auth, it provides a passwordless magic link flow with comprehensive user and workspace profile configuration through a multi-step onboarding process.

## Authentication Flow

### High-Level Flow

```
User visits /signin →
Enters email →
Supabase sends magic link →
User clicks link →
Redirected to /otp →
Enters OTP code →
Authenticated →
Check onboarding status →
/onboarding (if incomplete) OR / (dashboard)
```

## Components

### 1. Sign In (`app/signin/page.tsx`)

**Purpose**: Email entry for passwordless authentication.

**Features**:
- Email input with validation
- Magic link request via Supabase Auth
- Loading states and error handling
- Redirect to OTP page with email parameter

**Implementation**:
```typescript
async function handleSignIn(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/otp?email=${email}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    toast.error(error.message);
    return;
  }

  router.push(`/otp?email=${email}`);
  toast.success("Check your email for the verification code");
}
```

### 2. OTP Verification (`app/otp/page.tsx`)

**Purpose**: Verify OTP code sent to user's email.

**Features**:
- 6-digit OTP input
- Auto-submit on completion
- Resend code functionality
- Email parameter from URL
- Redirect validation

**Component Structure**:
```typescript
"use client";

function OTPPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");

  // Redirect to signin if no email
  useEffect(() => {
    if (!email) {
      router.push("/signin");
    }
  }, [email, router]);

  return (
    <div className="otp-container">
      <OTPForm />
    </div>
  );
}

export default function OTPPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OTPPageContent />
    </Suspense>
  );
}
```

### 3. OTP Form Component (`components/auth/otp-form.tsx`)

**Purpose**: Handle OTP code input and verification.

**Features**:
- 6-digit code input with auto-focus
- Auto-submit on complete
- Loading and error states
- Resend functionality with cooldown
- Keyboard navigation

**Key Implementation**:
```typescript
async function handleVerifyOTP(code: string) {
  const supabase = await createClient();
  const email = searchParams.get("email");

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (error) {
    toast.error("Invalid or expired code");
    return;
  }

  // Success - Supabase middleware will handle redirect
  router.push("/onboarding");
}
```

### 4. Onboarding Page (`app/onboarding/page.tsx`)

**Purpose**: Multi-step form for user and workspace setup.

**Features**:
- 3-step progressive disclosure
- User profile configuration
- Workspace creation
- AI personalization settings
- Workspace slug validation
- Skip logic for returning users

**Data Flow**:

1. **Load existing data**: Check if user/workspace already exists
2. **Display form**: Pre-populate with existing values
3. **Collect information**: Three steps of user input
4. **Validate**: Check required fields and workspace slug availability
5. **Save**: Update user and workspace records
6. **Mark complete**: Set `onboarding_completed = true`
7. **Redirect**: Navigate to dashboard

**Server Component**:
```typescript
async function OnboardingContent() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/signin");
  }

  // Fetch or create user record
  const tenant = await resolveTenantContext();
  const mode = getAppMode();

  let userRecord, workspaceRecord;

  if (mode === "hosted") {
    // Query main database for system tables
    const sql = postgres(process.env.POSTGRES_URL!);
    const db = drizzle(sql);
    try {
      [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, authUser.id))
        .limit(1);

      // Create if doesn't exist
      if (!userRecord) {
        await db.insert(user).values({
          id: authUser.id,
          email: authUser.email ?? "",
          onboarding_completed: false,
        });
      }

      [workspaceRecord] = await db
        .select()
        .from(workspace)
        .where(eq(workspace.id, tenant.workspaceId))
        .limit(1);
    } finally {
      await sql.end({ timeout: 5 });
    }
  } else {
    // Local mode: use resource store
    const store = await getResourceStore(tenant);
    try {
      [userRecord] = await store.withSqlClient((db) =>
        db.select().from(user).where(eq(user.id, authUser.id)).limit(1)
      );

      if (!userRecord) {
        await store.withSqlClient((db) =>
          db.insert(user).values({
            id: authUser.id,
            email: authUser.email ?? "",
            onboarding_completed: false,
          })
        );
      }

      [workspaceRecord] = await store.withSqlClient((db) =>
        db.select().from(workspace).where(eq(workspace.id, tenant.workspaceId)).limit(1)
      );
    } finally {
      await store.dispose();
    }
  }

  // Redirect if already completed
  if (userRecord?.onboarding_completed) {
    redirect("/");
  }

  return <OnboardingForm initialValues={{ /* ... */ }} />;
}
```

### 5. Onboarding Form (`components/auth/onboarding-form.tsx`)

**Purpose**: Multi-step form UI for collecting user and workspace data.

**Three Steps**:

#### Step 1: User Profile
- First name (required)
- Last name (required)
- Job title (optional)
- Profile picture URL (optional)

#### Step 2: AI Personalization
- Role/experience context (optional, ~150 chars)
- Technical proficiency (less/regular/more)
- Communication tone (friendly/balanced/efficient or custom)
- AI generation guidance (optional, ~200 chars)

#### Step 3: Workspace Setup
- Workspace name (required)
- Workspace slug (required, unique, validated)
- Workspace description (optional, ~150 chars)
- Workspace avatar URL (optional)

**Key Features**:

1. **Validation**: Real-time validation with error messages
2. **Slug Generation**: Auto-generate slug from workspace name
3. **Slug Availability**: Check uniqueness via API
4. **Progress Indicator**: Visual step progress
5. **Navigation**: Previous/Next buttons with validation
6. **Character Limits**: Visual indicators for text fields
7. **Default Values**: Sensible defaults for all fields

**Form State**:
```typescript
const [currentStep, setCurrentStep] = useState<Step>(1);
const [formData, setFormData] = useState<OnboardingInitialValues>({
  firstname: "",
  lastname: "",
  job_title: "",
  profile_pic_url: "",
  role_experience: "",
  technical_proficiency: "regular",
  tone_of_voice: "balanced",
  ai_generation_guidance: "",
  workspace_name: "",
  workspace_url: "",
  workspace_profile_pic_url: "",
  business_description: "",
});
```

**Slug Validation**:
```typescript
async function checkSlugAvailability(slug: string) {
  setSlugAvailability({ checking: true, available: null, error: false });

  try {
    const response = await fetch(
      `/api/workspace/check-slug?slug=${encodeURIComponent(slug)}`
    );
    const { available } = await response.json();

    setSlugAvailability({
      checking: false,
      available,
      error: false,
    });
  } catch (error) {
    setSlugAvailability({
      checking: false,
      available: null,
      error: true,
    });
  }
}

// Debounced check on slug change
useEffect(() => {
  if (slugCheckTimeoutRef.current) {
    clearTimeout(slugCheckTimeoutRef.current);
  }

  if (formData.workspace_url) {
    slugCheckTimeoutRef.current = setTimeout(() => {
      checkSlugAvailability(formData.workspace_url);
    }, 500);
  }
}, [formData.workspace_url]);
```

## Server Actions

### Complete Onboarding (`app/onboarding/actions.ts`)

**Purpose**: Server action to save onboarding data.

**Implementation**:
```typescript
export async function completeOnboarding(
  _prevState: CompleteOnboardingState,
  formData: FormData
): Promise<CompleteOnboardingState> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return { status: "failed", message: "Not authenticated" };
    }

    // Extract and validate form data
    const firstname = formData.get("firstname") as string;
    const lastname = formData.get("lastname") as string;
    const workspace_name = formData.get("workspace_name") as string;
    const workspace_url = formData.get("workspace_url") as string;
    // ... other fields

    // Validation
    if (!firstname || !lastname || !workspace_name || !workspace_url) {
      return {
        status: "failed",
        message: "Missing required fields",
      };
    }

    // Check slug availability
    const slugAvailable = await checkWorkspaceSlugAvailable(workspace_url);
    if (!slugAvailable) {
      return {
        status: "failed",
        message: "Workspace URL is already taken",
      };
    }

    const tenant = await resolveTenantContext();
    const mode = getAppMode();

    if (mode === "hosted") {
      // Update main database
      const sql = postgres(process.env.POSTGRES_URL!);
      const db = drizzle(sql);

      try {
        // Update user
        await db
          .update(user)
          .set({
            firstname,
            lastname,
            job_title,
            avatar_url: profile_pic_url,
            ai_context: role_experience,
            proficiency: technical_proficiency,
            ai_tone: tone_of_voice_text,
            ai_guidance: ai_generation_guidance,
            onboarding_completed: true,
          })
          .where(eq(user.id, authUser.id));

        // Update workspace
        await db
          .update(workspace)
          .set({
            name: workspace_name,
            slug: workspace_url,
            description: business_description,
            avatar_url: workspace_profile_pic_url,
          })
          .where(eq(workspace.id, tenant.workspaceId));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } else {
      // Local mode: use resource store
      const store = await getResourceStore(tenant);
      try {
        await store.withSqlClient((db) =>
          db.update(user).set({ /* ... */ }).where(eq(user.id, authUser.id))
        );

        await store.withSqlClient((db) =>
          db.update(workspace).set({ /* ... */ }).where(eq(workspace.id, tenant.workspaceId))
        );
      } finally {
        await store.dispose();
      }
    }

    revalidatePath("/");
    return { status: "success" };
  } catch (error) {
    console.error("Onboarding error:", error);
    return {
      status: "failed",
      message: "Failed to save onboarding data",
    };
  }
}
```

## Middleware Integration

### Proxy Middleware (`proxy.ts`)

**Purpose**: Bridge Supabase auth session with Next.js and handle onboarding checks.

**Key Responsibilities**:
1. Create Supabase client for server-side auth
2. Get user session
3. Check onboarding status
4. Redirect to onboarding if incomplete
5. Set session cookies

**Implementation Highlights**:
```typescript
export async function updateSession(request: NextRequest) {
  const supabase = createServerClient(/* ... */);

  // Get session
  const { data: { user } } = await supabase.auth.getUser();

  // Check if user is authenticated
  const isAuthRoute = ["/signin", "/otp", "/onboarding"].some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Redirect unauthenticated users to signin
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  // Check onboarding status
  if (user && !isAuthRoute) {
    const userRecord = await getUserRecord(user.id);

    if (!userRecord?.onboarding_completed) {
      // Redirect to onboarding
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  // Continue to requested page
  return response;
}
```

## User Data Model

### User Table Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(64) NOT NULL,
  password VARCHAR(64), -- Optional, for password auth
  firstname TEXT,
  lastname TEXT,
  avatar_url TEXT,
  job_title TEXT,
  ai_context TEXT,           -- Role/experience for AI personalization
  proficiency TEXT,          -- Technical level (less/regular/more)
  ai_tone TEXT,              -- Communication tone
  ai_guidance TEXT,          -- Additional AI guidance
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Workspace Table Schema

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_user_id UUID REFERENCES users(id),
  mode TEXT NOT NULL DEFAULT 'hosted',
  avatar_url TEXT,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## AI Personalization

### Proficiency Levels

```typescript
const PROFICIENCY_OPTIONS = [
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
```

### Tone Options

```typescript
const TONE_OPTIONS = [
  {
    value: "friendly",
    label: "Friendly",
    description: "Bubbly and joyful while on the job.",
    text: "Use a friendly, bubbly, and playful tone while maintaining professionalism...",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Pleasant to work with and always helpful.",
    text: "Maintain a balanced, professional yet approachable tone...",
  },
  {
    value: "efficient",
    label: "Efficient",
    description: "Direct and to the point, no fluff.",
    text: "Use a concise, matter-of-fact tone that prioritizes clarity and brevity...",
  },
];
```

### Custom Tone Support

Users can provide custom tone instructions:
- Toggle between preset buttons and custom text area
- Custom text saved directly to `ai_tone` field
- Preset selection converts to full text before saving

**Implementation**:
```typescript
const [customToneEnabled, setCustomToneEnabled] = useState(false);

// Convert preset selection to text
const toneText = customToneEnabled
  ? formData.tone_of_voice
  : getToneText(formData.tone_of_voice);

// Save to database
await db.update(user).set({
  ai_tone: toneText,
  // ... other fields
});
```

## Workspace Provisioning

### Initial Workspace Creation

When a user signs up, a workspace is automatically created:

1. **During signup**: Supabase Auth creates user
2. **Middleware**: Detects new user, creates workspace
3. **Workspace**: Default name "{Firstname}'s workspace"
4. **Membership**: User becomes workspace owner
5. **Connection**: Default connection created (local mode)

### Workspace Slug

**Rules**:
- Lowercase letters, numbers, hyphens only
- Must be unique across all workspaces
- Auto-generated from workspace name
- Can be manually edited
- Validated in real-time

**Generation**:
```typescript
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}
```

**Validation API**:
```typescript
// app/api/workspace/check-slug/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return Response.json({ available: false }, { status: 400 });
  }

  const sql = postgres(process.env.POSTGRES_URL!);
  const db = drizzle(sql);

  try {
    const [existing] = await db
      .select()
      .from(workspace)
      .where(eq(workspace.slug, slug))
      .limit(1);

    return Response.json({ available: !existing });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
```

## Security Considerations

### OTP Security

- **Expiration**: OTP codes expire after 10 minutes
- **Single Use**: Codes can only be used once
- **Rate Limiting**: Prevent brute force attempts
- **Email Verification**: Ensures user has access to email

### Session Management

- **HttpOnly Cookies**: Session tokens not accessible to JavaScript
- **Secure Flag**: HTTPS only in production
- **SameSite**: CSRF protection
- **Expiration**: Sessions expire after inactivity

### Workspace Isolation

- **Row-Level Security**: Database-enforced workspace isolation
- **Middleware Checks**: Verify workspace membership on every request
- **API Validation**: All endpoints check workspace ownership

## Testing

### Unit Tests

- Email validation
- Slug generation
- Form validation
- Tone text conversion

### Integration Tests

- OTP verification flow
- Onboarding completion
- Workspace creation
- User profile updates

### E2E Tests

- Complete signup flow (email → OTP → onboarding → dashboard)
- OTP resend functionality
- Slug availability checking
- Form validation and error handling

## Error Handling

### Common Errors

**Invalid OTP**:
```typescript
if (error.message.includes("Invalid")) {
  toast.error("Invalid or expired code. Please try again.");
}
```

**Expired OTP**:
```typescript
if (error.message.includes("expired")) {
  toast.error("Code expired. Please request a new one.");
}
```

**Slug Taken**:
```typescript
if (slugAvailability.available === false) {
  setError("This workspace URL is already taken");
}
```

**Network Error**:
```typescript
if (error.message.includes("network")) {
  toast.error("Network error. Please check your connection.");
}
```

## User Experience

### Loading States

- **Email Sending**: Spinner on sign-in button
- **OTP Verification**: Disabled input during verification
- **Slug Check**: Loading indicator next to slug field
- **Form Submission**: Disabled submit button with spinner

### Success Feedback

- **Email Sent**: Toast notification with success message
- **OTP Verified**: Automatic redirect to onboarding
- **Onboarding Complete**: Redirect to dashboard with welcome message
- **Step Progress**: Visual indicator showing current step

### Error Recovery

- **Invalid OTP**: Clear input, allow retry
- **Expired OTP**: Show resend button
- **Network Error**: Retry button
- **Validation Error**: Inline error messages with guidance

## Future Enhancements

### Short-Term
- Phone number verification option
- Social auth (Google, GitHub, etc.)
- Skip AI personalization option
- Improved mobile experience

### Long-Term
- Team invitations during onboarding
- Onboarding video/tutorial
- Workspace templates
- Import data during onboarding
- Multi-workspace support
- Progressive profile completion

## Related Documentation

- [AI_CHAT_SYSTEM.md](./AI_CHAT_SYSTEM.md) - AI personalization usage
- [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) - User and workspace tables
- [PAGES_SYSTEM.md](./PAGES_SYSTEM.md) - Post-onboarding user experience
