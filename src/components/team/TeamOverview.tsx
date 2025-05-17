import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Task } from "@/types";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function TeamOverview() {
  const { users, tasks, currentUser } = useAppContext();
  
  // Only show team members that the current user manages or all users for admins
  const teamMembers = users.filter(user => {
    if (currentUser?.role === "admin") return true;
    if (currentUser?.role === "manager") {
      return user.managerId === currentUser.id || user.id === currentUser.id;
    }
    return false;
  });
  
  // Calculate task statistics for each team member
  const teamMemberStats = teamMembers.map(user => {
    // Get tasks assigned to this user
    const assignedTasks = tasks.filter(task => task.assigneeId === user.id);
    
    // Calculate completion percentage
    const totalTasks = assignedTasks.length;
    const completedTasks = assignedTasks.filter(task => task.status === "done").length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Get overdue tasks
    const today = new Date();
    const overdueTasks = assignedTasks.filter(task => 
      task.status !== "done" && 
      task.dueDate && 
      new Date(task.dueDate) < today
    );
    
    // Get tasks due soon (next 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const tasksDueSoon = assignedTasks.filter(task => 
      task.status !== "done" && 
      task.dueDate && 
      new Date(task.dueDate) >= today && 
      new Date(task.dueDate) <= threeDaysFromNow
    );
    
    // Get current task (in progress)
    const currentTask = assignedTasks.find(task => task.status === "in-progress");
    
    return {
      user,
      totalTasks,
      completedTasks,
      completionPercentage,
      overdueTasks,
      tasksDueSoon,
      currentTask
    };
  });
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Team Overview</h2>
        <Button variant="outline" size="sm" asChild>
          <Link to="/team">
            View Team <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMemberStats.map(({ user, totalTasks, completedTasks, completionPercentage, overdueTasks, tasksDueSoon, currentTask }) => (
          <Card key={user.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{user.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{user.role}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Task Completion</span>
                  <span>{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {completedTasks} of {totalTasks} tasks completed
                </p>
              </div>
              
              {currentTask && (
                <div>
                  <p className="text-sm font-medium">Current Task:</p>
                  <p className="text-sm truncate">{currentTask.title}</p>
                  {currentTask.dueDate && (
                    <p className="text-xs text-muted-foreground">
                      Due: {format(new Date(currentTask.dueDate), "MMM d")}
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className={overdueTasks.length > 0 ? "text-destructive" : ""}>
                  {overdueTasks.length} overdue
                </span>
                <span className={tasksDueSoon.length > 0 ? "text-amber-500" : ""}>
                  {tasksDueSoon.length} due soon
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
