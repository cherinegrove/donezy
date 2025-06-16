
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelList } from "./ChannelList";
import { ChannelChat } from "./ChannelChat";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";

interface ProjectChannelsProps {
  projectId: string;
}

export function ProjectChannels({ projectId }: ProjectChannelsProps) {
  const { currentUser } = useAppContext();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-select the first available channel
  useEffect(() => {
    const loadAndSelectChannel = async () => {
      if (!currentUser) return;

      try {
        // Fetch existing channels for this project
        const { data: existingChannels, error: checkError } = await (supabase as any)
          .from('channels')
          .select('id, name')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });

        if (checkError) throw checkError;

        // If channels exist, auto-select the first one
        if (existingChannels && existingChannels.length > 0) {
          setSelectedChannelId(existingChannels[0].id);
          console.log('Auto-selected channel:', existingChannels[0].name);
        } else {
          console.log('No channels found for project:', projectId);
        }
        
      } catch (error) {
        console.error('Error loading channels:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAndSelectChannel();
  }, [projectId, currentUser]);

  const handleChannelSelect = (channelId: string) => {
    console.log('Selected channel:', channelId);
    setSelectedChannelId(channelId);
  };

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Loading Channels</h3>
          <p className="text-sm">Setting up your project chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] flex gap-4">
      {/* Channel List Sidebar */}
      <div className="w-80">
        <ChannelList
          projectId={projectId}
          selectedChannelId={selectedChannelId || undefined}
          onChannelSelect={handleChannelSelect}
        />
      </div>
      
      {/* Chat Area */}
      <div className="flex-1">
        {selectedChannelId ? (
          <ChannelChat channelId={selectedChannelId} />
        ) : (
          <div className="h-full flex items-center justify-center border rounded-lg">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Channels Available</h3>
              <p className="text-sm">Create a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
