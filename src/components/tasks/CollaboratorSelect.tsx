
import React, { useEffect } from "react";
import { User } from "@/types";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/hooks/use-toast";

interface CollaboratorSelectProps {
  users: User[];
  selectedValues: string[];
  onValueChange: (values: string[]) => void;
  placeholder?: string;
  maxSelection?: number;
}

// This component is no longer used in tasks but kept for reference
export function CollaboratorSelect({
  users = [],
  selectedValues = [],
  onValueChange,
  placeholder = "Select collaborators",
  maxSelection = 10,
}: CollaboratorSelectProps) {
  const { toast } = useToast();
  
  // Debug logging for troubleshooting
  useEffect(() => {
    if (!Array.isArray(users)) {
      console.warn("CollaboratorSelect expected users to be array, got:", users);
    }
    if (!Array.isArray(selectedValues)) {
      console.warn("CollaboratorSelect expected selectedValues to be array, got:", selectedValues);
    }
  }, [users, selectedValues]);
  
  // Always ensure users is an array and filter out any undefined/null values
  const safeUsers = Array.isArray(users) ? users.filter(Boolean) : [];
  
  // Format users data for the multi-select with strict filtering
  const options = safeUsers.map(user => ({
    label: user?.name || "Unknown",
    value: user?.id || "",
    avatar: user?.avatar,
    initials: user?.name ? user.name.substring(0, 2) : "??",
  })).filter(option => Boolean(option.value)); // Extra safety filter
  
  // Always ensure selectedValues is an array
  const safeSelectedValues = Array.isArray(selectedValues) ? selectedValues : [];
  
  // Handle selection changes with limit
  const handleSelectionChange = (values: string[]) => {
    // Ensure values is always an array
    const safeValues = Array.isArray(values) ? values : [];
    
    // Limit the number of selections
    if (safeValues.length > maxSelection) {
      // If trying to add beyond the limit, keep only the first maxSelection items
      const trimmedValues = safeValues.slice(0, maxSelection);
      onValueChange(trimmedValues);
      
      // Show toast notification
      toast({
        title: "Maximum collaborators reached",
        description: `You can select a maximum of ${maxSelection} collaborators for a task.`,
        variant: "default"
      });
      
      return;
    }
    
    onValueChange(safeValues);
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
