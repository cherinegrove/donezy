
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface CollaboratorSelectProps {
  field: {
    value?: string[];
    onChange: (value?: string[]) => void;
  };
}

export function CollaboratorSelect({ field }: CollaboratorSelectProps) {
  const { users } = useAppContext();

  const handleValueChange = (value: string) => {
    if (!value || value === "clear") {
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

  const handleRemove = (userId: string) => {
    const currentValues = field.value || [];
    field.onChange(currentValues.filter(id => id !== userId));
  };

  const selectedUsers = (field.value || []).map(id => 
    users.find(user => user.id === id)
  ).filter(Boolean);

  return (
    <div className="space-y-2">
      <Select value="" onValueChange={handleValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select collaborators" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="clear">Clear all collaborators</SelectItem>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name} {field.value?.includes(user.id) ? "✓" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Show selected collaborators as badges */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedUsers.map((user) => (
            <Badge key={user.id} variant="secondary" className="text-xs">
              {user.name}
              <button
                type="button"
                className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                onClick={() => handleRemove(user.id)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {user.name}</span>
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
