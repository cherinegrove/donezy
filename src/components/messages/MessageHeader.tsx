
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { PlusIcon } from "lucide-react";
import { format } from "date-fns";

interface User {
  id: string;
  name: string;
  avatar?: string;
}

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  projectId: string;
}

interface MessageHeaderProps {
  sender?: User | null;
  timestamp: string;
  client?: Client | null;
  project?: Project | null;
  task?: Task | null;
  onCreateSubtask: () => void;
  onCreateTask: () => void;
}

export function MessageHeader({
  sender,
  timestamp,
  client,
  project,
  task,
  onCreateSubtask,
  onCreateTask
}: MessageHeaderProps) {
  return (
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
              {format(new Date(timestamp), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {task && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onCreateSubtask}
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
              onClick={onCreateTask}
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
  );
}
