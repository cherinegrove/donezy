
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";

interface AddMemberDialogProps {
  channelId: string;
  existingMemberIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberAdded: () => void;
}

export function AddMemberDialog({
  channelId,
  existingMemberIds,
  open,
  onOpenChange,
  onMemberAdded,
}: AddMemberDialogProps) {
  const { toast } = useToast();
  const { users } = useAppContext();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter out users who are already members
  const availableUsers = users.filter(user => !existingMemberIds.includes(user.id));

  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds([...selectedUserIds, userId]);
    } else {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    }
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) return;

    setLoading(true);
    try {
      const membersToAdd = selectedUserIds.map(userId => ({
        channel_id: channelId,
        user_id: userId,
        role: 'member',
      }));

      const { error } = await supabase
        .from('channel_members')
        .insert(membersToAdd);

      if (error) throw error;

      toast({
        title: "Members Added",
        description: `${selectedUserIds.length} member${selectedUserIds.length !== 1 ? 's' : ''} added to the channel.`,
      });

      setSelectedUserIds([]);
      onMemberAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding members:', error);
      toast({
        title: "Error",
        description: "Failed to add members. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Members to Channel</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {availableUsers.length > 0 ? (
                availableUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={(checked) => handleUserToggle(user.id, checked)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>
                        {user.name?.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">All users are already members</p>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {selectedUserIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddMembers}
            disabled={loading || selectedUserIds.length === 0}
          >
            {loading ? "Adding..." : `Add ${selectedUserIds.length || ''} Member${selectedUserIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
