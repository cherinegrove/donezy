
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
  onChange?: (userId: string | undefined) => void;
}

export function AssigneeSelect({ field, onChange }: AssigneeSelectProps) {
  const { users } = useAppContext();
  
  const handleChange = (value: string) => {
    const finalValue = value === "unassigned" ? undefined : value;
    if (field?.onChange) field.onChange(finalValue);
    if (onChange) onChange(finalValue);
  };
  
  return (
    <Select 
      value={field?.value || "unassigned"} 
      onValueChange={handleChange}
      defaultValue={field?.value || "unassigned"}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select assignee" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {users.map(user => (
          <SelectItem key={user.id} value={user.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              {user.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
