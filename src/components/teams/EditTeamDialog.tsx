
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppContext } from "@/contexts/AppContext";
import { Team, User } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditTeamDialogProps {
  team?: Team;
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
  description: z.string().optional(),
  members: z.array(z.string()).optional(),
});

export function EditTeamDialog({ team, isOpen, onClose }: EditTeamDialogProps) {
  const { addTeam, updateTeam, users } = useAppContext();
  const { toast } = useToast();
  const isEditMode = !!team;
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: team?.name || "",
      description: team?.description || "",
      members: team?.members || [],
    },
  });
  
  // Update form values when team changes
  useEffect(() => {
    if (team) {
      form.reset({
        name: team.name,
        description: team.description,
        members: team.members,
      });
      setSelectedMembers(team.members);
    } else {
      form.reset({
        name: "",
        description: "",
        members: [],
      });
      setSelectedMembers([]);
    }
  }, [team, form]);
  
  // Filter users who are not clients
  const teamMembers = users.filter(user => user.role !== "client");
  
  const handleMemberToggle = (userId: string, checked: boolean) => {
    let newSelectedMembers: string[];
    
    if (checked) {
      newSelectedMembers = [...selectedMembers, userId];
    } else {
      newSelectedMembers = selectedMembers.filter(id => id !== userId);
    }
    
    setSelectedMembers(newSelectedMembers);
    form.setValue('members', newSelectedMembers);
  };
  
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const teamData = {
      name: values.name,
      description: values.description || "",
      members: selectedMembers,
      projectIds: team?.projectIds || [],
    };
    
    if (isEditMode && team) {
      updateTeam(team.id, teamData);
      toast({ title: "Success", description: "Team updated successfully" });
    } else {
      addTeam(teamData);
      toast({ title: "Success", description: "Team created successfully" });
    }
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Team" : "Create Team"}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Make changes to the team details and members below"
              : "Add a new team to your organization"}
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
                      placeholder="Describe the team's purpose and focus" 
                      {...field} 
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="members"
              render={() => (
                <FormItem>
                  <FormLabel>Team Members</FormLabel>
                  <FormControl>
                    <ScrollArea className="h-[200px] border rounded-md p-4">
                      <div className="space-y-2">
                        {teamMembers.map((member) => (
                          <div key={member.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`member-${member.id}`}
                              checked={selectedMembers.includes(member.id)}
                              onCheckedChange={(checked) => 
                                handleMemberToggle(member.id, checked === true)
                              }
                            />
                            <label
                              htmlFor={`member-${member.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                            >
                              <span>{member.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({member.role})
                              </span>
                            </label>
                          </div>
                        ))}
                        
                        {teamMembers.length === 0 && (
                          <p className="text-sm text-muted-foreground">No team members available</p>
                        )}
                      </div>
                    </ScrollArea>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? "Update Team" : "Create Team"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
