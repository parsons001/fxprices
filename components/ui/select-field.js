"use client";

import { Select, SelectContent, SelectTrigger, SelectValue } from "./select";

export function SelectField({
  label,
  name,
  defaultValue,
  value,
  onValueChange,
  children,
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium leading-none">
      <span>{label}</span>
      <Select
        name={name}
        defaultValue={defaultValue}
        value={value}
        onValueChange={onValueChange}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </label>
  );
}
