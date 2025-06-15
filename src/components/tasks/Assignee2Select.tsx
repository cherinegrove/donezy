
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Assignee2SelectProps {
  field: {
    value?: string;
    onChange: (value?: string) => void;
  };
}

export function Assignee2Select({ field }: Assignee2SelectProps) {
  const { users } = useAppContext();

  return (
    <Select value={field.value || ""} onValueChange={(value) => field.onChange(value || undefined)}>
      <SelectTrigger>
        <SelectValue placeholder="Select assignee 2" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">No assignee 2</SelectItem>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
