
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskStatus } from "@/types";

interface StatusSelectProps {
  field?: {
    value: string;
    onChange: (value: string) => void;
  };
  onChange?: (status: TaskStatus) => void;
}

export function StatusSelect({ field, onChange }: StatusSelectProps) {
  const handleChange = (value: string) => {
    // Make sure we never pass an empty string value
    if (value === "") {
      console.warn("Empty string value detected in StatusSelect");
      return;
    }
    if (field?.onChange) field.onChange(value);
    if (onChange) onChange(value as TaskStatus);
  };
  
  return (
    <Select 
      value={field?.value} 
      onValueChange={handleChange}
      defaultValue={field?.value}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="backlog">Backlog</SelectItem>
        <SelectItem value="todo">To Do</SelectItem>
        <SelectItem value="in-progress">In Progress</SelectItem>
        <SelectItem value="review">Review</SelectItem>
        <SelectItem value="done">Done</SelectItem>
      </SelectContent>
    </Select>
  );
}
