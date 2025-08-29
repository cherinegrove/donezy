
import React from "react";
import { User } from "@/types";

interface MentionDropdownProps {
  users: User[];
  onSelect: (user: User) => void;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  isOpen?: boolean;
  searchQuery?: string;
}

export function MentionDropdown({ 
  users, 
  onSelect,
  id,
  className,
  style,
  isOpen,
  searchQuery = ""
}: MentionDropdownProps) {
  // Safety check - ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];
  
  console.log("MentionDropdown - isOpen:", isOpen, "searchQuery:", searchQuery, "users:", safeUsers.length);
  
  // Filter users by search query (case-insensitive)
  // Show all users if no search query, or filter by name containing the query
  const filteredUsers = searchQuery 
    ? safeUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : safeUsers;
  
  console.log("Filtered users:", filteredUsers.length);
  
  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  // Show "No users found" if no matches but still show the dropdown
  if (filteredUsers.length === 0) {
    return (
      <div 
        id={id}
        className={`bg-white border border-gray-200 shadow-lg rounded-md overflow-hidden max-w-xs min-w-[200px] ${className || ''}`}
        style={style}
      >
        <div className="p-3 text-sm text-gray-500 text-center">
          No users found matching "{searchQuery}"
        </div>
      </div>
    );
  }

  return (
    <div 
      id={id}
      className={`bg-white border border-gray-200 shadow-lg rounded-md overflow-hidden max-w-xs min-w-[200px] ${className || ''}`}
      style={style}
    >
      <div className="p-1">
        <div className="max-h-[200px] overflow-y-auto">
          {filteredUsers.slice(0, 6).map(user => {
            const firstName = user.name.split(' ')[0];
            
            return (
              <div
                key={user.auth_user_id}
                onClick={() => onSelect(user)}
                className="flex items-center px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer rounded"
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
