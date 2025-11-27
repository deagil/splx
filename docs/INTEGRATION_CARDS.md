# Integration Card Design System

This document describes the design pattern for integration cards in the workspace settings page, following modern SaaS design principles while maintaining consistency with the Splx Studio design system.

## Overview

Integration cards provide a consistent, branded interface for connecting external services (databases, AI providers, etc.) to your workspace. The design follows these principles:

1. **Brand Inheritance**: Each integration uses its own brand colors as subtle accents
2. **Uniform Layout**: Consistent card dimensions and structure across all integrations
3. **Accessibility**: WCAG AA compliant with proper focus states and ARIA labels
4. **Light/Dark Mode**: Proper contrast ratios in both themes
5. **State Management**: Clear visual feedback for loading, error, and connection states

## Component Structure

### ConnectedAppCard

Located at: `components/settings/connected-app-card.tsx`

The main card component that provides:
- Uniform layout with min-height 160px
- Brand-aware styling via `BrandConfig`
- Built-in loading and error states
- Accessibility features (ARIA labels, focus rings)
- Status pills with icons
- Optional verification badge and tags

### Basic Usage

```tsx
import { ConnectedAppCard, type BrandConfig } from "@/components/settings/connected-app-card";

const myServiceBrandConfig: BrandConfig = {
  primary: "#FF5733", // Service's primary brand color
  secondary: "#C70039", // Optional secondary color
  iconClassName: "bg-gradient-to-br from-red-50 to-white border-red-200 text-red-700 dark:from-red-950/50 dark:to-red-900/30 dark:border-red-800 dark:text-red-300",
  statusClassName: "bg-red-600 text-white border-red-600 dark:bg-red-500 dark:border-red-500",
  chipClassName: "bg-white border-red-300 text-red-800 dark:bg-red-950/30 dark:border-red-700 dark:text-red-200",
};

<ConnectedAppCard
  title="My Service"
  description="Connect to My Service for data synchronization."
  status={connected ? "Connected" : "Not connected"}
  statusDetail="Last synced 2h ago"
  icon={<MyServiceIcon className="size-5" />}
  brandConfig={myServiceBrandConfig}
  tone={connected ? "success" : "neutral"}
  tags={["Production", "Primary"]}
  verified={true}
  error={errorMessage}
  isLoading={isLoading}
  actions={<Badge>Workspace storage</Badge>}
>
  {/* Form or configuration UI */}
</ConnectedAppCard>
```

## BrandConfig Guidelines

### Color Selection

When creating a brand configuration for a new integration:

1. **Primary Color**: Use the service's official brand color (from their brand guidelines)
2. **Icon Container**: Light gradient in light mode, dark subtle gradient in dark mode
3. **Status Pill**: Use primary brand color for connected state
4. **Tag Chips**: Subtle border using brand color, maintaining readability

### Accessibility Requirements

All brand colors must meet WCAG AA contrast requirements:
- Text on background: minimum 4.5:1 ratio
- Interactive elements: minimum 3:1 ratio
- Focus indicators: visible in both light and dark modes

If a brand color fails contrast, adjust using:
- Hue-preserving lightening/darkening
- Opacity adjustments
- Background color modifications

### Example Brand Configurations

#### Postgres (Blue #336791)

```tsx
const postgresBrandConfig: BrandConfig = {
  primary: "#336791",
  iconClassName: "bg-gradient-to-br from-blue-50 to-white border-blue-200 text-blue-700 dark:from-blue-950/50 dark:to-blue-900/30 dark:border-blue-800 dark:text-blue-300",
  statusClassName: "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500",
  chipClassName: "bg-white border-blue-300 text-blue-800 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-200",
};
```

#### OpenAI (Green #10A37F)

```tsx
const openAiBrandConfig: BrandConfig = {
  primary: "#10A37F",
  secondary: "#6366F1",
  iconClassName: "bg-gradient-to-br from-emerald-50 to-white border-emerald-200 text-emerald-700 dark:from-emerald-950/50 dark:to-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300",
  statusClassName: "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500",
  chipClassName: "bg-white border-emerald-300 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-200",
};
```

## Card Layout Specifications

