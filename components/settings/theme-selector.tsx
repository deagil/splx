"use client";

import { CheckIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { type ColorTheme, useColorTheme } from "@/hooks/use-color-theme";
import { cn } from "@/lib/utils";

const COLOR_THEMES: {
  value: ColorTheme;
  label: string;
  description: string;
}[] = [
  {
    description: "Classic neutral theme",
    label: "Default",
    value: "default",
  },
  {
    description: "Cool and professional",
    label: "Slate",
    value: "slate",
  },
  {
    description: "Calm and trustworthy",
    label: "Blue",
    value: "blue",
  },
  {
    description: "Creative and modern",
    label: "Violet",
    value: "violet",
  },
  {
    description: "Fresh and natural",
    label: "Green",
    value: "green",
  },
  {
    description: "Warm and energetic",
    label: "Rose",
    value: "rose",
  },
];

const APPEARANCE_MODES = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
] as const;

export function ThemeSelector() {
  const {
    theme: colorTheme,
    setTheme: setColorTheme,
    mounted,
  } = useColorTheme();
  const { theme: appearanceMode, setTheme: setAppearanceMode } = useTheme();

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Appearance Mode (Light/Dark/System) */}
      <Field>
        <FieldLabel>Appearance</FieldLabel>
        <FieldDescription>
          Choose between light, dark, or automatically match your device.
        </FieldDescription>
        <RadioGroup
          className="mt-3 grid grid-cols-3 gap-2"
          onValueChange={setAppearanceMode}
          value={appearanceMode}
        >
          {APPEARANCE_MODES.map((mode) => (
            <Label
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg border px-4 py-3 text-center transition-colors",
                appearanceMode === mode.value
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/20 hover:border-muted-foreground/40"
              )}
              htmlFor={`appearance-${mode.value}`}
              key={mode.value}
            >
              <RadioGroupItem
                className="sr-only"
                id={`appearance-${mode.value}`}
                value={mode.value}
              />
              <span className="font-medium text-sm">{mode.label}</span>
              {appearanceMode === mode.value && (
                <CheckIcon className="ml-2 size-4" />
              )}
            </Label>
          ))}
        </RadioGroup>
      </Field>

      {/* Color Theme */}
      <Field>
        <FieldLabel>Color Theme</FieldLabel>
        <FieldDescription>
          Select a color theme that applies to both light and dark modes.
        </FieldDescription>
        <RadioGroup
          className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"
          onValueChange={(value) => setColorTheme(value as ColorTheme)}
          value={colorTheme}
        >
          {COLOR_THEMES.map((theme) => (
            <Label
              className={cn(
                "flex cursor-pointer flex-col gap-1.5 rounded-lg border p-4 transition-colors",
                colorTheme === theme.value
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/20 hover:border-muted-foreground/40"
              )}
              htmlFor={`theme-${theme.value}`}
              key={theme.value}
            >
              <RadioGroupItem
                className="sr-only"
                id={`theme-${theme.value}`}
                value={theme.value}
              />
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{theme.label}</span>
                {colorTheme === theme.value && (
                  <CheckIcon className="size-4 text-primary" />
                )}
              </div>
              <span className="text-muted-foreground text-xs">
                {theme.description}
              </span>
              {/* Color preview dots */}
              <div className="mt-2 flex gap-1.5">
                <ThemePreviewDot themeValue={theme.value} type="primary" />
                <ThemePreviewDot themeValue={theme.value} type="secondary" />
                <ThemePreviewDot themeValue={theme.value} type="accent" />
              </div>
            </Label>
          ))}
        </RadioGroup>
      </Field>
    </div>
  );
}

function ThemePreviewDot({
  themeValue,
  type,
}: {
  themeValue: ColorTheme;
  type: "primary" | "secondary" | "accent";
}) {
  const colors: Record<ColorTheme, Record<string, string>> = {
    blue: {
      accent: "hsl(210 50% 88%)",
      primary: "hsl(210 100% 40%)",
      secondary: "hsl(210 40% 92%)",
    },
    default: {
      accent: "hsl(240 4.8% 90%)",
      primary: "hsl(240 5.9% 10%)",
      secondary: "hsl(240 4.8% 93%)",
    },
    green: {
      accent: "hsl(142 40% 88%)",
      primary: "hsl(142 76% 36%)",
      secondary: "hsl(142 30% 92%)",
    },
    rose: {
      accent: "hsl(350 40% 88%)",
      primary: "hsl(350 89% 48%)",
      secondary: "hsl(350 30% 92%)",
    },
    slate: {
      accent: "hsl(215 20% 88%)",
      primary: "hsl(215 20% 25%)",
      secondary: "hsl(215 15% 92%)",
    },
    violet: {
      accent: "hsl(262 40% 88%)",
      primary: "hsl(262 83% 58%)",
      secondary: "hsl(262 30% 92%)",
    },
  };

  const color = colors[themeValue][type];

  return (
    <div
      className="size-4 rounded-full border border-muted-foreground/20"
      style={{ backgroundColor: color }}
    />
  );
}
