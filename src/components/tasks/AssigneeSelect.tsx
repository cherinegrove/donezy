
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AssigneeSelectProps {
  field?: {
    value: string | undefined;
    onChange: (value: string | undefined) => void;
  };
  value?: string | undefined;
  onChange?: (userId: string | undefined) => void;
}

export function AssigneeSelect({ field, value, onChange }: AssigneeSelectProps) {
  const { users } = useAppContext();
  
  // Use either field props or direct value/onChange props
  const actualValue = field?.value ?? value;
  
  const handleChange = (value: string) => {
    // Instead of converting "unassigned" to undefined here, we'll handle this 
    // differently to avoid empty string issues with Radix UI Select
    const finalValue = value === "unassigned" ? undefined : value;
    if (field?.onChange) field.onChange(finalValue);
    if (onChange) onChange(finalValue);
  };
  
  // Use a non-empty string for unassigned value in the Select component
  const selectValue = actualValue || "unassigned";
  
  // Add safety check for users array
  const safeUsers = users || [];
  
  return (
    <Select 
      value={selectValue} 
      onValueChange={handleChange}
      defaultValue={selectValue}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select assignee" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {safeUsers.length > 0 ? (
          safeUsers.map(user => (
            <SelectItem key={user.auth_user_id} value={user.auth_user_id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name?.substring(0, 2) || "?"}</AvatarFallback>
                </Avatar>
                {user.name || "Unknown User"}
              </div>
            </SelectItem>
          ))
        ) : (
          <SelectItem value="no-users" disabled>
            No users available
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
