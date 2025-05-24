
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";

export default function TaskDetails() {
  const { taskId } = useParams();
  const { getTaskById } = useAppContext();
  
  const task = taskId ? getTaskById(taskId) : null;

  if (!task) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Task Not Found</h1>
        <p className="text-muted-foreground">
          The requested task could not be found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{task.title}</h1>
        <p className="text-muted-foreground">Task Details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <strong>Description:</strong>
              <p className="mt-1">{task.description}</p>
            </div>
            <div>
              <strong>Status:</strong> {task.status}
            </div>
            <div>
              <strong>Priority:</strong> {task.priority}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
