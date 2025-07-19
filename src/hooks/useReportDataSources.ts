import { useMemo } from "react";
import { DataSource, ReportField } from "@/types/reportBuilder";
import { CustomField } from "@/types";

export function useReportDataSources(customFields: CustomField[]): DataSource[] {
  return useMemo(() => {
    const dataSources: DataSource[] = [
      {
        id: "projects",
        name: "Projects",
        table: "projects",
        fields: [
          { id: "id", name: "ID", type: "text", source: {} as DataSource },
          { id: "name", name: "Name", type: "text", source: {} as DataSource },
          { id: "description", name: "Description", type: "text", source: {} as DataSource },
          { id: "status", name: "Status", type: "text", source: {} as DataSource },
          { id: "service_type", name: "Service Type", type: "text", source: {} as DataSource },
          { id: "client_id", name: "Client", type: "text", source: {} as DataSource },
          { id: "allocated_hours", name: "Allocated Hours", type: "number", source: {} as DataSource },
          { id: "used_hours", name: "Used Hours", type: "number", source: {} as DataSource },
          { id: "start_date", name: "Start Date", type: "date", source: {} as DataSource },
          { id: "due_date", name: "Due Date", type: "date", source: {} as DataSource },
          { id: "team_ids", name: "Teams", type: "array", source: {} as DataSource },
          { id: "watcher_ids", name: "Watchers", type: "array", source: {} as DataSource },
          { id: "created_at", name: "Created At", type: "date", source: {} as DataSource },
          { id: "updated_at", name: "Updated At", type: "date", source: {} as DataSource },
        ]
      },
      {
        id: "tasks",
        name: "Tasks",
        table: "tasks",
        fields: [
          { id: "id", name: "ID", type: "text", source: {} as DataSource },
          { id: "title", name: "Title", type: "text", source: {} as DataSource },
          { id: "description", name: "Description", type: "text", source: {} as DataSource },
          { id: "status", name: "Status", type: "text", source: {} as DataSource },
          { id: "priority", name: "Priority", type: "text", source: {} as DataSource },
          { id: "project_id", name: "Project", type: "text", source: {} as DataSource },
          { id: "assignee_id", name: "Assignee", type: "text", source: {} as DataSource },
          { id: "due_date", name: "Due Date", type: "date", source: {} as DataSource },
          { id: "estimated_hours", name: "Estimated Hours", type: "number", source: {} as DataSource },
          { id: "actual_hours", name: "Actual Hours", type: "number", source: {} as DataSource },
          { id: "watcher_ids", name: "Watchers", type: "array", source: {} as DataSource },
          { id: "collaborator_ids", name: "Collaborators", type: "array", source: {} as DataSource },
          { id: "created_at", name: "Created At", type: "date", source: {} as DataSource },
          { id: "updated_at", name: "Updated At", type: "date", source: {} as DataSource },
        ]
      },
      {
        id: "time_entries",
        name: "Time Entries",
        table: "time_entries",
        fields: [
          { id: "id", name: "ID", type: "text", source: {} as DataSource },
          { id: "user_id", name: "User", type: "text", source: {} as DataSource },
          { id: "task_id", name: "Task", type: "text", source: {} as DataSource },
          { id: "project_id", name: "Project", type: "text", source: {} as DataSource },
          { id: "client_id", name: "Client", type: "text", source: {} as DataSource },
          { id: "start_time", name: "Start Time", type: "date", source: {} as DataSource },
          { id: "end_time", name: "End Time", type: "date", source: {} as DataSource },
          { id: "duration", name: "Duration (minutes)", type: "number", source: {} as DataSource },
          { id: "notes", name: "Notes", type: "text", source: {} as DataSource },
          { id: "status", name: "Status", type: "text", source: {} as DataSource },
          { id: "rejection_reason", name: "Rejection Reason", type: "text", source: {} as DataSource },
          { id: "created_at", name: "Created At", type: "date", source: {} as DataSource },
          { id: "updated_at", name: "Updated At", type: "date", source: {} as DataSource },
        ]
      },
      {
        id: "users",
        name: "Users",
        table: "users",
        fields: [
          { id: "id", name: "ID", type: "text", source: {} as DataSource },
          { id: "name", name: "Name", type: "text", source: {} as DataSource },
          { id: "email", name: "Email", type: "text", source: {} as DataSource },
          { id: "role", name: "Role", type: "text", source: {} as DataSource },
          { id: "job_title", name: "Job Title", type: "text", source: {} as DataSource },
          { id: "phone", name: "Phone", type: "text", source: {} as DataSource },
          { id: "employment_type", name: "Employment Type", type: "text", source: {} as DataSource },
          { id: "billing_type", name: "Billing Type", type: "text", source: {} as DataSource },
          { id: "hourly_rate", name: "Hourly Rate", type: "number", source: {} as DataSource },
          { id: "monthly_rate", name: "Monthly Rate", type: "number", source: {} as DataSource },
          { id: "billing_rate", name: "Billing Rate", type: "number", source: {} as DataSource },
          { id: "currency", name: "Currency", type: "text", source: {} as DataSource },
          { id: "team_ids", name: "Teams", type: "array", source: {} as DataSource },
          { id: "is_guest", name: "Is Guest", type: "boolean", source: {} as DataSource },
          { id: "client_role", name: "Client Role", type: "text", source: {} as DataSource },
          { id: "created_at", name: "Created At", type: "date", source: {} as DataSource },
          { id: "updated_at", name: "Updated At", type: "date", source: {} as DataSource },
        ]
      },
      {
        id: "clients",
        name: "Clients",
        table: "clients",
        fields: [
          { id: "id", name: "ID", type: "text", source: {} as DataSource },
          { id: "name", name: "Name", type: "text", source: {} as DataSource },
          { id: "email", name: "Email", type: "text", source: {} as DataSource },
          { id: "phone", name: "Phone", type: "text", source: {} as DataSource },
          { id: "website", name: "Website", type: "text", source: {} as DataSource },
          { id: "address", name: "Address", type: "text", source: {} as DataSource },
          { id: "status", name: "Status", type: "text", source: {} as DataSource },
          { id: "created_at", name: "Created At", type: "date", source: {} as DataSource },
          { id: "updated_at", name: "Updated At", type: "date", source: {} as DataSource },
        ]
      },
      {
        id: "purchases",
        name: "Purchases",
        table: "purchases",
        fields: [
          { id: "id", name: "ID", type: "text", source: {} as DataSource },
          { id: "item_name", name: "Item Name", type: "text", source: {} as DataSource },
          { id: "description", name: "Description", type: "text", source: {} as DataSource },
          { id: "amount", name: "Amount", type: "number", source: {} as DataSource },
          { id: "category", name: "Category", type: "text", source: {} as DataSource },
          { id: "project_id", name: "Project", type: "text", source: {} as DataSource },
          { id: "purchase_date", name: "Purchase Date", type: "date", source: {} as DataSource },
          { id: "approved", name: "Approved", type: "boolean", source: {} as DataSource },
          { id: "approved_by", name: "Approved By", type: "text", source: {} as DataSource },
          { id: "receipt_url", name: "Receipt URL", type: "text", source: {} as DataSource },
          { id: "created_at", name: "Created At", type: "date", source: {} as DataSource },
          { id: "updated_at", name: "Updated At", type: "date", source: {} as DataSource },
        ]
      },
      {
        id: "notes",
        name: "Notes",
        table: "notes",
        fields: [
          { id: "id", name: "ID", type: "text", source: {} as DataSource },
          { id: "title", name: "Title", type: "text", source: {} as DataSource },
          { id: "content", name: "Content", type: "text", source: {} as DataSource },
          { id: "user_id", name: "User", type: "text", source: {} as DataSource },
          { id: "archived", name: "Archived", type: "boolean", source: {} as DataSource },
          { id: "created_at", name: "Created At", type: "date", source: {} as DataSource },
          { id: "updated_at", name: "Updated At", type: "date", source: {} as DataSource },
        ]
      },
      {
        id: "messages",
        name: "Messages",
        table: "messages",
        fields: [
          { id: "id", name: "ID", type: "text", source: {} as DataSource },
          { id: "subject", name: "Subject", type: "text", source: {} as DataSource },
          { id: "content", name: "Content", type: "text", source: {} as DataSource },
          { id: "from_user_id", name: "From User", type: "text", source: {} as DataSource },
          { id: "to_user_id", name: "To User", type: "text", source: {} as DataSource },
          { id: "channel_id", name: "Channel", type: "text", source: {} as DataSource },
          { id: "priority", name: "Priority", type: "text", source: {} as DataSource },
          { id: "read", name: "Read", type: "boolean", source: {} as DataSource },
          { id: "mentioned_users", name: "Mentioned Users", type: "array", source: {} as DataSource },
          { id: "timestamp", name: "Timestamp", type: "date", source: {} as DataSource },
          { id: "created_at", name: "Created At", type: "date", source: {} as DataSource },
          { id: "updated_at", name: "Updated At", type: "date", source: {} as DataSource },
        ]
      },
      {
        id: "teams",
        name: "Teams",
        table: "teams",
        fields: [
          { id: "id", name: "ID", type: "text", source: {} as DataSource },
          { id: "name", name: "Name", type: "text", source: {} as DataSource },
          { id: "description", name: "Description", type: "text", source: {} as DataSource },
          { id: "created_at", name: "Created At", type: "date", source: {} as DataSource },
          { id: "updated_at", name: "Updated At", type: "date", source: {} as DataSource },
        ]
      }
    ];

    // Add custom fields to relevant data sources
    customFields.forEach(customField => {
      customField.applicableTo.forEach(entityType => {
        const dataSource = dataSources.find(ds => ds.id === entityType);
        if (dataSource) {
          const reportField: ReportField = {
            id: `custom_${customField.id}`,
            name: `${customField.name} (Custom)`,
            type: customField.type as any,
            source: dataSource,
            isCustomField: true
          };
          dataSource.fields.push(reportField);
        }
      });
    });

    // Set proper source references
    dataSources.forEach(dataSource => {
      dataSource.fields.forEach(field => {
        field.source = dataSource;
      });
    });

    return dataSources;
  }, [customFields]);
}