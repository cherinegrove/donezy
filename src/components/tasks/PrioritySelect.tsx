
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PriorityType = "low" | "medium" | "high";

interface PrioritySelectProps {
  field?: {
    value: string;
    onChange: (value: string) => void;
  };
  value?: string;
  onChange?: (value: string) => void;
}

export function PrioritySelect({ field, value, onChange }: PrioritySelectProps) {  
  // Use either field props or direct value/onChange props
  const actualValue = field?.value ?? value;
  
  const handleChange = (newValue: string) => {
    if (field?.onChange) field.onChange(newValue);
    if (onChange) onChange(newValue);
  };

  return (
    <Select 
      value={actualValue} 
      onValueChange={handleChange}
      defaultValue={actualValue}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select priority" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">Low</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="high">High</SelectItem>
      </SelectContent>
    </Select>
  );
}
