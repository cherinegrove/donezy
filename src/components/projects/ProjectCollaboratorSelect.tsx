
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import { MultiSelect, Option } from "@/components/ui/multi-select";

interface ProjectCollaboratorSelectProps {
  selectedCollaborators: string[];
  onCollaboratorsChange: (collaborators: string[]) => void;
  disabled?: boolean;
}

export function ProjectCollaboratorSelect({
  selectedCollaborators,
  onCollaboratorsChange,
  disabled = false
}: ProjectCollaboratorSelectProps) {
  const { users } = useAppContext();

  const collaboratorOptions: Option[] = users.map(user => ({
    value: user.id,
    label: user.name,
    avatar: user.avatar,
    initials: user.name.split(' ').map(n => n[0]).join('').toUpperCase()
  }));

  return (
    <MultiSelect
      options={collaboratorOptions}
      selectedValues={selectedCollaborators}
      onValueChange={onCollaboratorsChange}
      placeholder="Select collaborators"
      disabled={disabled}
    />
  );
}
