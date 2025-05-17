
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
  onChange?: (projectId: string) => void;
}

export function ProjectSelect({ field, onChange }: ProjectSelectProps) {
  const { projects } = useAppContext();
  
  const handleChange = (value: string) => {
    if (field?.onChange) field.onChange(value);
    if (onChange) onChange(value);
  };
  
  return (
    <Select 
      value={field?.value} 
      onValueChange={handleChange}
      defaultValue={field?.value}
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
