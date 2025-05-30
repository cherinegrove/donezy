
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import { MultiSelect, Option } from "@/components/ui/multi-select";

interface ProjectCollaboratorSelectProps {
  selectedCollaborators: string[];
  onCollaboratorsChange: (collaborators: string[]) => void;
  disabled?: boolean;
}

export function ProjectCollaboratorSelect({
  selectedCollaborators,
  onCollaboratorsChange,
  disabled = false
}: ProjectCollaboratorSelectProps) {
  const { users } = useAppContext();

  console.log("ProjectCollaboratorSelect: Raw users data:", users);
  console.log("ProjectCollaboratorSelect: Selected collaborators:", selectedCollaborators);

  // Safety check: ensure users is a valid array
  if (!users || !Array.isArray(users)) {
    console.warn("ProjectCollaboratorSelect: Users data is not a valid array:", users);
    return (
      <MultiSelect
        options={[]}
        selectedValues={[]}
        onValueChange={() => {}}
        placeholder="No users available"
        disabled={true}
      />
    );
  }

  // Filter and validate users data
  const validUsers = users.filter(user => {
    // Check if user object exists and has required properties
    if (!user || typeof user !== 'object') {
      console.warn("ProjectCollaboratorSelect: Invalid user object:", user);
      return false;
    }

    // Check for required fields
    if (!user.id || typeof user.id !== 'string') {
      console.warn("ProjectCollaboratorSelect: User missing valid id:", user);
      return false;
    }

    if (!user.name || typeof user.name !== 'string') {
      console.warn("ProjectCollaboratorSelect: User missing valid name:", user);
      return false;
    }

    // Filter out guest users and clients - using consistent property names
    if (user.is_guest === true || user.clientRole) {
      console.log("ProjectCollaboratorSelect: Filtering out guest/client user:", user.name);
      return false;
    }

    return true;
  });

  console.log("ProjectCollaboratorSelect: Valid users after filtering:", validUsers.length);

  // Create collaborator options with error handling
  const collaboratorOptions: Option[] = validUsers.map(user => {
    try {
      // Safe name splitting with fallback
      const nameParts = user.name.trim().split(' ');
      const initials = nameParts
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2); // Limit to 2 characters

      return {
        value: user.id,
        label: user.name,
        avatar: user.avatar || undefined,
        initials: initials || user.name.charAt(0).toUpperCase()
      };
    } catch (error) {
      console.error("ProjectCollaboratorSelect: Error processing user:", user, error);
      // Fallback option
      return {
        value: user.id,
        label: user.name,
        initials: user.name.charAt(0).toUpperCase()
      };
    }
  });

  console.log("ProjectCollaboratorSelect: Generated options:", collaboratorOptions);

  // Ensure selectedCollaborators is always a valid array of strings
  const safeSelectedValues = React.useMemo(() => {
    if (!selectedCollaborators || !Array.isArray(selectedCollaborators)) {
      console.warn("ProjectCollaboratorSelect: selectedCollaborators is not a valid array:", selectedCollaborators);
      return [];
    }

    const validSelected = selectedCollaborators.filter(value => {
      if (!value || typeof value !== 'string') {
        console.warn("ProjectCollaboratorSelect: Invalid selected value:", value);
        return false;
      }
      
      // Ensure the selected value exists in our options
      const exists = collaboratorOptions.some(option => option.value === value);
      if (!exists) {
        console.warn("ProjectCollaboratorSelect: Selected value not found in options:", value);
      }
      return exists;
    });

    console.log("ProjectCollaboratorSelect: Safe selected values:", validSelected);
    return validSelected;
  }, [selectedCollaborators, collaboratorOptions]);

  // Safe change handler
  const handleCollaboratorsChange = React.useCallback((newValues: string[]) => {
    console.log("ProjectCollaboratorSelect: Handling change:", newValues);
    
    if (!newValues || !Array.isArray(newValues)) {
      console.warn("ProjectCollaboratorSelect: Invalid new values received:", newValues);
      onCollaboratorsChange([]);
      return;
    }

    // Filter to only valid values that exist in our options
    const validNewValues = newValues.filter(value => {
      if (!value || typeof value !== 'string') {
        console.warn("ProjectCollaboratorSelect: Invalid new value:", value);
        return false;
      }
      
      const exists = collaboratorOptions.some(option => option.value === value);
      if (!exists) {
        console.warn("ProjectCollaboratorSelect: New value not found in options:", value);
      }
      return exists;
    });

    console.log("ProjectCollaboratorSelect: Calling onCollaboratorsChange with:", validNewValues);
    onCollaboratorsChange(validNewValues);
  }, [onCollaboratorsChange, collaboratorOptions]);

  // Don't render if we don't have valid options yet
  if (collaboratorOptions.length === 0) {
    return (
      <MultiSelect
        options={[]}
        selectedValues={[]}
        onValueChange={() => {}}
        placeholder="No collaborators available"
        disabled={true}
      />
    );
  }

  return (
    <MultiSelect
      options={collaboratorOptions}
      selectedValues={safeSelectedValues}
      onValueChange={handleCollaboratorsChange}
      placeholder="Select collaborators"
      disabled={disabled}
    />
  );
}
