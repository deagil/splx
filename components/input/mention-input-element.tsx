"use client";

import * as React from "react";
import type { TComboboxInputElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { getMentionOnSelectItem } from "@platejs/mention";
import {
  PlateElement,
} from "platejs/react";
import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxInput,
  InlineComboboxItem,
} from "@/components/ui/inline-combobox";
import type { MentionableItem } from "@/lib/types/mentions";
import { filterMentionableItems } from "@/lib/plate/mention-config";

export type MentionInputElementProps = PlateElementProps<TComboboxInputElement> & {
  mentionableItems: MentionableItem[];
};

const onSelectItem = getMentionOnSelectItem();

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
          <InlineComboboxEmpty>No results</InlineComboboxEmpty>

          <InlineComboboxGroup>
            {filteredItems.map((item) => (
              <InlineComboboxItem
                key={item.key}
                value={item.text}
                onClick={() => handleSelectItem(item)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{item.text}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </div>
              </InlineComboboxItem>
            ))}
          </InlineComboboxGroup>
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  );
}

