
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React, { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  avatar?: string;
  firstName?: string;
  email?: string;
}

interface MentionDropdownProps {
  users: User[];
  isOpen: boolean;
  position: { top: number; left: number };
  onSelectUser: (user: User) => void;
  searchQuery?: string;
}

export function MentionDropdown({
  users,
  isOpen,
  position,
  onSelectUser,
  searchQuery = ""
}: MentionDropdownProps) {
  // Ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];
  
  const [filteredUsers, setFilteredUsers] = useState<User[]>(safeUsers);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [duplicateFirstNames, setDuplicateFirstNames] = useState<Set<string>>(new Set());
  
  // Helper function to get first name
  const getFirstName = (fullName: string): string => {
    return fullName.split(' ')[0];
  };
  
  // Identify duplicate first names
  useEffect(() => {
    if (!safeUsers.length) return;
    
    const firstNameCounts: Record<string, number> = {};
    const duplicates = new Set<string>();
    
    safeUsers.forEach(user => {
      const firstName = user.firstName || getFirstName(user.name);
      firstNameCounts[firstName.toLowerCase()] = (firstNameCounts[firstName.toLowerCase()] || 0) + 1;
      
      if (firstNameCounts[firstName.toLowerCase()] > 1) {
        duplicates.add(firstName.toLowerCase());
      }
    });
    
    setDuplicateFirstNames(duplicates);
  }, [safeUsers]);
  
  // Filter users with improved partial matching - show all when query is empty
  useEffect(() => {
    if (!safeUsers.length) {
      setFilteredUsers([]);
      return;
    }
    
    if (!searchQuery) {
      // Show all users initially when @ is typed
      setFilteredUsers(safeUsers);
      setSelectedIndex(0);
      return;
    }
    
    // Only filter once the user has typed at least 1 character
    const query = searchQuery.toLowerCase();
    const filtered = safeUsers.filter(user => {
      // Get first name if it's not already provided
      const firstName = (user.firstName || getFirstName(user.name)).toLowerCase();
      const fullName = user.name.toLowerCase();
      const email = user.email?.toLowerCase() || '';
      
      // Check for matches in first name, full name, or email
      return firstName.includes(query) || 
             fullName.includes(query) || 
             email.includes(query);
    });
    
    setFilteredUsers(filtered);
    setSelectedIndex(0); // Reset selection when filter changes
  }, [safeUsers, searchQuery]);
  
  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredUsers.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredUsers[selectedIndex]) {
            onSelectUser(filteredUsers[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          // Close the dropdown will be handled in parent component
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredUsers, selectedIndex, onSelectUser]);
  
  // Don't render anything if not open
  if (!isOpen) return null;
  
  // Debug logging
  console.log("MentionDropdown render:", { 
    isOpen, 
    searchQuery, 
    userCount: safeUsers.length,
    filteredCount: filteredUsers.length,
    position
  });
  
  // Show a helpful message when there are no matches
  if (filteredUsers.length === 0) {
    return (
      <div 
        className="absolute z-50 bg-white dark:bg-gray-800 border rounded-md shadow-md p-2 text-sm"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          minWidth: '200px'
        }}
      >
        {searchQuery ? 
          `No users found matching "${searchQuery}"` :
          "Type to search for users"}
      </div>
    );
  }

  return (
    <div 
      className="absolute z-50 bg-white dark:bg-gray-800 border rounded-md shadow-md"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '200px',
        maxHeight: '300px',
        overflowY: 'auto'
      }}
    >
      <div className="rounded-md overflow-hidden">
        <div className="p-1 bg-popover text-popover-foreground">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {searchQuery ? `Matching "${searchQuery}"` : "Select a user"}
          </div>
          <div className="overflow-hidden max-h-[200px] overflow-y-auto">
            {filteredUsers.map((user, index) => {
              const firstName = user.firstName || getFirstName(user.name);
              const firstNameLower = firstName.toLowerCase();
              // Show disambiguation info for names that appear more than once
              const showFullName = duplicateFirstNames.has(firstNameLower);
              
              return (
                <div
                  key={user.id}
                  onClick={() => onSelectUser({...user, firstName})}
                  className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                    index === selectedIndex ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{firstName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span>{firstName}</span>
                    {showFullName && (
                      <span className="text-xs text-muted-foreground">{user.name}</span>
                    )}
                    {!showFullName && user.email && (
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
