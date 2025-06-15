
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CollaboratorSelectProps {
  field: {
    value?: string[];
    onChange: (value?: string[]) => void;
  };
}

export function CollaboratorSelect({ field }: CollaboratorSelectProps) {
  const { users } = useAppContext();

  const handleValueChange = (value: string) => {
    if (!value) {
      field.onChange([]);
      return;
    }
    
    const currentValues = field.value || [];
    if (currentValues.includes(value)) {
      // Remove if already selected
      field.onChange(currentValues.filter(id => id !== value));
    } else {
      // Add to selection
      field.onChange([...currentValues, value]);
    }
  };

  const selectedUsers = (field.value || []).map(id => 
    users.find(user => user.id === id)?.name
  ).filter(Boolean).join(", ");

  return (
    <Select value="" onValueChange={handleValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={selectedUsers || "Select collaborators"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Clear all collaborators</SelectItem>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name} {field.value?.includes(user.id) ? "✓" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
