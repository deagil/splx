"use client";

import * as React from "react";
import type { TComboboxInputElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { getMentionOnSelectItem } from "@platejs/mention";
import { PlateElement } from "platejs/react";
import {
  User,
  FileText,
  Table2,
  Database,
  LayoutGrid,
  Search,
} from "lucide-react";
import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
} from "@/components/ui/inline-combobox";
import type { MentionableItem, MentionType } from "@/lib/types/mentions";
import { filterMentionableItems } from "@/lib/plate/mention-config";

export type MentionInputElementProps =
  PlateElementProps<TComboboxInputElement> & {
    mentionableItems: MentionableItem[];
  };

const onSelectItem = getMentionOnSelectItem();

/**
 * Get icon component for mention type
 */
function getMentionIcon(type: MentionType) {
  switch (type) {
    case "user":
      return User;
    case "page":
      return FileText;
    case "block":
      return LayoutGrid;
    case "table":
      return Table2;
    case "record":
      return Database;
    case "lookup":
      return Search;
    default:
      return FileText;
  }
}

/**
 * Get group label for mention type
 */
function getMentionGroup(type: MentionType): string {
  switch (type) {
    case "user":
      return "User";
    case "page":
    case "block":
      return "Context";
    case "table":
    case "record":
    case "lookup":
      return "Data";
    default:
      return "Other";
  }
}

/**
 * Group items by their mention type category
 */
function groupMentionableItems(items: MentionableItem[]) {
  const groups: Record<string, MentionableItem[]> = {};

  for (const item of items) {
    const group = getMentionGroup(item.mention.type as MentionType);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
  }

  // Return in preferred order
  const orderedGroups: Array<{ label: string; items: MentionableItem[] }> = [];
  const order = ["User", "Context", "Data", "Other"];

  for (const label of order) {
    if (groups[label]?.length > 0) {
      orderedGroups.push({ label, items: groups[label] });
    }
  }

  return orderedGroups;
}

/**
 * Custom mention input element that uses our mentionable items
 */
export function MentionInputElement({
  mentionableItems,
  ...props
}: MentionInputElementProps) {
  const { editor, element } = props;
  const [search, setSearch] = React.useState("");

  const filteredItems = React.useMemo(
    () => filterMentionableItems(mentionableItems, search),
    [mentionableItems, search]
  );

  const groupedItems = React.useMemo(
    () => groupMentionableItems(filteredItems),
    [filteredItems]
  );

  const handleSelectItem = React.useCallback(
    (item: MentionableItem) => {
      // Convert our mention item to Plate's format
      const plateItem = {
        key: item.key,
        text: item.text,
        value: JSON.stringify(item.mention), // Store full mention metadata
      };
      onSelectItem(editor, plateItem, search);
    },
    [editor, search]
  );

  return (
    <PlateElement {...props} as="span">
      <InlineCombobox
        value={search}
        element={element}
        setValue={setSearch}
        showTrigger={true}
        trigger="@"
      >
        <span className="inline-block align-baseline text-sm">
          <InlineComboboxInput />
        </span>

        <InlineComboboxContent className="my-1.5">
          <InlineComboboxEmpty>No results found</InlineComboboxEmpty>

          {groupedItems.map((group) => (
            <InlineComboboxGroup key={group.label}>
              <InlineComboboxGroupLabel>{group.label}</InlineComboboxGroupLabel>
              {group.items.map((item) => {
                const Icon = getMentionIcon(item.mention.type as MentionType);
                return (
                  <InlineComboboxItem
                    key={item.key}
                    value={item.text}
                    onClick={() => handleSelectItem(item)}
                  >
                    <Icon className="shrink-0" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-medium text-sm">
                        {item.text}
                      </span>
                      {item.description && (
                        <span className="truncate text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </InlineComboboxItem>
                );
              })}
            </InlineComboboxGroup>
          ))}
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  );
}

