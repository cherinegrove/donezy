
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { Trash2, Edit, Plus, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface ProjectStatusDefinition {
  id: string;
  label: string;
  value: string;
  color: string;
  order: number;
}

export function ProjectStatusManager() {
  const { projectStatuses, addProjectStatus, updateProjectStatus, deleteProjectStatus, reorderProjectStatuses } = useAppContext();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProjectStatusDefinition | null>(null);
  const [newStatus, setNewStatus] = useState({ label: "", value: "", color: "bg-blue-500" });

  const colorOptions = [
    { value: "bg-gray-500", label: "Gray" },
    { value: "bg-red-500", label: "Red" },
    { value: "bg-orange-500", label: "Orange" },
    { value: "bg-yellow-500", label: "Yellow" },
    { value: "bg-green-500", label: "Green" },
    { value: "bg-blue-500", label: "Blue" },
    { value: "bg-purple-500", label: "Purple" },
    { value: "bg-pink-500", label: "Pink" },
  ];

  const handleCreateStatus = () => {
    if (newStatus.label && newStatus.value) {
      addProjectStatus({
        label: newStatus.label,
        value: newStatus.value,
        color: newStatus.color,
        order: projectStatuses.length,
      });
      setNewStatus({ label: "", value: "", color: "bg-blue-500" });
      setIsCreateDialogOpen(false);
    }
  };

  const handleEditStatus = () => {
    if (editingStatus) {
      updateProjectStatus(editingStatus.id, editingStatus);
      setIsEditDialogOpen(false);
      setEditingStatus(null);
    }
  };

  const handleDeleteStatus = (statusId: string) => {
    deleteProjectStatus(statusId);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(projectStatuses);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order values
    const updatedItems = items.map((item, index) => ({ ...item, order: index }));
    reorderProjectStatuses(updatedItems);
  };

  const generateValueFromLabel = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          Project Status Management
        </CardTitle>
        <CardDescription>
          Create and manage custom project statuses. These will be available when creating or editing projects.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">Current Project Statuses</h3>
            <p className="text-sm text-muted-foreground">Drag to reorder statuses</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Status
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project Status</DialogTitle>
                <DialogDescription>
                  Add a new status option for projects.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="status-label">Status Label</Label>
                  <Input
                    id="status-label"
                    placeholder="e.g., Planning"
                    value={newStatus.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      setNewStatus({
                        ...newStatus,
                        label,
                        value: generateValueFromLabel(label)
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status-value">Status Value</Label>
                  <Input
                    id="status-value"
                    placeholder="e.g., planning"
                    value={newStatus.value}
                    onChange={(e) => setNewStatus({ ...newStatus, value: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    This is used internally and should be lowercase with hyphens
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status-color">Color</Label>
                  <Select
                    value={newStatus.color}
                    onValueChange={(value) => setNewStatus({ ...newStatus, color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${color.value}`}></div>
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateStatus}>Create Status</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="project-statuses">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {projectStatuses.map((status, index) => (
                  <Draggable key={status.id} draggableId={status.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center justify-between p-3 border rounded-lg bg-white ${
                          snapshot.isDragging ? 'shadow-lg' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div {...provided.dragHandleProps}>
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                          </div>
                          <Badge variant="outline" className={`${status.color} text-white border-0`}>
                            {status.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">({status.value})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingStatus(status);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStatus(status.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Edit Status Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project Status</DialogTitle>
              <DialogDescription>
                Modify the project status details.
              </DialogDescription>
            </DialogHeader>
            {editingStatus && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status-label">Status Label</Label>
                  <Input
                    id="edit-status-label"
                    value={editingStatus.label}
                    onChange={(e) => setEditingStatus({ ...editingStatus, label: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status-value">Status Value</Label>
                  <Input
                    id="edit-status-value"
                    value={editingStatus.value}
                    onChange={(e) => setEditingStatus({ ...editingStatus, value: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status-color">Color</Label>
                  <Select
                    value={editingStatus.color}
                    onValueChange={(value) => setEditingStatus({ ...editingStatus, color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${color.value}`}></div>
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditStatus}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
