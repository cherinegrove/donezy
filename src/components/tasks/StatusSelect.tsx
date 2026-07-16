
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { TaskStatus } from "@/types";

interface StatusSelectProps {
  field?: {
    value: string;
    onChange: (value: string) => void;
  };
  value?: string;
  onChange?: (value: string) => void;
}

export function StatusSelect({ field, value, onChange }: StatusSelectProps) {
  const { taskStatuses } = useAppContext();

  // Use either field props or direct value/onChange props
  const actualValue = field?.value ?? value;

  const handleChange = (value: string) => {
    // Make sure we never pass an empty string value
    if (value === "") return;
    if (field?.onChange) field.onChange(value);
    if (onChange) onChange(value);
  };

  return (
    <Select
      value={actualValue}
      onValueChange={handleChange}
      defaultValue={actualValue}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {taskStatuses && taskStatuses.length > 0 ? (
          taskStatuses
            .sort((a, b) => a.order - b.order)
            .map((status) => (
              <SelectItem key={status.id} value={status.value}>
                {status.label}
              </SelectItem>
            ))
        ) : (
          // No hardcoded status fallback: the org's definitions are the single
          // source of truth. Offering made-up values here (the old behavior)
          // could save a task under a status that doesn't exist.
          <SelectItem value="__loading__" disabled>
            Loading statuses…
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
