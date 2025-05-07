
import { useAppContext } from "@/contexts/AppContext";
import { Message, Task } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { PlusIcon } from "lucide-react";

interface MessageViewProps {
  message: Message;
  onReply: () => void;
}

export function MessageView({ message, onReply }: MessageViewProps) {
  const { getUserById, users, getProjectById, getClientById, tasks, addTask } = useAppContext();
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  
  const sender = getUserById(message.senderId);
  
  // Get related entities from message metadata
  const task = tasks.find(t => t.id === message.taskId);
  const project = message.projectId ? getProjectById(message.projectId) : 
                 (task ? getProjectById(task.projectId) : null);
  const client = message.clientId ? getClientById(message.clientId) : 
               (project ? getClientById(project.clientId) : null);
  
  const handleStartReply = () => {
    setIsReplying(true);
  };
  
  const handleCancelReply = () => {
    setIsReplying(false);
    setReplyContent("");
  };
  
  const handleSendReply = () => {
    if (replyContent.trim() && task) {
      const mentionedUsers = parseUserMentions(replyContent);
      
      // Add comment to the task
      addComment(task.id, sender?.id || "", replyContent, mentionedUsers);
      
      setIsReplying(false);
      setReplyContent("");
      onReply();
    }
  };
  
  // Parse @mentions from text
  const parseUserMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = [...text.matchAll(mentionRegex)];
    
    return matches.map(match => {
      const username = match[1].toLowerCase();
      const user = users.find(u => 
        u.name.toLowerCase().replace(/\s+/g, '') === username
      );
      return user?.id || "";
    }).filter(id => id !== "");
  };

  // Create a subtask from this message
  const handleCreateSubtask = () => {
    if (!task) return;
    
    addTask({
      title: `Subtask from message: ${message.content.slice(0, 30)}...`,
      description: message.content,
      projectId: task.projectId,
      parentTaskId: task.id,
      assigneeIds: [],
      status: "todo",
      priority: "medium",
      customFields: {},
      subtasks: []
    });
  };
  
  // Create a new task in the same project
  const handleCreateTask = () => {
    if (!project) return;
    
    addTask({
      title: `Task from message: ${message.content.slice(0, 30)}...`,
      description: message.content,
      projectId: project.id,
      assigneeIds: [],
      status: "todo",
      priority: "medium",
      customFields: {},
      subtasks: []
    });
  };
  
  return (
    <div className="flex flex-col h-full border rounded-md">
      <div className="p-4 border-b">
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
              <p className="text-sm text-muted-foreground">
                {format(new Date(message.timestamp), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {task && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCreateSubtask}
                className="text-xs"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Create Subtask
              </Button>
            )}
            
            {project && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleCreateTask}
                className="text-xs"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Create Task
              </Button>
            )}
          </div>
        </div>
        
        {/* Related context information */}
        {(client || project || task) && (
          <div className="mt-3 space-y-2">
            <Separator />
            <div className="flex flex-wrap gap-2">
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
                  <Link to={`/projects/${task.projectId}?taskId=${task.id}`} className="hover:underline">
                    Task: {task.title}
                  </Link>
                </Badge>
              )}
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
            placeholder="Type your reply... Use @username to mention users"
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

// Helper function for adding comments that wasn't exported
function addComment(taskId: string, userId: string, content: string, mentionedUserIds: string[]) {
  // This is a placeholder - the actual implementation uses the context
  console.log("Adding comment", { taskId, userId, content, mentionedUserIds });
}
