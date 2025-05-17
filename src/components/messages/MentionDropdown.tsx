
import React, { useEffect, useState } from "react";
import { User } from "@/types";

interface MentionDropdownProps {
  users: User[];
  isOpen: boolean;
  position: { top: number; left: number };
  onSelectUser: (user: User & { firstName?: string }) => void;
  searchQuery: string;
}

export function MentionDropdown({ 
  users, 
  isOpen, 
  position, 
  onSelectUser, 
  searchQuery 
}: MentionDropdownProps) {
  // Safety check - ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];
  
  // Filter users based on search query
  const filteredUsers = safeUsers.filter(user => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const userName = user.name.toLowerCase();
    
    // Get first name for matching too
    const firstName = user.name.split(' ')[0].toLowerCase();
    
    return userName.includes(query) || firstName.includes(query);
  });
  
  if (!isOpen || filteredUsers.length === 0) {
    return null;
  }

  return (
    <div 
      className="absolute z-50 bg-popover text-popover-foreground shadow-md rounded-md border border-border overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        minWidth: '200px',
      }}
    >
      <div className="p-1">
        <p className="text-xs text-muted-foreground px-2 py-1">
          {searchQuery ? `Matching "${searchQuery}"` : 'Select a user'}
        </p>
        <div className="max-h-[200px] overflow-y-auto">
          {filteredUsers.map(user => {
            const firstName = user.name.split(' ')[0];
            
            return (
              <div
                key={user.id}
                onClick={() => onSelectUser({ ...user, firstName })}
                className="flex items-center px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm"
              >
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-6 h-6 rounded-full mr-2"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                    <span className="text-xs font-medium">
                      {firstName.substring(0, 2)}
                    </span>
                  </div>
                )}
                <span>{user.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
