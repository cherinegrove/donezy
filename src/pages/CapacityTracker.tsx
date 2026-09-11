import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { GanttChart, GanttTask } from '@/components/gantt/GanttChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FilterState {
  owner: string;
  project: string;
  client: string;
  days: '30' | '60' | '90';
}

export function CapacityTracker() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    owner: '',
    project: '',
    client: '',
    days: '60',
  });

  useEffect(() => {
    loadFilters();
    loadTasks();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [filters]);

  const loadFilters = async () => {
    try {
      // Load owners (users in organization)
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name')
        .order('name');

      setOwners(usersData || []);

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, clientId')
        .order('name');

      setProjects(projectsData || []);

      // Load clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('tasks')
        .select(`
          id,
          title,
          assigneeId,
          status,
          dueDate,
          startDate,
          createdAt,
          projectId,
          projects(name, clientId)
        `)
        .neq('status', 'done')
        .order('dueDate', { ascending: true });

      // Apply filters
      if (filters.owner) {
        query = query.eq('assigneeId', filters.owner);
      }

      if (filters.project) {
        query = query.eq('project_id', filters.project);
      }

      const { data: tasksData } = await query;

      if (tasksData) {
        let filtered = tasksData;

        // Filter by client if selected
        if (filters.client) {
          filtered = filtered.filter(
            (task: any) => task.projects?.clientId === filters.client
          );
        }

        // Filter by date range
        const daysNum = parseInt(filters.days);
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + daysNum);

        filtered = filtered.filter((task: any) => {
          const dueDate = task.dueDate ? new Date(task.dueDate) : new Date();
          return dueDate <= maxDate;
        });

        const ganttTasks: GanttTask[] = filtered.map((task: any) => ({
          id: task.id,
          title: task.title,
          owner: task.assigneeId, // Can enhance to show name
          startDate: task.startDate || task.createdAt,
          dueDate: task.dueDate || new Date().toISOString(),
          status: task.status,
          onClick: () => navigate(`/tasks/${task.id}`),
        }));

        setTasks(ganttTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      owner: '',
      project: '',
      client: '',
      days: '60',
    });
  };

  const dateRange = {
    start: new Date(),
    end: new Date(Date.now() + parseInt(filters.days) * 24 * 60 * 60 * 1000),
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Capacity Tracker</h1>
        <p className="text-muted-foreground">View team capacity and task timeline across all projects</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium block mb-2">Owner</label>
              <Select value={filters.owner} onValueChange={(value) => setFilters({ ...filters, owner: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All team members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All team members</SelectItem>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Project</label>
              <Select value={filters.project} onValueChange={(value) => setFilters({ ...filters, project: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Client</label>
              <Select value={filters.client} onValueChange={(value) => setFilters({ ...filters, client: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Time Range</label>
              <Select value={filters.days} onValueChange={(value: any) => setFilters({ ...filters, days: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Next 30 days</SelectItem>
                  <SelectItem value="60">Next 60 days</SelectItem>
                  <SelectItem value="90">Next 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={handleReset} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {tasks.filter((t) => t.status === 'in-progress').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">To Do</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {tasks.filter((t) => t.status === 'todo').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Backlog</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {tasks.filter((t) => t.status === 'backlog').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gantt Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <GanttChart tasks={tasks} title="Team Capacity Timeline" dateRange={dateRange} />
      )}
    </div>
  );
}
