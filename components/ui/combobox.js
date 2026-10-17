"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { Check, X } from "lucide-react";
import { cn } from "../../lib/utils/utils";

const Combobox = ComboboxPrimitive.Root;

function ComboboxValue(props) {
  return <ComboboxPrimitive.Value {...props} />;
}

const ComboboxChips = React.forwardRef(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Chips
    ref={ref}
    className={cn(
      "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1.5 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
      className,
    )}
    {...props}
  />
));
ComboboxChips.displayName = "ComboboxChips";

function ComboboxChip({ className, children, ...props }) {
  return (
    <ComboboxPrimitive.Chip
      className={cn(
        "inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-1 text-xs",
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ChipRemove
        render={
          <button
            type="button"
            aria-label={`Remove ${children}`}
            className="rounded-sm hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        <X className="size-3" />
      </ComboboxPrimitive.ChipRemove>
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({ className, ...props }) {
  return (
    <ComboboxPrimitive.Input
      className={cn(
        "min-w-16 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxContent({ className, anchor, ...props }) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        anchor={anchor}
        sideOffset={4}
        className="z-50"
      >
        <ComboboxPrimitive.Popup
          className={cn(
            "max-h-60 min-w-[var(--anchor-width)] overflow-y-auto rounded-md border bg-white p-1 text-foreground shadow-md",
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }) {
  return (
    <ComboboxPrimitive.List
      className={cn("max-h-56 overflow-y-auto", className)}
      {...props}
    />
  );
}

function ComboboxItem({ className, children, ...props }) {
  return (
    <ComboboxPrimitive.Item
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator className="absolute left-2">
        <Check className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxEmpty({ className, ...props }) {
  return (
    <ComboboxPrimitive.Empty
      className={cn(
        "empty:hidden px-2 py-3 text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function useComboboxAnchor() {
  return React.useRef(null);
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
};
