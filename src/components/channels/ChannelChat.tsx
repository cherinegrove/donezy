
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Hash, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { ChannelMessageComposer } from "./ChannelMessageComposer";
import { MessageItem } from "./MessageItem";
import { MessageThread } from "./MessageThread";

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
  parent_message_id?: string;
  reply_count?: number;
}

interface ChannelChatProps {
  channelId: string;
}

export function ChannelChat({ channelId }: ChannelChatProps) {
  const { users, currentUser, session } = useAppContext();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('ChannelChat loading for channel:', channelId);
    console.log('Current session:', session?.user?.email || 'No session');
    console.log('Current user:', currentUser?.name || 'No user');
    console.log('Users available:', users.length);
    
    fetchChannelInfo();
    fetchMessages();

    // Set up real-time subscription for messages
    const messagesSubscription = supabase
      .channel(`channel-messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          console.log('Real-time message update received:', payload);
          // Refetch messages to get the latest data
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

  // Auto-select the first message as thread when messages load
  useEffect(() => {
    if (messages.length > 0 && !selectedThread) {
      setSelectedThread(messages[0]);
    }
  }, [messages]);

  const fetchChannelInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();

      if (error) throw error;
      console.log('Channel info loaded:', data);
      setChannel(data as Channel);
    } catch (error) {
      console.error('Error fetching channel info:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages for channel:', channelId);
      console.log('Session user ID:', session?.user?.id);
      
      // Fetch main messages (not replies) and count their replies
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          reply_count:messages!parent_message_id(count)
        `)
        .eq('channel_id', channelId)
        .is('parent_message_id', null)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }

      console.log('Raw messages loaded:', data?.length || 0, data);

      // Enrich with user data and process reply counts
      const enrichedMessages = data?.map(message => {
        const sender = users.find(u => u.id === message.from_user_id);
        const enriched = {
          ...message,
          mentioned_users: message.mentioned_users || [],
          sender_name: sender?.name || message.from_user_id || 'Unknown User',
          sender_avatar: sender?.avatar,
          reply_count: message.reply_count?.[0]?.count || 0,
        };
        console.log('Enriched message:', enriched);
        return enriched;
      }) || [];

      console.log('Final enriched messages:', enrichedMessages);
      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch messages when users are loaded
  useEffect(() => {
    if (users.length > 0 && messages.length > 0) {
      console.log('Users loaded, re-enriching messages');
      const enrichedMessages = messages.map(message => {
        const sender = users.find(u => u.id === message.from_user_id);
        return {
          ...message,
          sender_name: sender?.name || message.from_user_id || 'Unknown User',
          sender_avatar: sender?.avatar,
        };
      });
      setMessages(enrichedMessages);
    }
  }, [users]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (content: string, mentionedUsers: string[]) => {
    if (!currentUser || !session?.user) {
      console.error('No current user or session found');
      return;
    }

    console.log('Sending message:', { 
      content, 
      mentionedUsers, 
      channelId, 
      userId: currentUser.id,
      sessionUserId: session.user.id 
    });

    try {
      const messageData = {
        channel_id: channelId,
        from_user_id: currentUser.id,
        to_user_id: currentUser.id,
        subject: 'Channel Message',
        content,
        mentioned_users: mentionedUsers,
        auth_user_id: session.user.id,
      };
      
      console.log('Inserting message with data:', messageData);

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      console.log('Message sent successfully');

      // Force a refetch of messages after sending
      setTimeout(() => {
        fetchMessages();
      }, 100);

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

          await supabase.from('mentions').insert(mentions);
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

  const handleReply = (message: Message) => {
    setSelectedThread(message);
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div>Loading chat...</div>
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

  // Always show split view with main chat on left and thread on right
  return (
    <div className="h-full flex gap-4">
      {/* Main chat (60% width) */}
      <div className="flex-[3]">
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
                  <MessageItem
                    key={message.id}
                    message={message}
                    onReply={handleReply}
                    formatMessageContent={formatMessageContent}
                  />
                ))}
                
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm mb-2">Welcome to #{channel.name}!</p>
                    <p className="text-xs">This is the beginning of your conversation. Start by sending a message below.</p>
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
      </div>

      {/* Thread view (40% width) - always visible */}
      <div className="flex-[2]">
        {selectedThread ? (
          <MessageThread
            parentMessage={selectedThread}
            channelId={channelId}
            onClose={() => setSelectedThread(null)}
          />
        ) : (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a message to view its thread</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
