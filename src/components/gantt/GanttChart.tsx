import React, { useMemo } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface GanttTask {
  id: string;
  title: string;
  owner?: string;
  startDate: string | Date;
  dueDate: string | Date;
  status: string;
  onClick?: () => void;
}

interface GanttChartProps {
  tasks: GanttTask[];
  title?: string;
  dateRange?: { start: Date; end: Date };
}

const STATUS_COLORS: Record<string, string> = {
  'backlog': 'bg-gray-300',
  'todo': 'bg-blue-300',
  'in-progress': 'bg-yellow-400',
  'review': 'bg-purple-300',
  'awaiting-feedback': 'bg-orange-400',
  'done': 'bg-green-300',
};

export function GanttChart({ tasks, title = 'Gantt Chart', dateRange }: GanttChartProps) {
  const { start, end, sortedTasks, daysSpan } = useMemo(() => {
    const taskDates = tasks.flatMap(t => [
      parseISO(typeof t.startDate === 'string' ? t.startDate : t.startDate.toISOString()),
      parseISO(typeof t.dueDate === 'string' ? t.dueDate : t.dueDate.toISOString()),
    ]);

    const start = dateRange?.start || new Date(Math.min(...taskDates.map(d => d.getTime())));
    const end = dateRange?.end || new Date(Math.max(...taskDates.map(d => d.getTime())));

    const daysSpan = differenceInDays(end, start) + 1;

    return {
      start,
      end,
      sortedTasks: [...tasks].sort((a, b) => {
        const aStart = parseISO(typeof a.startDate === 'string' ? a.startDate : a.startDate.toISOString());
        const bStart = parseISO(typeof b.startDate === 'string' ? b.startDate : b.startDate.toISOString());
        return aStart.getTime() - bStart.getTime();
      }),
      daysSpan,
    };
  }, [tasks, dateRange]);

  const getTaskPosition = (task: GanttTask) => {
    const taskStart = parseISO(typeof task.startDate === 'string' ? task.startDate : task.startDate.toISOString());
    const taskEnd = parseISO(typeof task.dueDate === 'string' ? task.dueDate : task.dueDate.toISOString());

    const offsetDays = differenceInDays(taskStart, start);
    const duration = differenceInDays(taskEnd, taskStart) + 1;

    return {
      left: (offsetDays / daysSpan) * 100,
      width: Math.max((duration / daysSpan) * 100, 2),
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline header */}
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Dates row */}
            <div className="flex text-xs text-muted-foreground mb-2">
              <div className="w-48 flex-shrink-0 pr-2"></div>
              <div className="flex-1 flex">
                {Array.from({ length: Math.min(daysSpan, 60) }).map((_, i) => {
                  const date = new Date(start);
                  date.setDate(date.getDate() + i);
                  return (
                    <div
                      key={i}
                      className="flex-1 text-center border-l border-gray-200 text-xs"
                      style={{ minWidth: `${100 / Math.min(daysSpan, 60)}%` }}
                    >
                      {i % 7 === 0 && format(date, 'MMM d')}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              {sortedTasks.map((task) => {
                const position = getTaskPosition(task);
                const statusColor = STATUS_COLORS[task.status] || 'bg-gray-300';

                return (
                  <div key={task.id} className="flex items-center gap-2">
                    {/* Task info */}
                    <div className="w-48 flex-shrink-0 pr-2 text-sm truncate">
                      <div className="font-medium truncate">{task.title}</div>
                      {task.owner && <div className="text-xs text-muted-foreground">{task.owner}</div>}
                    </div>

                    {/* Gantt bar */}
                    <div className="flex-1 relative h-8 bg-muted/30 rounded border border-muted-foreground/20">
                      <div
                        className={`absolute h-full rounded cursor-pointer hover:opacity-80 transition-opacity ${statusColor}`}
                        style={{
                          left: `${position.left}%`,
                          width: `${position.width}%`,
                          minWidth: '20px',
                        }}
                        onClick={task.onClick}
                        title={`${task.title} (${task.status})`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 pt-4 border-t text-xs">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${color}`}></div>
              <span className="capitalize">{status.replace('-', ' ')}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
