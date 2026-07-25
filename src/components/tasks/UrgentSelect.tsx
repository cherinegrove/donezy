import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface UrgentSelectProps {
  field?: {
    value: string;
    onChange: (value: string) => void;
  };
  value?: string;
  onChange?: (value: string) => void;
}

export function UrgentSelect({ field, value, onChange }: UrgentSelectProps) {
  const actualValue = field?.value ?? value ?? "normal";
  const isUrgent = actualValue === "urgent";

  const handleChange = (newValue: string) => {
    if (field?.onChange) field.onChange(newValue);
    if (onChange) onChange(newValue);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-red-500 bg-red-50 dark:bg-red-950/20";
      case "medium":
        return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      case "normal":
        return "border-gray-300 bg-background";
      default:
        return "border-gray-300 bg-background";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">Priority</Label>
      <Select value={actualValue} onValueChange={handleChange}>
        <SelectTrigger className={cn("w-full", getPriorityColor(actualValue))}>
          <SelectValue placeholder="Select priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="urgent">
            <span className="font-semibold text-red-600">Urgent</span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
