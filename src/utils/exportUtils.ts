import { format } from "date-fns";

export interface ClientReportData {
  client: { id: string; name: string };
  totalMinutes: number;
  projectDetails: Record<string, {
    project: { id: string; name: string };
    totalMinutes: number;
    taskDetails: Record<string, {
      task: { id: string; title: string };
      totalMinutes: number;
      entries: Array<{
        id: string;
        startTime: string;
        duration: number;
        notes?: string | null;
      }>;
    }>;
  }>;
}

export const generateClientMonthlyReportCSV = (
  clientData: Record<string, ClientReportData>,
  month: string,
  users: Array<{ id: string; name: string; email: string }>
): string => {
  const [year, monthNum] = month.split('-');
  const monthName = format(new Date(parseInt(year), parseInt(monthNum) - 1), 'MMMM yyyy');
  
  let csv = '';
  
  // Header
  csv += `Monthly Time Report - ${monthName}\n`;
  csv += `Generated: ${format(new Date(), 'PPpp')}\n\n`;
  
  // Process each client
  Object.values(clientData).forEach(clientInfo => {
    csv += `\nCLIENT: ${clientInfo.client.name}\n`;
    csv += `Total Hours: ${(clientInfo.totalMinutes / 60).toFixed(2)}\n\n`;
    
    // Process each project for this client
    Object.values(clientInfo.projectDetails).forEach(projectInfo => {
      csv += `  PROJECT: ${projectInfo.project.name}\n`;
      csv += `  Project Hours: ${(projectInfo.totalMinutes / 60).toFixed(2)}\n\n`;
      
      // Process each task
      Object.values(projectInfo.taskDetails).forEach(taskInfo => {
        csv += `    TASK: ${taskInfo.task.title}\n`;
        csv += `    Task Hours: ${(taskInfo.totalMinutes / 60).toFixed(2)}\n`;
        
        // Add time entry details
        if (taskInfo.entries.length > 0) {
          csv += `    Date,Time,Duration (hours),Notes\n`;
          taskInfo.entries.forEach(entry => {
            const entryDate = format(new Date(entry.startTime), 'yyyy-MM-dd');
            const entryTime = format(new Date(entry.startTime), 'HH:mm');
            const hours = (entry.duration / 60).toFixed(2);
            const notes = (entry.notes || '').replace(/,/g, ';').replace(/\n/g, ' ');
            csv += `    ${entryDate},${entryTime},${hours},"${notes}"\n`;
          });
        }
        csv += `\n`;
      });
    });
    
    csv += `\n${'='.repeat(80)}\n`;
  });
  
  return csv;
};

export const generateClientDetailedReportCSV = (
  clientData: Record<string, ClientReportData>,
  month: string,
  selectedClientId?: string,
  users?: Array<{ id: string; name: string; email: string }>
): string => {
  const [year, monthNum] = month.split('-');
  const monthName = format(new Date(parseInt(year), parseInt(monthNum) - 1), 'MMMM yyyy');
  
  // Filter to selected client if specified
  const dataToExport = selectedClientId 
    ? { [selectedClientId]: clientData[selectedClientId] }
    : clientData;
  
  let csv = '';
  
  // Header
  csv += `Time Report - ${monthName}\n`;
  csv += `Generated: ${format(new Date(), 'PPpp')}\n\n`;
  
  // Column headers
  csv += `Date Time,Project,Task,User,Time\n`;
  
  // Process each client
  Object.values(dataToExport).forEach(clientInfo => {
    if (!clientInfo) return;
    
    // Process each project
    Object.values(clientInfo.projectDetails).forEach(projectInfo => {
      // Process each task
      Object.values(projectInfo.taskDetails).forEach(taskInfo => {
        // Process each time entry
        taskInfo.entries.forEach((entry: any) => {
          const dateTime = format(new Date(entry.startTime), 'yyyy-MM-dd HH:mm');
          const hours = (entry.duration / 60).toFixed(2);
          const userName = users?.find(u => u.id === entry.userId)?.name || 'Unknown User';
          
          csv += `"${dateTime}","${projectInfo.project.name}","${taskInfo.task.title}","${userName}",${hours}\n`;
        });
      });
    });
  });
  
  return csv;
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};
