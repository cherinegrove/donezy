
import { useAppContext } from "@/contexts/AppContext";
import { Message } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";

interface MessageViewProps {
  message: Message;
  onReply: () => void;
}

export function MessageView({ message, onReply }: MessageViewProps) {
  const { 
    getUserById, 
    getProjectById, 
    getClientById, 
    getTaskById,
    tasks, 
    addTask,
    currentUser
  } = useAppContext();
  
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  
  const sender = getUserById(message.senderId);
  const task = getTaskById(message.taskId);
  
  // Get related entities from message metadata
  const client = message.clientId ? getClientById(message.clientId) : null;
  const project = message.projectId ? getProjectById(message.projectId) : 
                  (task ? getProjectById(task.projectId) : null);
  const subtask = task?.subtasks && task.subtasks.length > 0 
    ? tasks.find(t => task.subtasks.includes(t.id)) 
    : null;
  
  const handleStartReply = () => {
    setIsReplying(true);
  };
  
  const handleCancelReply = () => {
    setIsReplying(false);
    setReplyContent("");
  };
  
  const handleSendReply = () => {
    if (replyContent.trim()) {
      onReply();
      setIsReplying(false);
      setReplyContent("");
    }
  };
  
  const handleCreateTask = () => {
    if (!taskTitle.trim() || !project?.id) {
      toast({
        title: "Cannot create task",
        description: "Task title and project are required",
        variant: "destructive"
      });
      return;
    }
    
    addTask({
      title: taskTitle,
      description: `Created from comment: ${message.content}`,
      status: "todo",
      priority: "medium",
      projectId: project.id,
      assigneeIds: [currentUser?.id || ""],
      dueDate: null,
      customFields: {},
      subtasks: [],
      watcherIds: [currentUser?.id || ""],
    });
    
    toast({ 
      title: "Success", 
      description: "Task has been created" 
    });
    
    setTaskTitle("");
    setIsAddingTask(false);
  };
  
  const handleCreateSubtask = () => {
    if (!taskTitle.trim() || !message.taskId || !project?.id) {
      toast({
        title: "Cannot create subtask",
        description: "Task title and parent task are required",
        variant: "destructive"
      });
      return;
    }
    
    addTask({
      title: taskTitle,
      description: `Created from comment: ${message.content}`,
      status: "todo",
      priority: "medium",
      projectId: project.id,
      parentTaskId: message.taskId,
      assigneeIds: [currentUser?.id || ""],
      dueDate: null,
      customFields: {},
      subtasks: [],
      watcherIds: [currentUser?.id || ""],
    });
    
    toast({ 
      title: "Success", 
      description: "Subtask has been created" 
    });
    
    setTaskTitle("");
    setIsAddingSubtask(false);
  };
  
  return (
    <div className="flex flex-col h-full border rounded-md">
      <div className="p-4 border-b">
        <h1 className="text-xl font-semibold">
          {task ? `Comment on ${task.title}` : "Message"}
        </h1>
        <div className="mt-3 flex justify-between items-start">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={sender?.avatar} />
              <AvatarFallback>
                {sender?.name.slice(0, 2) || 'UN'}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <p className="font-medium">{sender?.name || 'Unknown User'}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(message.timestamp), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        </div>
        
        {/* Related context information */}
        {(client || project || task) && (
          <div className="mt-3 space-y-2">
            <Separator />
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex-1 flex flex-wrap gap-2">
                {client && (
                  <Badge variant="outline" className="bg-blue-50">
                    <Link to={`/clients/${client.id}`} className="hover:underline">
                      Client: {client.name}
                    </Link>
                  </Badge>
                )}
                
                {project && (
                  <Badge variant="outline" className="bg-green-50">
                    <Link to={`/projects/${project.id}`} className="hover:underline">
                      Project: {project.name}
                    </Link>
                  </Badge>
                )}
                
                {task && (
                  <Badge variant="outline" className="bg-purple-50">
                    <Link to={`/tasks?taskId=${task.id}`} className="hover:underline">
                      Task: {task.title}
                    </Link>
                  </Badge>
                )}
                
                {subtask && (
                  <Badge variant="outline" className="bg-orange-50">
                    <Link to={`/tasks?taskId=${subtask.id}`} className="hover:underline">
                      Subtask: {subtask.title}
                    </Link>
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                {project && (
                  <Popover open={isAddingTask} onOpenChange={setIsAddingTask}>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" /> Task
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-4 w-72">
                      <div className="space-y-3">
                        <h4 className="font-medium">Create New Task</h4>
                        <Input 
                          placeholder="Task title" 
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setIsAddingTask(false);
                              setTaskTitle("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleCreateTask}>
                            Create
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                
                {task && (
                  <Popover open={isAddingSubtask} onOpenChange={setIsAddingSubtask}>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" /> Subtask
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-4 w-72">
                      <div className="space-y-3">
                        <h4 className="font-medium">Create Subtask</h4>
                        <Input 
                          placeholder="Subtask title" 
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setIsAddingSubtask(false);
                              setTaskTitle("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleCreateSubtask}>
                            Create
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 flex-1 overflow-auto">
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
      
      {isReplying ? (
        <div className="p-4 border-t space-y-3">
          <Textarea
            placeholder="Type your reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelReply}>
              Cancel
            </Button>
            <Button onClick={handleSendReply}>
              Send Reply
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t">
          <Button onClick={handleStartReply} className="w-full">
            Reply
          </Button>
        </div>
      )}
    </div>
  );
}
