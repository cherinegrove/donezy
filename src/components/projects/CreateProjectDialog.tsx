import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormValues {
  name: string;
  description: string;
  clientId: string;
  serviceType: 'project' | 'bank-hours' | 'pay-as-you-go';
  startDate?: string;
  dueDate?: string;
  allocatedHours?: number;
  teamIds?: string[];
}

export function CreateProjectDialog({ isOpen, onClose }: CreateProjectDialogProps) {
  const { addProject, clients, teams } = useAppContext();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [serviceType, setServiceType] = useState<'project' | 'bank-hours' | 'pay-as-you-go'>('project');
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [allocatedHours, setAllocatedHours] = useState<number | undefined>(undefined);
  const [teamIds, setTeamIds] = useState<string[]>([]);

  const onSubmit = (data: FormValues) => {
    addProject({
      name: data.name,
      description: data.description,
      clientId: data.clientId,
      status: 'todo',
      serviceType: data.serviceType,
      startDate: data.startDate,
      dueDate: data.dueDate,
      allocatedHours: data.allocatedHours,
      usedHours: 0,
      teamIds: data.teamIds || [],
      watcherIds: []
    });
    
    form.reset();
    onClose();
  };

  const form = {
    reset: () => {
      setName("");
      setDescription("");
      setClientId("");
      setServiceType('project');
      setStartDate(undefined);
      setDueDate(undefined);
      setAllocatedHours(undefined);
      setTeamIds([]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger id="serviceType">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="bank-hours">Bank of Hours</SelectItem>
                  <SelectItem value="pay-as-you-go">Pay as you go</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Team (Optional)</Label>
              <Select value={teamIds ? teamIds[0] : undefined} onValueChange={(value) => setTeamIds([value])}>
                <SelectTrigger id="team">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date (Optional)</Label>
              <Input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                type="date"
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allocatedHours">Allocated Hours (Optional)</Label>
            <Input
              type="number"
              id="allocatedHours"
              value={allocatedHours}
              onChange={(e) => setAllocatedHours(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
