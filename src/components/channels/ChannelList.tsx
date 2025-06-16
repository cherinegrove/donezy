
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Hash, Lock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { ChannelMembersDialog } from "./ChannelMembersDialog";

interface Channel {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  created_by: string;
  created_at: string;
  member_count?: number;
}

interface ChannelListProps {
  projectId: string;
  selectedChannelId?: string;
  onChannelSelect: (channelId: string) => void;
}

export function ChannelList({ projectId, selectedChannelId, onChannelSelect }: ChannelListProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  useEffect(() => {
    fetchChannels();
    
    // Set up real-time subscription for channels
    const channelsSubscription = supabase
      .channel('channels-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchChannels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelsSubscription);
    };
  }, [projectId]);

  const fetchChannels = async () => {
    try {
      // Use any type to bypass TypeScript issues with new table
      const { data, error } = await (supabase as any)
        .from('channels')
        .select(`
          *,
          channel_members(count)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const channelsWithCount = data?.map((channel: any) => ({
        ...channel,
        member_count: channel.channel_members?.[0]?.count || 0
      })) || [];

      setChannels(channelsWithCount);
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMembersClick = (channel: Channel) => {
    setSelectedChannel(channel);
    setMembersDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading channels...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Channels
        </CardTitle>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {channels.map(channel => (
              <div
                key={channel.id}
                className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted transition-colors ${
                  selectedChannelId === channel.id ? 'bg-primary/10' : ''
                }`}
                onClick={() => onChannelSelect(channel.id)}
              >
                <div className="flex items-center gap-2 flex-1">
                  {channel.is_private ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Hash className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{channel.name}</span>
                  {channel.is_private && (
                    <Badge variant="outline" className="text-xs">Private</Badge>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMembersClick(channel);
                  }}
                  className="text-xs"
                >
                  <Users className="h-3 w-3 mr-1" />
                  {channel.member_count}
                </Button>
              </div>
            ))}
            
            {channels.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No channels yet</p>
                <p className="text-xs">Create the first channel to get started</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CreateChannelDialog
        projectId={projectId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onChannelCreated={fetchChannels}
      />

      {selectedChannel && (
        <ChannelMembersDialog
          channel={selectedChannel}
          open={membersDialogOpen}
          onOpenChange={setMembersDialogOpen}
        />
      )}
    </Card>
  );
}
