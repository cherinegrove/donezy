
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";

interface CollaboratorSelectProps {
  field: {
    value: string[];
    onChange: (value: string[]) => void;
  };
}

export function CollaboratorSelect({ field }: CollaboratorSelectProps) {
  const { users } = useAppContext();
  
  // Create options for the multi-select component
  const options = users.map(user => ({
    label: user.name,
    value: user.id,
    avatar: user.avatar,
    initials: user.name.substring(0, 2)
  }));
  
  return (
    <MultiSelect
      options={options}
      selectedValues={field.value || []}
      onValueChange={field.onChange}
      placeholder="Select collaborators"
      itemRenderer={(option) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={option.avatar} />
            <AvatarFallback>{option.initials}</AvatarFallback>
          </Avatar>
          {option.label}
        </div>
      )}
    />
  );
}
