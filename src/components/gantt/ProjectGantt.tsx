import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { GanttChart, GanttTask } from './GanttChart';
import { Loader2 } from 'lucide-react';
import { parseISO } from 'date-fns';

interface ProjectGanttProps {
  projectId: string;
  onTaskClick?: (taskId: string) => void;
}

export function ProjectGantt({ projectId, onTaskClick }: ProjectGanttProps) {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch project
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      setProject(projectData);

      // Fetch tasks for project
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, assigneeId, status, dueDate, startDate, createdAt')
        .eq('project_id', projectId)
        .neq('status', 'done')
        .order('dueDate', { ascending: true });

      if (tasksData) {
        const ganttTasks: GanttTask[] = tasksData.map(task => ({
          id: task.id,
          title: task.title,
          owner: task.assigneeId, // We can enhance this to show assignee name later
          startDate: task.startDate || task.createdAt,
          dueDate: task.dueDate || new Date().toISOString(),
          status: task.status,
          onClick: () => onTaskClick?.(task.id),
        }));

        setTasks(ganttTasks);
      }
    } catch (error) {
      console.error('Error loading project gantt:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dateRange = project
    ? {
        start: project.startDate ? parseISO(project.startDate) : new Date(),
        end: project.dueDate ? parseISO(project.dueDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      }
    : undefined;

  return <GanttChart tasks={tasks} title={`${project?.name} - Timeline`} dateRange={dateRange} />;
}
