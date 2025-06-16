
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { ChannelMessageComposer } from "./ChannelMessageComposer";

interface Message {
  id: string;
  content: string;
  from_user_id: string;
  timestamp: string;
  mentioned_users: string[];
  sender_name?: string;
  sender_avatar?: string;
  parent_message_id?: string;
}

interface MessageThreadProps {
  parentMessage: Message;
  channelId: string;
  onClose: () => void;
}

export function MessageThread({ parentMessage, channelId, onClose }: MessageThreadProps) {
  const { users, currentUser, session } = useAppContext();
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReplies();

    // Set up real-time subscription for thread replies
    const repliesSubscription = supabase
      .channel(`thread-replies-${parentMessage.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `parent_message_id=eq.${parentMessage.id}`
        },
        () => {
          fetchReplies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(repliesSubscription);
    };
  }, [parentMessage.id]);

  const fetchReplies = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('parent_message_id', parentMessage.id)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const enrichedReplies = data?.map(reply => {
        const sender = users.find(u => u.id === reply.from_user_id);
        return {
          ...reply,
          mentioned_users: reply.mentioned_users || [],
          sender_name: sender?.name || reply.from_user_id || 'Unknown User',
          sender_avatar: sender?.avatar,
        };
      }) || [];

      setReplies(enrichedReplies);
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (content: string, mentionedUsers: string[]) => {
    if (!currentUser || !session?.user) return;

    try {
      const replyData = {
        channel_id: channelId,
        parent_message_id: parentMessage.id,
        from_user_id: currentUser.id,
        to_user_id: currentUser.id,
        subject: 'Thread Reply',
        content,
        mentioned_users: mentionedUsers,
        auth_user_id: session.user.id,
      };

      const { error } = await supabase
        .from('messages')
        .insert(replyData);

      if (error) throw error;

      // Force refetch after sending
      setTimeout(() => {
        fetchReplies();
      }, 100);
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const formatMessageContent = (content: string, mentionedUsers: string[]) => {
    let formattedContent = content;
    
    mentionedUsers.forEach(userId => {
      const user = users.find(u => u.id === userId);
      if (user) {
        const mentionRegex = new RegExp(`@${user.name}`, 'g');
        formattedContent = formattedContent.replace(
          mentionRegex,
          `<span class="bg-primary/20 text-primary px-1 rounded">@${user.name}</span>`
        );
      }
    });

    return formattedContent;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium">Thread</span>
            <span className="text-sm text-muted-foreground">
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Original message */}
            <div className="border-b pb-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={parentMessage.sender_avatar} />
                  <AvatarFallback>
                    {parentMessage.sender_name?.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{parentMessage.sender_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(parentMessage.timestamp), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  
                  <div 
                    className="text-sm"
                    dangerouslySetInnerHTML={{ 
                      __html: formatMessageContent(parentMessage.content, parentMessage.mentioned_users || [])
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Replies */}
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading replies...
              </div>
            ) : (
              <div className="space-y-3">
                {replies.map(reply => (
                  <div key={reply.id} className="flex gap-3 pl-4">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={reply.sender_avatar} />
                      <AvatarFallback>
                        {reply.sender_name?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{reply.sender_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(reply.timestamp), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      
                      <div 
                        className="text-sm"
                        dangerouslySetInnerHTML={{ 
                          __html: formatMessageContent(reply.content, reply.mentioned_users || [])
                        }}
                      />
                    </div>
                  </div>
                ))}
                
                {replies.length === 0 && (
                  <div className="text-center text-muted-foreground py-4 text-sm">
                    No replies yet. Be the first to reply!
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          <ChannelMessageComposer
            channelId={channelId}
            onSendMessage={handleSendReply}
            placeholder="Reply in thread..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
