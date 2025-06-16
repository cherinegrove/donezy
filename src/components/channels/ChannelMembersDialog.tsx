
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, Crown, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { AddMemberDialog } from "./AddMemberDialog";

interface Channel {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  created_by: string;
}

interface ChannelMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user_name?: string;
  user_avatar?: string;
}

interface ChannelMembersDialogProps {
  channel: Channel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChannelMembersDialog({
  channel,
  open,
  onOpenChange,
}: ChannelMembersDialogProps) {
  const { users } = useAppContext();
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, channel.id]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('channel_members')
        .select('*')
        .eq('channel_id', channel.id)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      // Enrich with user data
      const enrichedMembers = data?.map(member => {
        const user = users.find(u => u.id === member.user_id);
        return {
          ...member,
          user_name: user?.name || 'Unknown User',
          user_avatar: user?.avatar,
        };
      }) || [];

      setMembers(enrichedMembers);
    } catch (error) {
      console.error('Error fetching channel members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      
      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {channel.name} Members
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
            <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" />
              Add Member
            </Button>
          </div>
          
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-4">Loading members...</div>
              ) : (
                members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user_avatar} />
                        <AvatarFallback>
                          {member.user_name?.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.user_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {member.role === 'admin' && (
                        <Badge variant="secondary" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {member.user_id !== channel.created_by && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {!loading && members.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No members yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        <AddMemberDialog
          channelId={channel.id}
          existingMemberIds={members.map(m => m.user_id)}
          open={addMemberDialogOpen}
          onOpenChange={setAddMemberDialogOpen}
          onMemberAdded={fetchMembers}
        />
      </DialogContent>
    </Dialog>
  );
}
