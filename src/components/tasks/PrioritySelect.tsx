
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PrioritySelectProps {
  field: {
    value: string;
    onChange: (value: string) => void;
  };
}

export function PrioritySelect({ field }: PrioritySelectProps) {  
  return (
    <Select 
      value={field.value} 
      onValueChange={field.onChange}
      defaultValue={field.value}
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
