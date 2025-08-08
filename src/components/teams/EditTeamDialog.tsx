import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppContext } from "@/contexts/AppContext";
import type { Team } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import React from "react";

const teamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
  leaderId: z.string().optional(),
  color: z.string().optional(),
});

type TeamFormData = z.infer<typeof teamSchema>;

interface EditTeamDialogProps {
  team: Team;
  open: boolean;
  onClose: () => void;
}

export function EditTeamDialog({ team, open, onClose }: EditTeamDialogProps) {
  const { updateTeam, users } = useAppContext();
  const { toast } = useToast();

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: team.name,
      description: team.description || "",
      memberIds: Array.isArray(team.memberIds) ? team.memberIds : [],
      leaderId: team.leaderId || "",
      color: team.color || "#3b82f6",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: team.name,
        description: team.description || "",
        memberIds: Array.isArray(team.memberIds) ? team.memberIds : [],
        leaderId: team.leaderId || "",
        color: team.color || "#3b82f6",
      });
    }
  }, [form, open, team]);

  const onSubmit = (data: TeamFormData) => {
    updateTeam(team.id, {
      name: data.name,
      description: data.description,
      memberIds: data.memberIds,
      leaderId: data.leaderId,
      color: data.color,
    });

    toast({
      title: "Team updated",
      description: `${data.name} has been updated successfully.`,
    });

    onClose();
  };

  // Enhanced user filtering and options mapping with safety checks
  const eligibleUsers = React.useMemo(() => {
    console.log("EditTeamDialog: Processing users for options", { users });
    
    if (!users || !Array.isArray(users)) {
      console.warn("EditTeamDialog: Users is not an array or is undefined", { users });
      return [];
    }
    
    // Filter out guest users and client users from team assignment options
    return users.filter(user => {
      if (!user || typeof user !== 'object') {
        console.warn("EditTeamDialog: Invalid user object", { user });
        return false;
      }
      if (user.role === "client" || user.is_guest) {
        return false;
      }
      if (!user.id || typeof user.id !== 'string') {
        console.warn("EditTeamDialog: User missing valid id", { user });
        return false;
      }
      if (!user.name || typeof user.name !== 'string') {
        console.warn("EditTeamDialog: User missing valid name", { user });
        return false;
      }
      return true;
    });
  }, [users]);

  // Show loading state if users haven't loaded yet
  if (!users || users.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Loading team members...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading users...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update team information and member assignments. Only team members and internal users can be added to teams.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter team name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the team's purpose"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="memberIds"
              render={({ field }) => {
                // Ensure selectedValues is always a safe array of strings
                const safeSelectedValues = Array.isArray(field.value) ? field.value : [];

                const handleMemberSelect = (userId: string) => {
                  if (safeSelectedValues.includes(userId)) {
                    field.onChange(safeSelectedValues.filter(id => id !== userId));
                  } else {
                    field.onChange([...safeSelectedValues, userId]);
                  }
                };

                const removeMember = (userId: string) => {
                  field.onChange(safeSelectedValues.filter(id => id !== userId));
                };

                return (
                  <FormItem>
                    <FormLabel>Team Members</FormLabel>
                    <Select value="" onValueChange={handleMemberSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team members" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleUsers.map((user) => (
                          <SelectItem 
                            key={user.id} 
                            value={user.id}
                            disabled={safeSelectedValues.includes(user.id)}
                          >
                            {user.name} {safeSelectedValues.includes(user.id) ? "✓" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Show selected members as badges */}
                    {safeSelectedValues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {safeSelectedValues.map((userId) => {
                          const user = eligibleUsers.find(u => u.id === userId);
                          return user ? (
                            <Badge key={userId} variant="secondary" className="text-xs">
                              {user.name}
                              <button
                                type="button"
                                className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                                onClick={() => removeMember(userId)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="leaderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Manager</FormLabel>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team manager" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eligibleUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Color</FormLabel>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={field.value || "#3b82f6"}
                      onChange={field.onChange}
                      className="w-12 h-10 border border-input rounded-md cursor-pointer"
                    />
                    <FormControl>
                      <Input
                        placeholder="#3b82f6"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Update Team</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
