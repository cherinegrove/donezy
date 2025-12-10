
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
  
  // Add debugging
  console.log("TaskStatuses in StatusSelect:", taskStatuses);
  
  // Use either field props or direct value/onChange props
  const actualValue = field?.value ?? value;
  console.log("Current status value:", actualValue);

  const handleChange = (value: string) => {
    console.log("Status changed to:", value);
    // Make sure we never pass an empty string value
    if (value === "") {
      console.warn("Empty string value detected in StatusSelect");
      return;
    }
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
          <>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="awaiting-feedback">Awaiting Feedback</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
