
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@/types";

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
}

type ServiceType = "project" | "bank-hours" | "pay-as-you-go";

interface FormValues {
  name: string;
  description: string;
  clientId: string;
  serviceType: ServiceType;
  startDate: string;
  dueDate: string;
  allocatedHours: number;
  teamIds: string[];
}

export function CreateProjectDialog({ isOpen, onClose, clientId }: CreateProjectDialogProps) {
  const { clients, teams, users, addProject } = useAppContext();
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormValues>({
    name: "",
    description: "",
    clientId: clientId || "",
    serviceType: "project",
    startDate: "",
    dueDate: "",
    allocatedHours: 0,
    teamIds: []
  });

  const activeClients = clients.filter(client => client.status === "active");
  const clientUsers = clientId ? users.filter(user => user.clientId === clientId) : [];

  const handleServiceTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, serviceType: value as ServiceType }));
  };

  const handleSubmit = () => {
    const projectData: Omit<Project, "id"> = {
      name: formData.name,
      description: formData.description,
      clientId: formData.clientId,
      status: "todo",
      serviceType: formData.serviceType,
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      allocatedHours: formData.allocatedHours,
      usedHours: 0,
      teamIds: formData.teamIds,
      watcherIds: []
    };

    addProject(projectData);

    toast({
      title: "Success",
      description: "Project created successfully",
    });

    setFormData({
      name: "",
      description: "",
      clientId: clientId || "",
      serviceType: "project",
      startDate: "",
      dueDate: "",
      allocatedHours: 0,
      teamIds: []
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter project name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter project description"
            />
          </div>

          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {activeClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Service Type</Label>
            <Select
              value={formData.serviceType}
              onValueChange={handleServiceTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="bank-hours">Bank Hours</SelectItem>
                <SelectItem value="pay-as-you-go">Pay as You Go</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allocatedHours">Allocated Hours</Label>
            <Input
              id="allocatedHours"
              type="number"
              value={formData.allocatedHours}
              onChange={(e) => setFormData(prev => ({ ...prev, allocatedHours: Number(e.target.value) }))}
              placeholder="Enter allocated hours"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
