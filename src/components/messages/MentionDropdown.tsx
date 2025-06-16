
import React from "react";
import { User } from "@/types";

interface MentionDropdownProps {
  users: User[];
  onSelect: (user: User) => void;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  isOpen?: boolean;
  position?: { top: number; left: number; };
  searchQuery?: string;
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
  
  // Filter users by search query if provided (case-insensitive)
  const filteredUsers = searchQuery 
    ? safeUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name.toLowerCase().startsWith(searchQuery.toLowerCase())
      )
    : safeUsers;
  
  // Don't render if no users match, not open, or no search query
  if (!isOpen || filteredUsers.length === 0 || !searchQuery) {
    return null;
  }

  // Apply position styling if provided
  const positionStyle = position ? {
    position: 'absolute' as const,
    top: `${position.top}px`,
    left: `${position.left}px`,
    zIndex: 9999,
    ...style
  } as React.CSSProperties : { zIndex: 9999, ...style };

  return (
    <div 
      id={id}
      className={`bg-white border border-gray-200 shadow-lg rounded-md overflow-hidden max-w-xs ${className || ''}`}
      style={positionStyle}
    >
      <div className="p-1">
        <div className="max-h-[200px] overflow-y-auto">
          {filteredUsers.slice(0, 6).map(user => {
            const firstName = user.name.split(' ')[0];
            
            return (
              <div
                key={user.id}
                onClick={() => onSelect(user)}
                className="flex items-center px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
              >
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-6 h-6 rounded-full mr-2"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                    <span className="text-xs font-medium text-blue-600">
                      {firstName.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-gray-900">{user.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
