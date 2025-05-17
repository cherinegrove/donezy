
import React from "react";
import { User } from "@/types";

interface MentionDropdownProps {
  users: User[];
  onSelect: (user: User) => void;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  isOpen?: boolean;              // Added isOpen prop
  position?: { top: number; left: number; };  // Added position prop
  searchQuery?: string;          // Added searchQuery prop
}

export function MentionDropdown({ 
  users, 
  onSelect,
  id,
  className,
  style,
  isOpen,
  position,
  searchQuery
}: MentionDropdownProps) {
  // Safety check - ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];
  
  // Filter users by search query if provided
  const filteredUsers = searchQuery 
    ? safeUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : safeUsers;
  
  // Don't render if no users or not open
  if ((filteredUsers.length === 0) || (isOpen === false)) {
    return null;
  }

  // Apply position styling if provided
  const positionStyle = position ? {
    position: 'absolute',
    top: `${position.top}px`,
    left: `${position.left}px`,
    ...style
  } as React.CSSProperties : style;

  return (
    <div 
      id={id}
      className={`bg-popover text-popover-foreground shadow-md rounded-md border border-border overflow-hidden ${className || ''}`}
      style={positionStyle}
    >
      <div className="p-1">
        <div className="max-h-[200px] overflow-y-auto">
          {filteredUsers.map(user => {
            const firstName = user.name.split(' ')[0];
            
            return (
              <div
                key={user.id}
                onClick={() => onSelect(user)}
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
