
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from "@hello-pangea/dnd";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  GripVertical, 
  Save, 
  X,
  Palette
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TaskStatus {
  id: string;
  label: string;
  value: string;
  color: string;
}

const defaultStatuses: TaskStatus[] = [
  { id: "1", label: "Backlog", value: "backlog", color: "bg-gray-500" },
  { id: "2", label: "To Do", value: "todo", color: "bg-blue-500" },
  { id: "3", label: "In Progress", value: "in-progress", color: "bg-yellow-500" },
  { id: "4", label: "Review", value: "review", color: "bg-purple-500" },
  { id: "5", label: "Done", value: "done", color: "bg-green-500" },
];

const colorOptions = [
  "bg-red-500",
  "bg-orange-500", 
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-pink-500"
];

export function TaskStatusManager() {
  const [statuses, setStatuses] = useState<TaskStatus[]>(defaultStatuses);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const { toast } = useToast();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(statuses);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setStatuses(items);
    toast({
      title: "Success",
      description: "Task statuses reordered successfully",
    });
  };

  const handleEdit = (status: TaskStatus) => {
    setEditingId(status.id);
    setEditValue(status.label);
  };

  const handleSaveEdit = () => {
    if (!editValue.trim()) return;
    
    setStatuses(prev => 
      prev.map(status => 
        status.id === editingId 
          ? { ...status, label: editValue.trim() }
          : status
      )
    );
    setEditingId(null);
    setEditValue("");
    toast({
      title: "Success",
      description: "Status updated successfully",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleDelete = (id: string) => {
    setStatuses(prev => prev.filter(status => status.id !== id));
    toast({
      title: "Success",
      description: "Status deleted successfully",
    });
  };

  const handleAdd = () => {
    if (!newStatusLabel.trim()) return;

    const newStatus: TaskStatus = {
      id: Date.now().toString(),
      label: newStatusLabel.trim(),
      value: newStatusLabel.toLowerCase().replace(/\s+/g, '-'),
      color: "bg-indigo-500",
    };

    setStatuses(prev => [...prev, newStatus]);
    setNewStatusLabel("");
    setIsAdding(false);
    toast({
      title: "Success",
      description: "New status added successfully",
    });
  };

  const handleColorChange = (statusId: string, newColor: string) => {
    setStatuses(prev => 
      prev.map(status => 
        status.id === statusId 
          ? { ...status, color: newColor }
          : status
      )
    );
    toast({
      title: "Success",
      description: "Status color updated",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Status Management</CardTitle>
        <CardDescription>
          Manage task statuses for Kanban board. Drag to reorder, click to edit or delete, and customize colors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="statuses">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {statuses.map((status, index) => (
                  <Draggable key={status.id} draggableId={status.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-background"
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-12 h-8 p-0 hover:scale-105 transition-transform"
                            >
                              <div className={`w-6 h-6 rounded ${status.color}`} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" align="start">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Choose Color</Label>
                              <div className="grid grid-cols-5 gap-2">
                                {colorOptions.map((color) => (
                                  <Button
                                    key={color}
                                    variant="outline"
                                    size="sm"
                                    className="w-10 h-10 p-0 hover:scale-110 transition-transform"
                                    onClick={() => handleColorChange(status.id, color)}
                                  >
                                    <div className={`w-6 h-6 rounded ${color}`} />
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        
                        {editingId === status.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <Button size="sm" onClick={handleSaveEdit}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1">
                              <Badge variant="outline">{status.label}</Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(status)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(status.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {isAdding ? (
          <div className="flex items-center gap-2 p-3 border rounded-lg">
            <Label htmlFor="new-status">New Status:</Label>
            <Input
              id="new-status"
              value={newStatusLabel}
              onChange={(e) => setNewStatusLabel(e.target.value)}
              placeholder="Enter status name"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setIsAdding(false);
              }}
            />
            <Button onClick={handleAdd}>Add</Button>
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsAdding(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add New Status
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
