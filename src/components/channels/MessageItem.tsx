
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical, MessageSquare, Heart, ThumbsUp, Smile, Zap } from "lucide-react";
import { format } from "date-fns";

interface MessageItemData {
  id: string;
  content: string;
  from_user_id: string;
  timestamp: string;
  mentioned_users: string[];
  sender_name?: string;
  sender_avatar?: string;
  reply_count?: number;
}

interface MessageItemProps {
  message: MessageItemData;
  onReply: (message: MessageItemData) => void;
  formatMessageContent: (content: string, mentionedUsers: string[]) => string;
}

export function MessageItem({ message, onReply, formatMessageContent }: MessageItemProps) {
  const handleEmojiReact = (emoji: string) => {
    // TODO: Implement emoji reactions
    console.log(`Reacting with ${emoji} to message ${message.id}`);
  };

  return (
    <div className="flex gap-3 group hover:bg-muted/30 p-2 -m-2 rounded">
      <Avatar className="h-8 w-8">
        <AvatarImage src={message.sender_avatar} />
        <AvatarFallback>
          {message.sender_name?.slice(0, 2).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{message.sender_name}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.timestamp), "MMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
        
        <div 
          className="text-sm mb-2"
          dangerouslySetInnerHTML={{ 
            __html: formatMessageContent(message.content, message.mentioned_users || [])
          }}
        />

        <div className="flex items-center justify-between">
          {message.reply_count && message.reply_count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(message)}
              className="h-6 text-xs"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
              >
                <EllipsisVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem onClick={() => handleEmojiReact("👍")}>
                <ThumbsUp className="h-4 w-4 mr-2" />
                👍 Thumbs up
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEmojiReact("❤️")}>
                <Heart className="h-4 w-4 mr-2" />
                ❤️ Heart
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEmojiReact("😄")}>
                <Smile className="h-4 w-4 mr-2" />
                😄 Smile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEmojiReact("⚡")}>
                <Zap className="h-4 w-4 mr-2" />
                ⚡ Zap
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReply(message)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Reply in thread
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
