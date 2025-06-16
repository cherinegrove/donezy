
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
  const [defaultChannelCreated, setDefaultChannelCreated] = useState(false);

  // Create default "General" channel if none exist
  useEffect(() => {
    const createDefaultChannel = async () => {
      if (!currentUser || defaultChannelCreated) return;

      try {
        // Check if any channels exist for this project
        const { data: existingChannels, error: checkError } = await (supabase as any)
          .from('channels')
          .select('id')
          .eq('project_id', projectId)
          .limit(1);

        if (checkError) throw checkError;

        // If no channels exist, create a default "General" channel
        if (!existingChannels || existingChannels.length === 0) {
          const { data: channelData, error: channelError } = await (supabase as any)
            .from('channels')
            .insert({
              project_id: projectId,
              name: 'general',
              description: 'General project discussion',
              is_private: false,
              created_by: currentUser.id,
            })
            .select()
            .single();

          if (channelError) throw channelError;

          // Add the creator as a member with admin role
          const { error: memberError } = await (supabase as any)
            .from('channel_members')
            .insert({
              channel_id: channelData.id,
              user_id: currentUser.id,
              role: 'admin',
            });

          if (memberError) throw memberError;

          setSelectedChannelId(channelData.id);
        }
        
        setDefaultChannelCreated(true);
      } catch (error) {
        console.error('Error creating default channel:', error);
        setDefaultChannelCreated(true); // Prevent infinite retries
      }
    };

    createDefaultChannel();
  }, [projectId, currentUser, defaultChannelCreated]);

  return (
    <div className="h-[600px] flex gap-4">
      {/* Channel List Sidebar */}
      <div className="w-80">
        <ChannelList
          projectId={projectId}
          selectedChannelId={selectedChannelId || undefined}
          onChannelSelect={setSelectedChannelId}
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
              <h3 className="text-lg font-medium mb-2">Select a Channel</h3>
              <p className="text-sm">Choose a channel from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
