# API Documentation

This document describes the REST API endpoints available for creating tasks, clients, and projects in the platform.

## Authentication

All API endpoints require authentication via an API key passed in the `x-api-key` header. The API key should be the user's ID from the platform.

```
x-api-key: your-user-id-here
```

## Base URL

All endpoints are available at:
```
https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1/
```

## Endpoints

### Create Task

**POST** `/api-create-task`

Creates a new task in the platform.

#### Request Headers
```
Content-Type: application/json
x-api-key: your-user-id
```

#### Request Body
```json
{
  "title": "Task title (required)",
  "description": "Task description (optional)",
  "project_id": "uuid of the project (required)",
  "assignee_id": "uuid of the assignee (optional)",
  "status": "backlog|todo|in-progress|review|done (optional, default: backlog)",
  "priority": "low|medium|high (optional, default: medium)",
  "due_date": "2024-12-31 (optional)",
  "collaborator_ids": ["uuid1", "uuid2"] // optional array
}
```

#### Response
```json
{
  "success": true,
  "task": {
    "id": "task-uuid",
    "title": "Task title",
    "description": "Task description",
    "project_id": "project-uuid",
    "status": "backlog",
    "priority": "medium",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Task created successfully"
}
```

### Create Client

**POST** `/api-create-client`

Creates a new client in the platform.

#### Request Headers
```
Content-Type: application/json
x-api-key: your-user-id
```

#### Request Body
```json
{
  "name": "Client name (required)",
  "email": "client@example.com (required)",
  "phone": "+1-555-0123 (optional)",
  "website": "https://example.com (optional)",
  "address": "123 Main St, City, Country (optional)",
  "status": "active|inactive (optional, default: active)"
}
```

#### Response
```json
{
  "success": true,
  "client": {
    "id": "client-uuid",
    "name": "Client name",
    "email": "client@example.com",
    "phone": "+1-555-0123",
    "website": "https://example.com",
    "status": "active",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Client created successfully"
}
```

### Create Project

**POST** `/api-create-project`

Creates a new project in the platform.

#### Request Headers
```
Content-Type: application/json
x-api-key: your-user-id
```

#### Request Body
```json
{
  "name": "Project name (required)",
  "description": "Project description (optional)",
  "client_id": "uuid of the client (optional)",
  "status": "planning|active|on-hold|completed (optional, default: planning)",
  "allocated_hours": 100, // optional number
  "start_date": "2024-01-01 (optional)",
  "end_date": "2024-12-31 (optional)",
  "team_ids": ["team-uuid1", "team-uuid2"] // optional array
}
```

#### Response
```json
{
  "success": true,
  "project": {
    "id": "project-uuid",
    "name": "Project name",
    "description": "Project description",
    "client_id": "client-uuid",
    "status": "planning",
    "allocated_hours": 100,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Project created successfully"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (missing required fields, invalid data)
- `401` - Unauthorized (missing or invalid API key)
- `404` - Not Found (referenced resource doesn't exist)
- `405` - Method Not Allowed (wrong HTTP method)
- `409` - Conflict (duplicate resource, e.g., client email already exists)
- `500` - Internal Server Error

## Usage Examples

### cURL Examples

#### Create a task:
```bash
curl -X POST https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1/api-create-task \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-user-id" \
  -d '{
    "title": "Implement user authentication",
    "description": "Add login and signup functionality",
    "project_id": "123e4567-e89b-12d3-a456-426614174000",
    "priority": "high",
    "status": "todo"
  }'
```

#### Create a client:
```bash
curl -X POST https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1/api-create-client \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-user-id" \
  -d '{
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "phone": "+1-555-0123",
    "website": "https://acme.com"
  }'
```

#### Create a project:
```bash
curl -X POST https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1/api-create-project \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-user-id" \
  -d '{
    "name": "E-commerce Platform",
    "description": "Build a modern e-commerce website",
    "client_id": "123e4567-e89b-12d3-a456-426614174000",
    "allocated_hours": 200,
    "status": "active"
  }'
```

### JavaScript/Node.js Example

```javascript
const apiKey = 'your-user-id';
const baseUrl = 'https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1';

async function createTask(taskData) {
  const response = await fetch(`${baseUrl}/api-create-task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify(taskData)
  });
  
  return response.json();
}

// Usage
const newTask = await createTask({
  title: 'Design homepage',
  description: 'Create wireframes and mockups',
  project_id: 'project-uuid',
  priority: 'medium'
});
```

### Python Example

```python
import requests

API_KEY = 'your-user-id'
BASE_URL = 'https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1'

def create_client(client_data):
    response = requests.post(
        f'{BASE_URL}/api-create-client',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        },
        json=client_data
    )
    return response.json()

# Usage
new_client = create_client({
    'name': 'Tech Startup Inc',
    'email': 'hello@techstartup.com',
    'phone': '+1-555-0456'
})
```

## Notes

- The API key is your user ID from the platform's users table
- All dates should be in ISO 8601 format (YYYY-MM-DD or full datetime)
- UUIDs must be valid v4 UUIDs
- Referenced resources (projects, clients, teams) must exist and belong to the authenticated user
- Email addresses must be valid and unique per user account