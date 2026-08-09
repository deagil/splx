"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export interface SettingsSection {
  content: ReactNode;
  description?: string;
  /** Optional decorative header that renders above the content container on the page background */
  headerDecoration?: ReactNode;
  id: string;
  title: string;
}

interface SettingsLayoutProps {
  description?: string;
  /** When set and present in `sections`, opens on that section instead of the first. */
  initialSectionId?: string;
  sections: SettingsSection[];
  title: string;
}

export function SettingsLayout({
  title,
  description,
  sections,
  initialSectionId,
}: SettingsLayoutProps) {
  const [activeSection, setActiveSection] = useState(() => {
    if (
      initialSectionId &&
      sections.some((section) => section.id === initialSectionId)
    ) {
      return initialSectionId;
    }
    return sections[0]?.id ?? "";
  });

  const sectionMap = useMemo(
    () =>
      sections.reduce<Record<string, SettingsSection>>((acc, section) => {
        acc[section.id] = section;
        return acc;
      }, {}),
    [sections]
  );

  const active = sectionMap[activeSection] ?? sections[0];

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-8 px-6 pt-8 pb-12 md:flex-row md:gap-12">
      <aside className="md:w-64 md:flex-none">
        <div className="sticky top-28 z-30 space-y-6">
          <div className="space-y-2">
            <h1 className="font-semibold text-2xl">{title}</h1>
            {description ? (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {description}
              </p>
            ) : null}
          </div>
          <nav aria-label={`${title} sections`}>
            <ul className="space-y-1">
              {sections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <li key={section.id}>
                    <button
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-left font-medium text-sm transition-colors",
                        "text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isActive && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => setActiveSection(section.id)}
                      type="button"
                    >
                      {section.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        {/* Optional header decoration - renders above the content container */}
        {active?.headerDecoration ? (
          <div
            className="hidden w-full overflow-hidden md:block"
            key={`${active.id}-header`}
          >
            {active.headerDecoration}
          </div>
        ) : null}

        {active ? (
          <div
            className="flex min-h-0 flex-1 flex-col rounded-xl border bg-muted/50 p-6 shadow-sm"
            key={active.id}
          >
            <div className="mb-4 space-y-2">
              <h2 className="font-semibold text-xl">{active.title}</h2>
              {active.description ? (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {active.description}
                </p>
              ) : null}
            </div>
            <div className="flex-1 overflow-auto">
              <div className="space-y-6">{active.content}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
