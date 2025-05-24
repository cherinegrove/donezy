
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@/types";

interface EditProjectDialogProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function EditProjectDialog({ project, isOpen, onClose }: EditProjectDialogProps) {
  const { updateProject, clients, teams } = useAppContext();
  const { toast } = useToast();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState<'todo' | 'in-progress' | 'done'>(
    project.status === 'backlog' ? 'todo' : project.status as 'todo' | 'in-progress' | 'done'
  );
  const [serviceType, setServiceType] = useState(project.serviceType);
  const [startDate, setStartDate] = useState(project.startDate || "");
  const [dueDate, setDueDate] = useState(project.dueDate || "");
  const [allocatedHours, setAllocatedHours] = useState(project.allocatedHours || 0);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(project.teamIds || []);

  // Reset form when project changes
  useEffect(() => {
    setName(project.name);
    setDescription(project.description);
    setStatus(project.status === 'backlog' ? 'todo' : project.status as 'todo' | 'in-progress' | 'done');
    setServiceType(project.serviceType);
    setStartDate(project.startDate || "");
    setDueDate(project.dueDate || "");
    setAllocatedHours(project.allocatedHours || 0);
    setSelectedTeams(project.teamIds || []);
  }, [project]);

  const handleSave = () => {
    updateProject(project.id, {
      name,
      description,
      status,
      serviceType,
      startDate,
      dueDate,
      allocatedHours,
      teamIds: selectedTeams,
    });

    toast({
      title: "Project Updated",
      description: "Project has been updated successfully",
    });

    onClose();
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const client = clients.find(c => c.id === project.clientId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Client</Label>
            <div className="p-2 bg-muted rounded-md">
              {client?.name || "No client selected"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as 'todo' | 'in-progress' | 'done')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select
                value={serviceType}
                onValueChange={(value) => setServiceType(value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="bank-hours">Bank Hours</SelectItem>
                  <SelectItem value="pay-as-you-go">Pay as You Go</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allocatedHours">Allocated Hours</Label>
            <Input
              id="allocatedHours"
              type="number"
              value={allocatedHours}
              onChange={(e) => setAllocatedHours(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Teams</Label>
            <div className="grid grid-cols-2 gap-2">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`team-${team.id}`}
                    checked={selectedTeams.includes(team.id)}
                    onChange={() => handleTeamToggle(team.id)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`team-${team.id}`} className="text-sm font-normal">
                    {team.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
