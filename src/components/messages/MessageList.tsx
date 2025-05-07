
import { useAppContext } from "@/contexts/AppContext";
import { Message } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";

interface MessageListProps {
  messages: Message[];
  onSelect: (message: Message) => void;
  selectedMessageId?: string;
}

export function MessageList({ messages, onSelect, selectedMessageId }: MessageListProps) {
  const { getUserById, markMessageAsRead, users } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  
  // Define filter options
  const filterOptions: FilterOption[] = [
    {
      id: "senders",
      name: "From",
      options: users.map(user => ({
        id: user.id,
        label: user.name,
      })),
    },
    {
      id: "read",
      name: "Status",
      options: [
        { id: "read", label: "Read" },
        { id: "unread", label: "Unread" },
      ],
    },
  ];

  const handleFilterChange = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
  };
  
  // Filter messages based on search and active filters
  const filteredMessages = messages.filter(message => {
    // Text search filter
    const matchesSearch = 
      message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Apply other filters
    for (const [filterId, values] of Object.entries(activeFilters)) {
      if (values.length === 0) continue;

      switch (filterId) {
        case "senders":
          if (!values.includes(message.senderId)) {
            return false;
          }
          break;
        case "read":
          if (values.includes("read") && !message.read) {
            return false;
          }
          if (values.includes("unread") && message.read) {
            return false;
          }
          break;
      }
    }

    return true;
  });
  
  const handleSelectMessage = (message: Message) => {
    if (!message.read) {
      markMessageAsRead(message.id);
    }
    onSelect(message);
  };
  
  return (
    <div className="flex flex-col h-full border rounded-md">
      <div className="p-3 border-b space-y-3">
        <Input 
          placeholder="Search messages..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <FilterBar filters={filterOptions} onFilterChange={handleFilterChange} />
      </div>
      
      <div className="overflow-auto flex-1">
        {filteredMessages.length > 0 ? (
          filteredMessages.map((message) => {
            const sender = getUserById(message.senderId);
            
            return (
              <div 
                key={message.id}
                className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedMessageId === message.id ? 'bg-muted' : ''
                } ${
                  !message.read ? 'font-medium' : ''
                }`}
                onClick={() => handleSelectMessage(message)}
              >
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={sender?.avatar} />
                    <AvatarFallback>
                      {sender?.name.slice(0, 2) || 'UN'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span className="text-sm">{sender?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.timestamp), "MMM d")}
                      </span>
                    </div>
                    
                    <h3 className="text-sm truncate">
                      {!message.read && (
                        <span className="inline-block w-2 h-2 bg-primary rounded-full mr-1"></span>
                      )}
                      {message.subject}
                    </h3>
                    
                    <p className="text-xs text-muted-foreground truncate">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <p className="text-muted-foreground">No messages found</p>
          </div>
        )}
      </div>
    </div>
  );
}
