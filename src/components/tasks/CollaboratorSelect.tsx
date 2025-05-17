import React from "react";
import { User } from "@/types";
import { MultiSelect } from "@/components/ui/multi-select";

interface CollaboratorSelectProps {
  users: User[];
  selectedValues: string[];
  onValueChange: (values: string[]) => void;
  placeholder?: string;
  maxSelection?: number;
}

export function CollaboratorSelect({
  users,
  selectedValues,
  onValueChange,
  placeholder = "Select collaborators",
  maxSelection = 10,
}: CollaboratorSelectProps) {
  // Ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];
  
  // Format users data for the multi-select
  const options = safeUsers.map(user => ({
    label: user.name,
    value: user.id,
    avatar: user.avatar,
    initials: user.name.substring(0, 2),
  }));

  // Ensure selectedValues is always an array
  const safeSelectedValues = Array.isArray(selectedValues) ? selectedValues : [];
  
  // Handle selection changes with limit
  const handleSelectionChange = (values: string[]) => {
    // Limit the number of selections
    if (values.length > maxSelection) {
      // If trying to add beyond the limit, keep only the first maxSelection items
      onValueChange(values.slice(0, maxSelection));
      return;
    }
    onValueChange(values);
  };

  return (
    <div>
      <MultiSelect
        options={options}
        selectedValues={safeSelectedValues}
        onValueChange={handleSelectionChange}
        placeholder={placeholder}
      />
      {safeSelectedValues.length >= maxSelection && (
        <p className="text-xs text-muted-foreground mt-1">
          Maximum of {maxSelection} collaborators allowed
        </p>
      )}
    </div>
  );
}
