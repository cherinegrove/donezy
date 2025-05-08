
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  avatar?: string;
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
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Filter users based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
      setSelectedIndex(0); // Reset selection when filter changes
    } else {
      setFilteredUsers(users);
    }
  }, [users, searchQuery]);
  
  // Handle keyboard navigation (for future enhancement)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
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
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredUsers, selectedIndex, onSelectUser]);
  
  if (!isOpen || filteredUsers.length === 0) return null;

  return (
    <div 
      className="absolute z-50 bg-white dark:bg-gray-800 border rounded-md shadow-md"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '200px'
      }}
    >
      <div className="rounded-md border shadow-md overflow-hidden">
        <div className="p-1 bg-popover text-popover-foreground">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {searchQuery ? `Matching "${searchQuery}"` : "Mentions"}
          </div>
          <div className="overflow-hidden max-h-[200px] overflow-y-auto">
            {filteredUsers.map((user, index) => (
              <div
                key={user.id}
                onClick={() => onSelectUser(user)}
                className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                  index === selectedIndex ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span>{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
