
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";

interface CreateChannelDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelCreated: () => void;
}

export function CreateChannelDialog({
  projectId,
  open,
  onOpenChange,
  onChannelCreated,
}: CreateChannelDialogProps) {
  const { toast } = useToast();
  const { currentUser } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    try {
      // Create the channel - use any type to bypass TypeScript issues
      const { data: channelData, error: channelError } = await (supabase as any)
        .from('channels')
        .insert({
          project_id: projectId,
          name: formData.name,
          description: formData.description,
          is_private: formData.isPrivate,
          created_by: currentUser.auth_user_id,
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Add the creator as a member with admin role
      const { error: memberError } = await (supabase as any)
        .from('channel_members')
        .insert({
          channel_id: channelData.id,
          user_id: currentUser.auth_user_id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      toast({
        title: "Channel Created",
        description: `Channel "${formData.name}" has been created successfully.`,
      });

      setFormData({ name: "", description: "", isPrivate: false });
      onChannelCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: "Error",
        description: "Failed to create channel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Channel Name</Label>
              <Input
                id="name"
                placeholder="e.g. design-review"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use lowercase letters, numbers, and hyphens
              </p>
            </div>
            
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="What is this channel about?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="private">Private Channel</Label>
                <p className="text-xs text-muted-foreground">
                  Only invited members can view and join
                </p>
              </div>
              <Switch
                id="private"
                checked={formData.isPrivate}
                onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: checked })}
              />
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? "Creating..." : "Create Channel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
