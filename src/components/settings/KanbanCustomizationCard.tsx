
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Palette, GripVertical } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface CustomStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  type: 'backlog' | 'active' | 'review' | 'done';
}

const defaultStatuses: CustomStatus[] = [
  { id: 'backlog', name: 'Backlog', color: '#6b7280', order: 0, type: 'backlog' },
  { id: 'todo', name: 'To Do', color: '#3b82f6', order: 1, type: 'active' },
  { id: 'in-progress', name: 'In Progress', color: '#f59e0b', order: 2, type: 'active' },
  { id: 'review', name: 'Review', color: '#ec4899', order: 3, type: 'review' },
  { id: 'done', name: 'Done', color: '#10b981', order: 4, type: 'done' },
];

const statusColors = [
  '#6b7280', '#3b82f6', '#f59e0b', '#ec4899', '#10b981',
  '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316'
];

export function KanbanCustomizationCard() {
  const { toast } = useToast();
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>(defaultStatuses);
  const [globalSettings, setGlobalSettings] = useState(true);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#6b7280');
  const [newStatusType, setNewStatusType] = useState<'backlog' | 'active' | 'review' | 'done'>('active');

  const addCustomStatus = () => {
    if (!newStatusName.trim()) {
      toast({
        title: "Error",
        description: "Status name is required",
        variant: "destructive",
      });
      return;
    }

    const newStatus: CustomStatus = {
      id: Date.now().toString(),
      name: newStatusName.trim(),
      color: newStatusColor,
      order: customStatuses.length,
      type: newStatusType,
    };

    setCustomStatuses([...customStatuses, newStatus]);
    setNewStatusName('');
    setNewStatusColor('#6b7280');
    setNewStatusType('active');

    toast({
      title: "Status Added",
      description: `"${newStatus.name}" has been added to the Kanban board`,
    });
  };

  const removeStatus = (statusId: string) => {
    setCustomStatuses(customStatuses.filter(status => status.id !== statusId));
    toast({
      title: "Status Removed",
      description: "The status has been removed from the Kanban board",
    });
  };

  const updateStatusColor = (statusId: string, color: string) => {
    setCustomStatuses(customStatuses.map(status => 
      status.id === statusId ? { ...status, color } : status
    ));
  };

  const updateStatusName = (statusId: string, name: string) => {
    setCustomStatuses(customStatuses.map(status => 
      status.id === statusId ? { ...status, name } : status
    ));
  };

  const saveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Kanban customization settings have been saved successfully",
    });
  };

  const resetToDefaults = () => {
    setCustomStatuses(defaultStatuses);
    toast({
      title: "Reset Complete",
      description: "Kanban board has been reset to default settings",
    });
  };

  return (
    <div className="space-y-6">
      {/* Global vs Project Settings */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-base">Global Settings</Label>
          <p className="text-sm text-muted-foreground">
            Apply these settings to all projects or allow per-project customization
          </p>
        </div>
        <Switch
          checked={globalSettings}
          onCheckedChange={setGlobalSettings}
        />
      </div>

      <Separator />

      {/* Custom Statuses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Custom Statuses</h3>
            <p className="text-sm text-muted-foreground">
              Create and manage custom statuses for your Kanban boards
            </p>
          </div>
        </div>

        {/* Current Statuses */}
        <div className="grid gap-3">
          {customStatuses.map((status) => (
            <Card key={status.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: status.color }}
                  />
                  <Input
                    value={status.name}
                    onChange={(e) => updateStatusName(status.id, e.target.value)}
                    className="max-w-[200px]"
                  />
                  <Badge variant="outline" className="capitalize">
                    {status.type}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={status.color}
                    onValueChange={(color) => updateStatusColor(status.id, color)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <Palette className="h-3 w-3" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {statusColors.map((color) => (
                        <SelectItem key={color} value={color}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            {color}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStatus(status.id)}
                    disabled={defaultStatuses.some(ds => ds.id === status.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Add New Status */}
        <Card className="p-4 border-dashed">
          <div className="space-y-4">
            <h4 className="font-medium">Add New Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="statusName">Name</Label>
                <Input
                  id="statusName"
                  placeholder="Status name"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="statusColor">Color</Label>
                <Select value={newStatusColor} onValueChange={setNewStatusColor}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: newStatusColor }}
                      />
                      <Palette className="h-3 w-3" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {statusColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          {color}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="statusType">Type</Label>
                <Select value={newStatusType} onValueChange={(value: any) => setNewStatusType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button onClick={addCustomStatus} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Status
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>
        <Button onClick={saveSettings}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
