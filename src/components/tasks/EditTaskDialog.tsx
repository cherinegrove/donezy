
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useState, useEffect, useRef } from "react";
import { Task, TaskStatus } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MentionUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
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
  
  // Single assignee and collaborators
  const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId || "");
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>(task.collaboratorIds || []);
  
  const [activeTab, setActiveTab] = useState("details");
  const [newComment, setNewComment] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSearchResults, setMentionSearchResults] = useState<MentionUser[]>([]);
  const [mentionDropdownVisible, setMentionDropdownVisible] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);
  
  // Add a nested task dialog state
  const [nestedSelectedTask, setNestedSelectedTask] = useState<Task | null>(null);
  const [nestedTaskDialogOpen, setNestedTaskDialogOpen] = useState<boolean>(false);
  
  // Custom fields state
  const [customFieldValues, setCustomFieldValues] = useState({...task.customFields});
  
  // Add custom field state
  const [showAddCustomField, setShowAddCustomField] = useState(false);
  const [newCustomFieldName, setNewCustomFieldName] = useState("");
  const [newCustomFieldType, setNewCustomFieldType] = useState<"text" | "number" | "date" | "select">("text");
  
  const project = projects.find(p => p.id === task.projectId);
  
  // Get parent task if this is a child task
  const parentTask = task.parentTaskId ? tasks.find(t => t.id === task.parentTaskId) : undefined;
  
  // Get child tasks if this is a parent task
  const childTasks = tasks.filter(t => t.parentTaskId === task.id);
  
  // Effect to handle @ mentions
  useEffect(() => {
    if (mentionQuery !== null) {
      // Filter users based on query - include assignee and collaborators first
      const taskUsers = [
        assigneeId, 
        ...(collaboratorIds || [])
      ].filter(Boolean);

      // Filter and sort users
      const results = users
        .filter(user => 
          user.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          taskUsers.includes(user.id)
        )
        .sort((a, b) => {
          // Task members first
          const aIsTaskMember = taskUsers.includes(a.id);
          const bIsTaskMember = taskUsers.includes(b.id);
          
          if (aIsTaskMember && !bIsTaskMember) return -1;
          if (!aIsTaskMember && bIsTaskMember) return 1;
          
          // Then sort by match strength
          return a.name.toLowerCase().indexOf(mentionQuery.toLowerCase()) - 
                 b.name.toLowerCase().indexOf(mentionQuery.toLowerCase());
        })
        .slice(0, 5);
      
      setMentionSearchResults(results.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      })));
      setMentionDropdownVisible(results.length > 0);
    } else {
      setMentionDropdownVisible(false);
    }
  }, [mentionQuery, assigneeId, collaboratorIds, users]);
  
  // Handle outside clicks for mention dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (mentionDropdownRef.current && !mentionDropdownRef.current.contains(e.target as Node)) {
        setMentionDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);
  
  const handleSave = () => {
    updateTask(task.id, {
      title,
      description,
      status,
      priority,
      createdAt: startDate ? `${startDate}T00:00:00.000Z` : task.createdAt,
      dueDate: dueDate ? `${dueDate}T23:59:59.999Z` : undefined,
      assigneeId: assigneeId || undefined,
      collaboratorIds: collaboratorIds || [],
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
  
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);
    
    // Check for @mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || value[lastAtIndex - 1] === ' ' || value[lastAtIndex - 1] === '\n')) {
      const query = value.slice(lastAtIndex + 1).split(/[\s\n]/)[0];
      setMentionQuery(query);
    } else {
      setMentionQuery(null);
    }
  };
  
  const handleSelectMention = (user: MentionUser) => {
    if (commentInputRef.current) {
      const text = newComment;
      const lastAtIndex = text.lastIndexOf('@');
      
      if (lastAtIndex !== -1) {
        const beforeMention = text.substring(0, lastAtIndex);
        const afterMention = text.substring(lastAtIndex + 1).replace(/^[^\s\n]*/, '');
        
        setNewComment(`${beforeMention}@${user.name}${afterMention}`);
        
        // Restore focus
        setTimeout(() => {
          if (commentInputRef.current) {
            commentInputRef.current.focus();
          }
        }, 0);
      }
    }
    
    setMentionDropdownVisible(false);
    setMentionQuery(null);
  };
  
  const handleOpenTask = (taskId: string) => {
    // Find the task to open
    const taskToOpen = tasks.find(t => t.id === taskId);
    if (taskToOpen) {
      setNestedSelectedTask(taskToOpen);
      setNestedTaskDialogOpen(true);
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

  const handleAddCustomField = () => {
    if (!newCustomFieldName.trim()) {
      toast.error("Custom field name cannot be empty");
      return;
    }

    // Generate a unique ID for the new field
    const fieldId = `custom-${Date.now()}`;
    
    // Add the new field to the customFields list
    const newField = {
      id: fieldId,
      name: newCustomFieldName,
      type: newCustomFieldType,
      options: [],
    };
    
    // Update the task's custom fields
    setCustomFieldValues({
      ...customFieldValues,
      [fieldId]: ""
    });
    
    // Reset form
    setShowAddCustomField(false);
    setNewCustomFieldName("");
    setNewCustomFieldType("text");
    
    toast.success("Custom field added successfully");
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
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
            <DialogDescription>
              Make changes to this task
            </DialogDescription>
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assignee (Task Owner)</Label>
                  <Select
                    value={assigneeId || ""}
                    onValueChange={(value) => {
                      // If this person is also a collaborator, remove them
                      if (collaboratorIds.includes(value)) {
                        setCollaboratorIds(collaboratorIds.filter(id => id !== value));
                      }
                      setAssigneeId(value);
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {assigneeId && (
                    <div className="flex items-center gap-2 mt-2">
                      {(() => {
                        const user = users.find(u => u.id === assigneeId);
                        return (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user?.avatar} />
                              <AvatarFallback>{user?.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{user?.name}</span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label>Collaborators</Label>
                  <Select
                    onValueChange={(value) => {
                      // Don't add if they're already the assignee
                      if (value === assigneeId) {
                        toast.error("This user is already the assignee");
                        return;
                      }
                      
                      // Don't add if they're already a collaborator
                      if (!collaboratorIds.includes(value)) {
                        setCollaboratorIds([...collaboratorIds, value]);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Add collaborator" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter((user) => !collaboratorIds.includes(user.id) && user.id !== assigneeId)
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  
                  {collaboratorIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {collaboratorIds.map((userId) => {
                        const user = users.find((u) => u.id === userId);
                        return (
                          <Badge
                            key={userId}
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-1"
                          >
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={user?.avatar} />
                              <AvatarFallback>{user?.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{user?.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => {
                                setCollaboratorIds(collaboratorIds.filter(id => id !== userId));
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Custom Fields */}
              <div>
                <div className="flex justify-between items-center">
                  <Label>Custom Fields</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAddCustomField(!showAddCustomField)}
                  >
                    {showAddCustomField ? "Cancel" : "Add Custom Field"}
                  </Button>
                </div>
                
                {showAddCustomField && (
                  <div className="border rounded-md p-3 mt-2 space-y-3">
                    <div>
                      <Label className="text-sm">Field Name</Label>
                      <Input 
                        value={newCustomFieldName}
                        onChange={(e) => setNewCustomFieldName(e.target.value)}
                        placeholder="Enter field name"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm">Field Type</Label>
                      <Select
                        value={newCustomFieldType}
                        onValueChange={(value: "text" | "number" | "date" | "select") => 
                          setNewCustomFieldType(value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      onClick={handleAddCustomField} 
                      className="w-full"
                    >
                      Add Field
                    </Button>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {Object.entries(customFieldValues).map(([fieldId, fieldValue]) => {
                    // Find field definition if it exists in system custom fields
                    const fieldDef = customFields.find(f => f.id === fieldId);
                    const fieldName = fieldDef?.name || fieldId;
                    const fieldType = fieldDef?.type || "text";
                    
                    return (
                      <div key={fieldId} className="space-y-1">
                        <Label className="text-sm text-muted-foreground">
                          {fieldName}
                        </Label>
                        
                        {fieldType === 'text' && (
                          <Input 
                            value={fieldValue || ""}
                            onChange={(e) => {
                              setCustomFieldValues({
                                ...customFieldValues,
                                [fieldId]: e.target.value,
                              });
                            }}
                          />
                        )}
                        
                        {fieldType === 'number' && (
                          <Input 
                            type="number"
                            value={fieldValue || ""}
                            onChange={(e) => {
                              setCustomFieldValues({
                                ...customFieldValues,
                                [fieldId]: parseFloat(e.target.value) || 0,
                              });
                            }}
                          />
                        )}
                        
                        {fieldType === 'date' && (
                          <Input 
                            type="date"
                            value={fieldValue || ""}
                            onChange={(e) => {
                              setCustomFieldValues({
                                ...customFieldValues,
                                [fieldId]: e.target.value,
                              });
                            }}
                          />
                        )}
                        
                        {fieldType === 'select' && fieldDef?.options && (
                          <Select
                            value={fieldValue || ""}
                            onValueChange={(value) => {
                              setCustomFieldValues({
                                ...customFieldValues,
                                [fieldId]: value,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldDef.options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {!fieldDef && (
                          <Input 
                            value={fieldValue || ""}
                            onChange={(e) => {
                              setCustomFieldValues({
                                ...customFieldValues,
                                [fieldId]: e.target.value,
                              });
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {Object.keys(customFieldValues).length === 0 && !showAddCustomField && (
                  <div className="text-sm text-muted-foreground mt-2">
                    No custom fields added yet
                  </div>
                )}
              </div>
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
                          <p className="mt-1 text-sm whitespace-pre-wrap">{comment.content}</p>
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
              
              <div className="flex flex-col gap-2 relative">
                <Textarea 
                  placeholder="Add a comment... Use @ to mention collaborators" 
                  value={newComment}
                  onChange={handleCommentChange}
                  className="flex-1"
                  ref={commentInputRef}
                />
                
                {/* Mention dropdown */}
                {mentionDropdownVisible && (
                  <div 
                    className="absolute bg-background border rounded-md shadow-lg w-64 max-h-48 overflow-y-auto z-50"
                    style={{
                      top: commentInputRef.current ? `${commentInputRef.current.offsetHeight + 4}px` : '100%',
                      left: '0'
                    }}
                    ref={mentionDropdownRef}
                  >
                    {mentionSearchResults.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleSelectMention(user)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        {assigneeId === user.id && (
                          <Badge variant="outline" className="ml-auto text-xs px-1 py-0">Assignee</Badge>
                        )}
                        {collaboratorIds.includes(user.id) && (
                          <Badge variant="outline" className="ml-auto text-xs px-1 py-0">Collaborator</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
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
                          <span className="text-xs text-muted-foreground">Assignee:</span>
                          {parentTask.assigneeId ? (
                            (() => {
                              const user = users.find(u => u.id === parentTask.assigneeId);
                              return user ? (
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-5 w-5 border-2 border-background">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs">{user.name}</span>
                                </div>
                              ) : null;
                            })()
                          ) : (
                            <span className="text-xs text-muted-foreground">None assigned</span>
                          )}
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
                              <span className="text-xs text-muted-foreground">Assignee:</span>
                              {childTask.assigneeId ? (
                                (() => {
                                  const user = users.find(u => u.id === childTask.assigneeId);
                                  return user ? (
                                    <div className="flex items-center gap-1">
                                      <Avatar className="h-5 w-5 border-2 border-background">
                                        <AvatarImage src={user.avatar} />
                                        <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs">{user.name}</span>
                                    </div>
                                  ) : null;
                                })()
                              ) : (
                                <span className="text-xs text-muted-foreground">None assigned</span>
                              )}
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
      
      {/* Nested Task Dialog */}
      {nestedSelectedTask && nestedTaskDialogOpen && (
        <Dialog open={nestedTaskDialogOpen} onOpenChange={setNestedTaskDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-2 top-2 rounded-full hover:bg-gray-200" 
              onClick={() => setNestedTaskDialogOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <DialogHeader>
              <DialogTitle className="flex justify-between items-start">
                {nestedSelectedTask.title}
              </DialogTitle>
              <DialogDescription>
                Task details
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Description</Label>
                <div className="mt-1 p-2 border rounded-md bg-muted/30">
                  {nestedSelectedTask.description || "No description provided."}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(nestedSelectedTask.status)}`}></div>
                    <span className="capitalize">{nestedSelectedTask.status.replace('-', ' ')}</span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm text-muted-foreground">Priority</Label>
                  <div className="mt-1 capitalize">
                    {nestedSelectedTask.priority}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Start Date</Label>
                  <div className="mt-1">
                    {nestedSelectedTask.createdAt ? format(new Date(nestedSelectedTask.createdAt), "MMM d, yyyy") : "Not set"}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm text-muted-foreground">Due Date</Label>
                  <div className="mt-1">
                    {nestedSelectedTask.dueDate ? format(new Date(nestedSelectedTask.dueDate), "MMM d, yyyy") : "Not set"}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Assignee</Label>
                  <div className="mt-1">
                    {nestedSelectedTask.assigneeId ? (
                      (() => {
                        const user = users.find(u => u.id === nestedSelectedTask.assigneeId);
                        return user ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                          </div>
                        ) : "Unknown user";
                      })()
                    ) : "Unassigned"}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm text-muted-foreground">Collaborators</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {nestedSelectedTask.collaboratorIds && nestedSelectedTask.collaboratorIds.length > 0 ? (
                      nestedSelectedTask.collaboratorIds.map(id => {
                        const user = users.find(u => u.id === id);
                        return user ? (
                          <Badge key={id} variant="secondary" className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{user.name}</span>
                          </Badge>
                        ) : null;
                      })
                    ) : (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setNestedTaskDialogOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setSelectedTask(nestedSelectedTask);
                  setIsEditDialogOpen(true);
                  setNestedTaskDialogOpen(false);
                }}
              >
                Edit Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
