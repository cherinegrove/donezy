import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/AppContext";
import { useState } from "react";
import { Task, TaskStatus } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock } from "lucide-react";

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskDialog({ task, open, onOpenChange }: EditTaskDialogProps) {
  const { projects, users, updateTask, deleteTask, startTimeTracking, customFields, tasks } = useAppContext();
  
  // Form state
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<"low" | "medium" | "high">(task.priority);
  
  // Update these date fields
  const [startDate, setStartDate] = useState(task.createdAt?.split('T')[0] || "");
  const [dueDate, setDueDate] = useState(task.dueDate?.split('T')[0] || "");
  
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assigneeIds);
  const [activeTab, setActiveTab] = useState("details");
  const [newComment, setNewComment] = useState("");
  
  // Custom fields state
  const [customFieldValues, setCustomFieldValues] = useState({...task.customFields});
  
  const project = projects.find(p => p.id === task.projectId);
  
  // Get parent task if this is a child task
  const parentTask = task.parentTaskId ? tasks.find(t => t.id === task.parentTaskId) : undefined;
  
  // Get child tasks if this is a parent task
  const childTasks = tasks.filter(t => t.parentTaskId === task.id);
  
  const handleSave = () => {
    updateTask(task.id, {
      title,
      description,
      status,
      priority,
      createdAt: startDate ? `${startDate}T00:00:00.000Z` : task.createdAt,  // Update start date
      dueDate: dueDate ? `${dueDate}T23:59:59.999Z` : undefined,
      assigneeIds,
      customFields: customFieldValues,
    });
    
    onOpenChange(false);
  };
  
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      deleteTask(task.id);
      onOpenChange(false);
    }
  };
  
  const handleStartTimer = () => {
    startTimeTracking(task.id);
    onOpenChange(false);
  };
  
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const updatedComments = [
      ...task.comments,
      {
        id: `comment-${Date.now()}`,
        taskId: task.id,
        userId: users[0].id, // Current user
        content: newComment,
        timestamp: new Date().toISOString(),
      },
    ];
    
    updateTask(task.id, { comments: updatedComments });
    setNewComment("");
  };
  
  const handleOpenTask = (taskId: string) => {
    // Find the task to open
    const taskToOpen = tasks.find(t => t.id === taskId);
    if (taskToOpen) {
      // Close current dialog
      onOpenChange(false);
      
      // We would typically navigate to the task in the project context
      // For now, just redirect to project details with task id
      window.location.href = `/projects/${taskToOpen.projectId}?taskId=${taskToOpen.id}`;
    }
  };
  
  // Helper function to get task status color 
  const getStatusColor = (taskStatus: TaskStatus) => {
    switch (taskStatus) {
      case 'done':
        return "bg-green-500";
      case 'in-progress':
        return "bg-blue-500";
      case 'review':
        return "bg-yellow-500";
      case 'todo':
        return "bg-gray-400";
      case 'backlog':
        return "bg-gray-300";
      default:
        return "bg-gray-500";
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-start">
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="text-xl font-bold"
            />
            <Button 
              variant="outline" 
              onClick={handleStartTimer}
              className="border-green-200 bg-green-50 hover:bg-green-100 text-green-700"
            >
              Track Time
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="time">Time Tracking</TabsTrigger>
            {(parentTask || childTasks.length > 0) && (
              <TabsTrigger value="related">Related Tasks</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <div>
              <Label>Description</Label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="mt-2"
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Project</Label>
                <Input value={project?.name || "Unknown Project"} disabled className="mt-2" />
              </div>
              
              {/* Add Start Date field */}
              <div>
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select 
                  value={status} 
                  onValueChange={(value: TaskStatus) => setStatus(value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Move Due Date to same row as Status */}
              <div>
                <Label>Due Date</Label>
                <Input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
            
            <div>
              <Label>Priority</Label>
              <Select 
                value={priority} 
                onValueChange={(value: "low" | "medium" | "high") => setPriority(value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Assignees</Label>
              <div className="mt-2 space-y-2">
                <Select
                  onValueChange={(value) => {
                    if (!assigneeIds.includes(value)) {
                      setAssigneeIds([...assigneeIds, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((user) => !assigneeIds.includes(user.id))
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                
                {assigneeIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {assigneeIds.map((userId) => {
                      const user = users.find((u) => u.id === userId);
                      return (
                        <Button
                          key={userId}
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() => {
                            setAssigneeIds(assigneeIds.filter((id) => id !== userId));
                          }}
                        >
                          {user?.name || "Unknown User"} ✕
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div>
                <Label>Custom Fields</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {customFields.map((field) => {
                    const fieldValue = customFieldValues[field.id];
                    
                    return (
                      <div key={field.id} className="space-y-1">
                        <Label className="text-sm text-muted-foreground">
                          {field.name}
                        </Label>
                        
                        {field.type === 'text' && (
                          <Input 
                            value={fieldValue || ""}
                            onChange={(e) => {
                              setCustomFieldValues({
                                ...customFieldValues,
                                [field.id]: e.target.value,
                              });
                            }}
                          />
                        )}
                        
                        {field.type === 'number' && (
                          <Input 
                            type="number"
                            value={fieldValue || ""}
                            onChange={(e) => {
                              setCustomFieldValues({
                                ...customFieldValues,
                                [field.id]: parseFloat(e.target.value) || 0,
                              });
                            }}
                          />
                        )}
                        
                        {field.type === 'date' && (
                          <Input 
                            type="date"
                            value={fieldValue || ""}
                            onChange={(e) => {
                              setCustomFieldValues({
                                ...customFieldValues,
                                [field.id]: e.target.value,
                              });
                            }}
                          />
                        )}
                        
                        {(field.type === 'select' || field.type === 'multiselect') && field.options && (
                          <Select
                            value={fieldValue || ""}
                            onValueChange={(value) => {
                              setCustomFieldValues({
                                ...customFieldValues,
                                [field.id]: value,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="comments" className="space-y-4">
            <div className="space-y-4">
              {task.comments.length > 0 ? (
                task.comments.map((comment) => {
                  const commenter = users.find(u => u.id === comment.userId);
                  return (
                    <div key={comment.id} className="flex gap-3 p-3 bg-muted/30 rounded-md">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={commenter?.avatar || ""} />
                        <AvatarFallback>
                          {commenter?.name?.slice(0, 2) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="font-medium text-sm">{commenter?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(comment.timestamp), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <p className="mt-1 text-sm">{comment.content}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No comments yet
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Textarea 
                placeholder="Add a comment..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddComment}>Post</Button>
            </div>
          </TabsContent>
          
          <TabsContent value="time" className="space-y-4">
            <div className="flex justify-between">
              <h3 className="font-medium">Time Entries</h3>
              <Button 
                variant="outline" 
                onClick={handleStartTimer}
                className="border-green-200 bg-green-50 hover:bg-green-100 text-green-700"
              >
                Start Tracking
              </Button>
            </div>
            
            {task.timeEntries.length > 0 ? (
              <div className="space-y-2">
                {task.timeEntries.map((entry) => {
                  const user = users.find(u => u.id === entry.userId);
                  
                  return (
                    <div key={entry.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
                      <div>
                        <p className="font-medium text-sm">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.startTime && format(new Date(entry.startTime), "MMM d, yyyy")}
                        </p>
                        {entry.notes && (
                          <p className="text-sm mt-1">{entry.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-medium">
                          {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.billable ? "Billable" : "Non-billable"}
                        </p>
                      </div>
                    </div>
                  );
                })}
                
                <div className="flex justify-between items-center p-3 bg-muted/10 rounded-md">
                  <p className="font-medium">Total</p>
                  <p className="font-mono font-medium">
                    {Math.floor(
                      task.timeEntries.reduce((acc, entry) => acc + entry.duration, 0) / 60
                    )}h {task.timeEntries.reduce((acc, entry) => acc + entry.duration, 0) % 60}m
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No time entries yet
              </div>
            )}
          </TabsContent>
          
          {(parentTask || childTasks.length > 0) && (
            <TabsContent value="related" className="space-y-4">
              {/* Parent task section */}
              {parentTask && (
                <div className="space-y-2">
                  <h3 className="font-medium">Parent Task</h3>
                  <div 
                    className="p-4 border rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleOpenTask(parentTask.id)}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{parentTask.title}</h4>
                        <div className="flex items-center gap-2">
                          <span 
                            className={`inline-flex h-2 w-2 rounded-full ${getStatusColor(parentTask.status)}`}
                          ></span>
                          <span className="text-xs capitalize text-muted-foreground">
                            {parentTask.status.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {parentTask.createdAt && `Created: ${format(new Date(parentTask.createdAt), "MMM d, yyyy")}`}
                            {parentTask.dueDate && ` • Due: ${format(new Date(parentTask.dueDate), "MMM d, yyyy")}`}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Assignees:</span>
                        <div className="flex -space-x-2">
                          {parentTask.assigneeIds.map(id => {
                            const user = users.find(u => u.id === id);
                            return user ? (
                              <Avatar key={id} className="h-5 w-5 border-2 border-background">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                              </Avatar>
                            ) : null;
                          })}
                          {parentTask.assigneeIds.length === 0 && (
                            <span className="text-xs text-muted-foreground">None assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Child tasks section */}
              {childTasks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Child Tasks ({childTasks.length})</h3>
                  <div className="space-y-3">
                    {childTasks.map(childTask => (
                      <div 
                        key={childTask.id}
                        className="p-4 border rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleOpenTask(childTask.id)}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{childTask.title}</h4>
                            <div className="flex items-center gap-2">
                              <span 
                                className={`inline-flex h-2 w-2 rounded-full ${getStatusColor(childTask.status)}`}
                              ></span>
                              <span className="text-xs capitalize text-muted-foreground">
                                {childTask.status.replace('-', ' ')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {childTask.createdAt && `Created: ${format(new Date(childTask.createdAt), "MMM d, yyyy")}`}
                                {childTask.dueDate && ` • Due: ${format(new Date(childTask.dueDate), "MMM d, yyyy")}`}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Assignees:</span>
                            <div className="flex -space-x-2">
                              {childTask.assigneeIds.map(id => {
                                const user = users.find(u => u.id === id);
                                return user ? (
                                  <Avatar key={id} className="h-5 w-5 border-2 border-background">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                                  </Avatar>
                                ) : null;
                              })}
                              {childTask.assigneeIds.length === 0 && (
                                <span className="text-xs text-muted-foreground">None assigned</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
        
        <DialogFooter className="gap-2">
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
          <div className="flex-1"></div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
