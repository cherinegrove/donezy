import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
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
  const actualValue = field?.value ?? value;
  const isUrgent = actualValue === "urgent";

  const handleChange = (checked: boolean) => {
    const newValue = checked ? "urgent" : "medium";
    if (field?.onChange) field.onChange(newValue);
    if (onChange) onChange(newValue);
  };

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="urgent-checkbox"
        checked={isUrgent}
        onCheckedChange={handleChange}
        className={cn(isUrgent && "border-red-500 bg-red-500 data-[state=checked]:bg-red-500")}
      />
      <Label
        htmlFor="urgent-checkbox"
        className={cn(
          "text-sm font-medium cursor-pointer",
          isUrgent && "text-red-500 font-semibold"
        )}
      >
        Urgent
      </Label>
    </div>
  );
}
