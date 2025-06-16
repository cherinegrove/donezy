
import React, { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

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

interface EmojiReaction {
  emoji: string;
  count: number;
  users: string[];
}

interface MessageItemProps {
  message: MessageItemData;
  onReply: (message: MessageItemData) => void;
  formatMessageContent: (content: string, mentionedUsers: string[]) => string;
}

export function MessageItem({ message, onReply, formatMessageContent }: MessageItemProps) {
  const { currentUser, session } = useAppContext();
  const { toast } = useToast();
  const [reactions, setReactions] = useState<EmojiReaction[]>([]);

  useEffect(() => {
    fetchReactions();
  }, [message.id]);

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('emoji, user_id')
        .eq('message_id', message.id);

      if (error) throw error;

      // Group reactions by emoji
      const reactionGroups: { [key: string]: EmojiReaction } = {};
      
      data?.forEach(reaction => {
        if (!reactionGroups[reaction.emoji]) {
          reactionGroups[reaction.emoji] = {
            emoji: reaction.emoji,
            count: 0,
            users: []
          };
        }
        reactionGroups[reaction.emoji].count++;
        reactionGroups[reaction.emoji].users.push(reaction.user_id);
      });

      setReactions(Object.values(reactionGroups));
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  const handleEmojiReact = async (emoji: string) => {
    if (!currentUser || !session?.user) {
      toast({
        title: "Error",
        description: "You must be logged in to react to messages",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if user already reacted with this emoji
      const existingReaction = reactions.find(r => 
        r.emoji === emoji && r.users.includes(currentUser.id)
      );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', message.id)
          .eq('user_id', currentUser.id)
          .eq('emoji', emoji);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: message.id,
            user_id: currentUser.id,
            emoji: emoji
          });

        if (error) throw error;
      }

      // Refresh reactions
      fetchReactions();
    } catch (error) {
      console.error('Error handling emoji reaction:', error);
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive"
      });
    }
  };

  const toggleReaction = (emoji: string) => {
    handleEmojiReact(emoji);
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

        {/* Emoji reactions display */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {reactions.map(reaction => (
              <Button
                key={reaction.emoji}
                variant="outline"
                size="sm"
                className={`h-6 px-2 text-xs ${
                  currentUser && reaction.users.includes(currentUser.id) 
                    ? 'bg-primary/20 border-primary' 
                    : ''
                }`}
                onClick={() => toggleReaction(reaction.emoji)}
              >
                {reaction.emoji} {reaction.count}
              </Button>
            ))}
          </div>
        )}

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
