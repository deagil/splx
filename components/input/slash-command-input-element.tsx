"use client";

import { Sparkles, Zap } from "lucide-react";
import type { TComboboxInputElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useEditorRef } from "platejs/react";
import * as React from "react";
import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
} from "@/components/ui/inline-combobox";
import {
  type Skill,
  type SkillItem,
  skillsToCommandItems,
  useSkills,
} from "@/hooks/use-skills";

export type SlashCommandInputElementProps =
  PlateElementProps<TComboboxInputElement> & {
    onSkillSelect?: (skill: Skill) => void;
  };

/**
 * Filter skill items based on search query
 */
function filterSkillItems(items: SkillItem[], search: string): SkillItem[] {
  if (!search) {
    return items;
  }
  const lowerSearch = search.toLowerCase();
  return items.filter(
    (item) =>
      item.skill.name.toLowerCase().includes(lowerSearch) ||
      item.skill.command.toLowerCase().includes(lowerSearch) ||
      item.skill.description?.toLowerCase().includes(lowerSearch)
  );
}

/**
 * Slash command input element for skills
 * Triggered by typing "/" in the chat input
 * Uses the SlashInputPlugin from @platejs/slash-command
 */
export function SlashCommandInputElement({
  onSkillSelect,
  ...props
}: SlashCommandInputElementProps) {
  const { element } = props;
  const editor = useEditorRef();
  const [search, setSearch] = React.useState("");
  const { skills, isLoading } = useSkills();

  const skillItems = React.useMemo(
    () => skillsToCommandItems(skills),
    [skills]
  );

  const filteredItems = React.useMemo(
    () => filterSkillItems(skillItems, search),
    [skillItems, search]
  );

  const handleSelectItem = React.useCallback(
    (item: SkillItem) => {
      // Notify parent about skill selection
      onSkillSelect?.(item.skill);

      // Replace the slash input element with the command text
      // This keeps the /command visible in the input
      const path = editor.api.findPath(element);
      if (path) {
        editor.tf.removeNodes({ at: path });
        editor.tf.insertText(`/${item.skill.command} `);
      }
    },
    [editor, element, onSkillSelect]
  );

  return (
    <PlateElement {...props} as="span">
      <InlineCombobox
        element={element}
        setValue={setSearch}
        showTrigger={true}
        trigger="/"
        value={search}
      >
        <span className="inline-block align-baseline text-sm">
          <InlineComboboxInput />
        </span>

        <InlineComboboxContent className="my-1.5">
          {isLoading ? (
            <div className="flex min-h-[36px] items-center px-2.5 py-1.5 text-muted-foreground text-sm">
              Loading skills...
            </div>
          ) : (
            <>
              <InlineComboboxEmpty>
                {skills.length === 0
                  ? "No skills yet. Create one in Personalisation."
                  : "No matching skills"}
              </InlineComboboxEmpty>

              {filteredItems.length > 0 && (
                <InlineComboboxGroup>
                  <InlineComboboxGroupLabel>
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="size-3" />
                      Skills
                    </span>
                  </InlineComboboxGroupLabel>
                  {filteredItems.map((item) => (
                    <InlineComboboxItem
                      key={item.key}
                      onClick={() => handleSelectItem(item)}
                      runOnClickBeforeRemoveInput
                      value={item.text}
                    >
                      <Zap className="shrink-0 text-amber-500" />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-sm">
                            {item.skill.name}
                          </span>
                          <span className="font-mono text-muted-foreground text-xs">
                            /{item.skill.command}
                          </span>
                        </div>
                        {!!item.description && (
                          <span className="truncate text-muted-foreground text-xs">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </InlineComboboxItem>
                  ))}
                </InlineComboboxGroup>
              )}
            </>
          )}
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  );
}
