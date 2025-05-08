
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
}

export function MentionDropdown({
  users,
  isOpen,
  position,
  onSelectUser
}: MentionDropdownProps) {
  if (!isOpen || users.length === 0) return null;

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
            Mentions
          </div>
          <div className="overflow-hidden">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => onSelectUser(user)}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
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
