
-- Add Google Chat notification settings to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS google_chat_settings JSONB DEFAULT '{
  "webhook_url": null,
  "enabled": false,
  "notifications": {
    "task_created": {
      "enabled": true,
      "message_template": "🆕 New task created: {{task_title}} in project {{project_name}}"
    },
    "task_completed": {
      "enabled": true,
      "message_template": "✅ Task completed: {{task_title}} in project {{project_name}}"
    },
    "task_overdue": {
      "enabled": true,
      "message_template": "⚠️ Task overdue: {{task_title}} in project {{project_name}} (Due: {{due_date}})"
    },
    "task_updated": {
      "enabled": false,
      "message_template": "📝 Task updated: {{task_title}} in project {{project_name}}"
    }
  }
}'::jsonb;
