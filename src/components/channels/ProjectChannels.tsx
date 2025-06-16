
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelList } from "./ChannelList";
import { ChannelChat } from "./ChannelChat";
import { MessageCircle } from "lucide-react";

interface ProjectChannelsProps {
  projectId: string;
}

export function ProjectChannels({ projectId }: ProjectChannelsProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

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
