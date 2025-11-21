"use client";

import { useColorTheme, type ColorTheme } from "@/hooks/use-color-theme";
import { useTheme } from "next-themes";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const COLOR_THEMES: { value: ColorTheme; label: string; description: string }[] = [
  {
    value: "default",
    label: "Default",
    description: "Classic neutral theme",
  },
  {
    value: "slate",
    label: "Slate",
    description: "Cool and professional",
  },
  {
    value: "blue",
    label: "Blue",
    description: "Calm and trustworthy",
  },
  {
    value: "violet",
    label: "Violet",
    description: "Creative and modern",
  },
  {
    value: "green",
    label: "Green",
    description: "Fresh and natural",
  },
  {
    value: "rose",
    label: "Rose",
    description: "Warm and energetic",
  },
];

const APPEARANCE_MODES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export function ThemeSelector() {
  const { theme: colorTheme, setTheme: setColorTheme, mounted } = useColorTheme();
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
          value={appearanceMode}
          onValueChange={setAppearanceMode}
        >
          {APPEARANCE_MODES.map((mode) => (
            <Label
              key={mode.value}
              htmlFor={`appearance-${mode.value}`}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg border px-4 py-3 text-center transition-colors",
                appearanceMode === mode.value
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/20 hover:border-muted-foreground/40"
              )}
            >
              <RadioGroupItem
                id={`appearance-${mode.value}`}
                value={mode.value}
                className="sr-only"
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
          value={colorTheme}
          onValueChange={(value) => setColorTheme(value as ColorTheme)}
        >
          {COLOR_THEMES.map((theme) => (
            <Label
              key={theme.value}
              htmlFor={`theme-${theme.value}`}
              className={cn(
                "flex cursor-pointer flex-col gap-1.5 rounded-lg border p-4 transition-colors",
                colorTheme === theme.value
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/20 hover:border-muted-foreground/40"
              )}
            >
              <RadioGroupItem
                id={`theme-${theme.value}`}
                value={theme.value}
                className="sr-only"
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
    default: {
      primary: "hsl(240 5.9% 10%)",
      secondary: "hsl(240 4.8% 93%)",
      accent: "hsl(240 4.8% 90%)",
    },
    slate: {
      primary: "hsl(215 20% 25%)",
      secondary: "hsl(215 15% 92%)",
      accent: "hsl(215 20% 88%)",
    },
    blue: {
      primary: "hsl(210 100% 40%)",
      secondary: "hsl(210 40% 92%)",
      accent: "hsl(210 50% 88%)",
    },
    violet: {
      primary: "hsl(262 83% 58%)",
      secondary: "hsl(262 30% 92%)",
      accent: "hsl(262 40% 88%)",
    },
    green: {
      primary: "hsl(142 76% 36%)",
      secondary: "hsl(142 30% 92%)",
      accent: "hsl(142 40% 88%)",
    },
    rose: {
      primary: "hsl(350 89% 48%)",
      secondary: "hsl(350 30% 92%)",
      accent: "hsl(350 40% 88%)",
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
