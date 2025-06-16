
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Hash, Lock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { ChannelMessageComposer } from "./ChannelMessageComposer";

interface Channel {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
}

interface Message {
  id: string;
  content: string;
  from_user_id: string;
  timestamp: string;
  mentioned_users: string[];
  sender_name?: string;
  sender_avatar?: string;
}

interface ChannelChatProps {
  channelId: string;
}

export function ChannelChat({ channelId }: ChannelChatProps) {
  const { users, currentUser } = useAppContext();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChannelInfo();
    fetchMessages();

    // Set up real-time subscription for messages
    const messagesSubscription = supabase
      .channel('channel-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
    };
  }, [channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChannelInfo = async () => {
    try {
      // Use any type to bypass TypeScript issues with new table
      const { data, error } = await (supabase as any)
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();

      if (error) throw error;
      setChannel(data as Channel);
    } catch (error) {
      console.error('Error fetching channel info:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Enrich with user data and ensure mentioned_users is always an array
      const enrichedMessages = data?.map(message => {
        const sender = users.find(u => u.id === message.from_user_id);
        return {
          ...message,
          mentioned_users: message.mentioned_users || [],
          sender_name: sender?.name || 'Unknown User',
          sender_avatar: sender?.avatar,
        };
      }) || [];

      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (content: string, mentionedUsers: string[]) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          from_user_id: currentUser.id,
          to_user_id: '', // Required field, but not used for channel messages
          subject: 'Channel Message',
          content,
          mentioned_users: mentionedUsers,
          auth_user_id: currentUser.id,
        });

      if (error) throw error;

      // Create mention records if there are mentioned users
      if (mentionedUsers.length > 0) {
        const { data: messageData } = await supabase
          .from('messages')
          .select('id')
          .eq('channel_id', channelId)
          .eq('from_user_id', currentUser.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (messageData) {
          const mentions = mentionedUsers.map(userId => ({
            message_id: messageData.id,
            mentioned_user_id: userId,
          }));

          // Use any type to bypass TypeScript issues with new table
          await (supabase as any).from('mentions').insert(mentions);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatMessageContent = (content: string, mentionedUsers: string[]) => {
    let formattedContent = content;
    
    // Replace @mentions with styled spans
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

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div>Loading channel...</div>
        </CardContent>
      </Card>
    );
  }

  if (!channel) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div>Channel not found</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          {channel.is_private ? (
            <Lock className="h-5 w-5" />
          ) : (
            <Hash className="h-5 w-5" />
          )}
          {channel.name}
          {channel.is_private && (
            <Badge variant="outline" className="text-xs">Private</Badge>
          )}
        </CardTitle>
        {channel.description && (
          <p className="text-sm text-muted-foreground">{channel.description}</p>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map(message => (
              <div key={message.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.sender_avatar} />
                  <AvatarFallback>
                    {message.sender_name?.slice(0, 2)}
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
                    className="text-sm"
                    dangerouslySetInnerHTML={{ 
                      __html: formatMessageContent(message.content, message.mentioned_users || [])
                    }}
                  />
                </div>
              </div>
            ))}
            
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          <ChannelMessageComposer
            channelId={channelId}
            onSendMessage={handleSendMessage}
          />
        </div>
      </CardContent>
    </Card>
  );
}
