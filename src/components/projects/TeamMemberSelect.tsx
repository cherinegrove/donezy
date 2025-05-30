import React, { useEffect } from "react";
import { User } from "@/types";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/hooks/use-toast";

interface TeamMemberSelectProps {
  users: User[];
  selectedValues: string[];
  onValueChange: (values: string[]) => void;
  placeholder?: string;
  maxSelection?: number;
}

export function TeamMemberSelect({
  users = [],
  selectedValues = [],
  onValueChange,
  placeholder = "Select team members",
  maxSelection = 20,
}: TeamMemberSelectProps) {
  const { toast } = useToast();
  
  // Debug logging for troubleshooting
  useEffect(() => {
    console.log("TeamMemberSelect: Props received", { 
      usersCount: users?.length || 0,
      selectedValuesCount: selectedValues?.length || 0,
      users: users?.slice(0, 3), // Log first 3 users for debugging
      selectedValues 
    });
    
    if (!Array.isArray(users)) {
      console.warn("TeamMemberSelect expected users to be array, got:", users);
    }
    if (!Array.isArray(selectedValues)) {
      console.warn("TeamMemberSelect expected selectedValues to be array, got:", selectedValues);
    }
  }, [users, selectedValues]);
  
  // Always ensure users is an array and filter out any undefined/null values
  const safeUsers = Array.isArray(users) ? users.filter(Boolean) : [];
  
  // Filter out guest users and client users from team assignment options
  const eligibleUsers = safeUsers.filter(user => {
    if (!user || typeof user !== 'object') {
      console.warn("TeamMemberSelect: Invalid user object", { user });
      return false;
    }
    if (user.role === "client" || user.is_guest) {
      console.log("TeamMemberSelect: Filtering out client/guest user", { user: user.name, role: user.role, is_guest: user.is_guest });
      return false;
    }
    if (!user.id || typeof user.id !== 'string') {
      console.warn("TeamMemberSelect: User missing valid id", { user });
      return false;
    }
    if (!user.name || typeof user.name !== 'string') {
      console.warn("TeamMemberSelect: User missing valid name", { user });
      return false;
    }
    return true;
  });
  
  console.log("TeamMemberSelect: Filtered eligible users", { 
    originalCount: safeUsers.length, 
    eligibleCount: eligibleUsers.length,
    eligibleUsers: eligibleUsers.map(u => ({ id: u.id, name: u.name, role: u.role }))
  });
  
  // Format users data for the multi-select with strict filtering
  const options = eligibleUsers.map(user => ({
    label: user?.name || "Unknown",
    value: user?.id || "",
    avatar: user?.avatar,
    initials: user?.name ? user.name.substring(0, 2).toUpperCase() : "??",
  })).filter(option => Boolean(option.value)); // Extra safety filter
  
  console.log("TeamMemberSelect: Generated options", { 
    optionsCount: options.length,
    options: options.slice(0, 3) // Log first 3 for debugging
  });
  
  // Always ensure selectedValues is an array
  const safeSelectedValues = Array.isArray(selectedValues) ? selectedValues : [];
  
  // Handle selection changes with limit
  const handleSelectionChange = (values: string[]) => {
    console.log("TeamMemberSelect: Selection changing", { from: safeSelectedValues, to: values });
    
    // Ensure values is always an array
    const safeValues = Array.isArray(values) ? values : [];
    
    // Limit the number of selections
    if (safeValues.length > maxSelection) {
      // If trying to add beyond the limit, keep only the first maxSelection items
      const trimmedValues = safeValues.slice(0, maxSelection);
      console.log("TeamMemberSelect: Trimming selection to max", { maxSelection, trimmedValues });
      onValueChange(trimmedValues);
      
      // Show toast notification
      toast({
        title: "Maximum team members reached",
        description: `You can select a maximum of ${maxSelection} team members for a project.`,
        variant: "default"
      });
      
      return;
    }
    
    console.log("TeamMemberSelect: Calling onValueChange with", safeValues);
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
          Maximum of {maxSelection} team members allowed
        </p>
      )}
      {eligibleUsers.length === 0 && safeUsers.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          No eligible team members found (guests and clients excluded)
        </p>
      )}
    </div>
  );
}
