
import React from "react";
import { User } from "@/types";

interface MentionDropdownProps {
  users: User[];
  onSelect: (user: User) => void; // Added onSelect prop
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function MentionDropdown({ 
  users, 
  onSelect,
  id,
  className,
  style
}: MentionDropdownProps) {
  // Safety check - ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];
  
  if (safeUsers.length === 0) {
    return null;
  }

  return (
    <div 
      id={id}
      className={`bg-popover text-popover-foreground shadow-md rounded-md border border-border overflow-hidden ${className || ''}`}
      style={style}
    >
      <div className="p-1">
        <div className="max-h-[200px] overflow-y-auto">
          {safeUsers.map(user => {
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