### Header Row
- **Logo/Icon**: 32px (size-8), rounded-lg, with brand gradient background
- **App Name**: Text-base, font-semibold
- **Verified Badge**: Optional CheckCircle2 icon (size-4)
- **Status Pill**: Right-aligned, with icon indicator
- **Metadata**: Small text below status (last synced, etc.)

### Body
- **Description**: Max 120 characters, text-sm
- **Tags**: Optional tag chips with brand-colored borders
- **Content Area**: Form fields, connection settings, etc.
- **Error State**: Inline alert with destructive styling
- **Loading State**: Skeleton shimmer animation

### Footer (Optional)
- **Actions**: Primary and secondary buttons
- **Min Hit Area**: 40px for all interactive elements
- **Focus States**: Visible focus ring with proper contrast

## States

### Loading State
```tsx
<ConnectedAppCard isLoading={true} {...props}>
  {/* Children hidden, skeleton shown */}
</ConnectedAppCard>
```

### Error State
```tsx
<ConnectedAppCard error="Connection failed. Check your credentials." {...props}>
  {/* Error banner shown above children */}
</ConnectedAppCard>
```

### Connected State
```tsx
<ConnectedAppCard
  status="Connected"
  tone="success"
  {...props}
>
  {/* Children shown normally */}
</ConnectedAppCard>
```

## Adding a New Integration

1. **Create Brand Config**
   - Get official brand colors from the service's brand guidelines
   - Generate light and dark mode class strings
   - Ensure WCAG AA contrast compliance

2. **Define Component**
   - Import ConnectedAppCard and BrandConfig
   - Set up state management (SWR for data fetching)
   - Handle loading, error, and success states

3. **Implement Form**
   - Use Field, FieldGroup, FieldLabel from `components/ui/field`
   - Add validation with Zod schemas
   - Include reset and save buttons

4. **Add to Settings Page**
   - Import and render in `connected-apps-section.tsx`
   - Follow the existing pattern for consistency

## Best Practices

### Do's
✅ Use the service's official brand colors
✅ Test in both light and dark modes
✅ Include proper ARIA labels and roles
✅ Show clear error messages
✅ Provide loading feedback
✅ Use skeleton states for async operations
✅ Include metadata (last synced, storage location)

### Don'ts
❌ Don't create custom card layouts
❌ Don't skip accessibility attributes
❌ Don't use colors that fail contrast checks
❌ Don't show technical error messages to users
❌ Don't forget to handle loading states
❌ Don't modify core typography or spacing

## Theme Tokens

The cards use the app's existing design tokens:

```css
/* Light Mode */
--card: hsl(0 0% 98%)
--card-foreground: hsl(240 10% 3.9%)
--muted: hsl(240 4.8% 96%)
--border: hsl(240 5.9% 88%)

/* Dark Mode */
--card: hsl(240 8% 8%)
--card-foreground: hsl(0 0% 98%)
--muted: hsl(240 3.7% 12%)
--border: hsl(240 3.7% 18%)
```

Brand colors are applied as limited accents on top of these base tokens.

## Migration Guide

### From Old Pattern

If you have an existing integration card using the old pattern:

**Before:**
```tsx
<ConnectedAppCard
  icon={<Icon className="size-6" />}
  iconAccentClassName="bg-gradient-to-br from-blue-50 to-white border-blue-200 text-blue-700"
  statusVariant="secondary"
>
  {error && <ErrorNotice message={error} />}
  {loading && <Skeleton />}
  {/* form */}
</ConnectedAppCard>
```

**After:**
```tsx
<ConnectedAppCard
  icon={<Icon className="size-5" />}
  brandConfig={myBrandConfig}
  error={error}
  isLoading={loading}
>
  {/* form */}
</ConnectedAppCard>
```

### Breaking Changes
- `iconAccentClassName` is deprecated (use `brandConfig` instead)
- Manual error/loading rendering is replaced by `error` and `isLoading` props
- Icon size changed from `size-6` to `size-5` for better proportions

## Support

For questions or issues with the integration card system:
1. Check this documentation
2. Review existing implementations in `connected-apps-section.tsx`
3. Refer to the component source at `components/settings/connected-app-card.tsx`
