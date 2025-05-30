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
import { MultiSelect } from "@/components/ui/multi-select";
import React from "react";

const teamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
  leaderId: z.string().optional(),
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
      memberIds: team.memberIds || [],
      leaderId: team.leaderId || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: team.name,
        description: team.description || "",
        memberIds: team.memberIds || [],
        leaderId: team.leaderId || "",
      });
    }
  }, [form, open, team]);

  const onSubmit = (data: TeamFormData) => {
    updateTeam(team.id, {
      name: data.name,
      description: data.description,
      memberIds: data.memberIds,
      leaderId: data.leaderId,
    });

    toast({
      title: "Team updated",
      description: `${data.name} has been updated successfully.`,
    });

    onClose();
  };

  // Enhanced user filtering and options mapping with safety checks
  const userOptions = React.useMemo(() => {
    console.log("EditTeamDialog: Processing users for options", { users });
    
    if (!users || !Array.isArray(users)) {
      console.warn("EditTeamDialog: Users is not an array or is undefined", { users });
      return [];
    }
    
    // Filter out guest users and client users from team assignment options
    const eligibleUsers = users.filter(user => {
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
    
    const validOptions = eligibleUsers.map(user => ({
      value: user.id,
      label: user.name
    }));
    
    console.log("EditTeamDialog: Generated user options", { 
      originalCount: users.length, 
      eligibleCount: eligibleUsers.length,
      validCount: validOptions.length,
      validOptions 
    });
    
    return validOptions;
  }, [users]);

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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Members</FormLabel>
                  <MultiSelect
                    options={userOptions}
                    selectedValues={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select team members"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="leaderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Leader</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter team leader's ID" {...field} />
                  </FormControl>
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
