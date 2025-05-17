
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectSelectProps {
  field?: {
    value: string;
    onChange: (value: string) => void;
  };
  value?: string;
  onChange?: (projectId: string) => void;
}

export function ProjectSelect({ field, value, onChange }: ProjectSelectProps) {
  const { projects } = useAppContext();
  
  // Use either field props or direct value/onChange props
  const actualValue = field?.value ?? value;
  
  const handleChange = (value: string) => {
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
        <SelectValue placeholder="Select project" />
      </SelectTrigger>
      <SelectContent>
        {projects.map(project => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
