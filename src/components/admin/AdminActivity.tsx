
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Clock, CheckCircle2, FileText } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Activity types for demonstration
type ActivityType = 'login' | 'logout' | 'task_create' | 'task_update' | 'time_start' | 'time_stop';

// Mock activity data - in a real app, this would come from API
interface ActivityLog {
  id: string;
  userId: string;
  type: ActivityType;
  details: string;
  timestamp: string;
  relatedId?: string; // Related task ID, project ID, etc.
}

// Create mock activity data based on existing users, tasks, and time entries
const generateMockActivity = (
  users: any[], 
  tasks: any[], 
  timeEntries: any[],
  currentUser: any
): ActivityLog[] => {
  const activities: ActivityLog[] = [];
  
  // Generate login activities
  users.forEach(user => {
    activities.push({
      id: `login-${user.auth_user_id}-1`,
      userId: user.auth_user_id,
      type: 'login',
      details: 'User logged in',
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString()
    });
    activities.push({
      id: `logout-${user.auth_user_id}-1`,
      userId: user.auth_user_id,
      type: 'logout',
      details: 'User logged out',
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString()
    });
  });
  
  // Generate task activities
  tasks.forEach(task => {
    activities.push({
      id: `task-create-${task.id}`,
      userId: task.assigneeId || users[0]?.id || currentUser?.id || 'unknown',
      type: 'task_create',
      details: `Created task: ${task.title}`,
      timestamp: task.createdAt,
      relatedId: task.id
    });
    
    activities.push({
      id: `task-update-${task.id}`,
      userId: task.assigneeId || users[0]?.id || currentUser?.id || 'unknown',
      type: 'task_update',
      details: `Updated task status to: ${task.status}`,
      timestamp: new Date(new Date(task.createdAt).getTime() + 86400000).toISOString(),
      relatedId: task.id
    });
  });
  
  // Generate time tracking activities
  timeEntries.forEach(entry => {
    activities.push({
      id: `time-start-${entry.id}`,
      userId: entry.userId,
      type: 'time_start',
      details: `Started time tracking${entry.taskId ? ` for task` : ''}`,
      timestamp: entry.startTime,
      relatedId: entry.taskId
    });
    
    if (entry.endTime) {
      activities.push({
        id: `time-stop-${entry.id}`,
        userId: entry.userId,
        type: 'time_stop',
        details: `Stopped time tracking after ${Math.round(entry.duration / 60)} hr ${entry.duration % 60} min${entry.taskId ? ` for task` : ''}`,
        timestamp: entry.endTime,
        relatedId: entry.taskId
      });
    }
  });
  
  // Sort by timestamp, newest first
  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export default function AdminActivity() {
  const { users, tasks, timeEntries, currentUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [activityType, setActivityType] = useState<string>("all");
  const [userId, setUserId] = useState<string>("all");
  
  // Generate mock activities based on real data
  const allActivities = generateMockActivity(users, tasks, timeEntries, currentUser);
  
  // Filter activities based on search term, activity type, and user
  const filteredActivities = allActivities.filter(activity => {
    const matchesSearch = 
      activity.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      users.find(u => u.id === activity.userId)?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = activityType === "all" || activity.type === activityType;
    const matchesUser = userId === "all" || activity.userId === userId;
    
    return matchesSearch && matchesType && matchesUser;
  });

  const getActivityIcon = (type: ActivityType) => {
    switch(type) {
      case 'login':
      case 'logout':
        return <Clock className="h-4 w-4" />;
      case 'task_create':
      case 'task_update':
        return <FileText className="h-4 w-4" />;
      case 'time_start':
      case 'time_stop':
        return <Calendar className="h-4 w-4" />;
      default:
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const getUserById = (userId: string) => {
    return users.find(user => user.auth_user_id === userId);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Active accounts</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasks.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Across all projects</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md font-medium">Time Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.floor(timeEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60)} hrs
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total tracked time</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="task_create">Task Created</SelectItem>
              <SelectItem value="task_update">Task Updated</SelectItem>
              <SelectItem value="time_start">Time Started</SelectItem>
              <SelectItem value="time_stop">Time Stopped</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map(user => (
                <SelectItem key={user.auth_user_id} value={user.auth_user_id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => {
            setSearchTerm('');
            setActivityType('all');
            setUserId('all');
          }}>
            Reset Filters
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.length > 0 ? (
                filteredActivities.map(activity => {
                  const user = getUserById(activity.userId);
                  if (!user) return null;
                  
                  return (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-muted p-1">
                            {getActivityIcon(activity.type)}
                          </span>
                          <span className="capitalize">{activity.type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>{activity.details}</TableCell>
                      <TableCell className="text-right">
                        {format(new Date(activity.timestamp), "PPP p")}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No activities found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
