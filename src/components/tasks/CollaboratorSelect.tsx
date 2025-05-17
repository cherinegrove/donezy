
import React from "react";
import { User } from "@/types";
import { MultiSelect } from "@/components/ui/multi-select";

interface CollaboratorSelectProps {
  users: User[];
  selectedValues: string[];
  onValueChange: (values: string[]) => void;
  placeholder?: string;
}

export function CollaboratorSelect({
  users,
  selectedValues,
  onValueChange,
  placeholder = "Select collaborators",
}: CollaboratorSelectProps) {
  // Format users data for the multi-select
  const options = users.map(user => ({
    label: user.name,
    value: user.id,
    avatar: user.avatar,
    initials: user.name.substring(0, 2),
  }));

  // Ensure selectedValues is always an array
  const safeSelectedValues = Array.isArray(selectedValues) ? selectedValues : [];

  return (
    <MultiSelect
      options={options}
      selectedValues={safeSelectedValues}
      onValueChange={onValueChange}
      placeholder={placeholder}
    />
  );
}
