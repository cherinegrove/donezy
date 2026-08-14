# User Roles & Permissions

Understanding roles and permissions helps you control who can do what in your organization.

## User Roles Overview

Donezy has four main user roles at the organization level:

### Admin
**Full access to everything**
- Create and manage users
- Access all projects and tasks
- Manage billing and subscriptions
- Configure organization settings
- Access audit logs
- Manage integrations
- Create and manage teams

### Manager
**Manage projects and team members**
- Create and edit projects
- Assign tasks to team members
- Manage project team members
- View team reports and analytics
- Cannot access billing or organization settings
- Cannot manage users at organization level

### Member
**Contribute to projects and tasks**
- Create and edit their own tasks
- Collaborate on assigned tasks
- Track time
- View projects they're part of
- Participate in channels and comments
- Cannot create projects (unless manager approves)
- Cannot edit other members' tasks

### Viewer
**Read-only access**
- View projects and tasks
- View dashboards and reports
- Cannot edit or create anything
- Good for stakeholders and clients
- Cannot access admin settings

## Project-Level Permissions

In addition to organization roles, team members can have specific permissions on individual projects:

### Project Owner
- Full control of the project
- Can edit project settings
- Can add/remove team members
- Can delete the project

### Project Editor
- Can edit tasks and project details
- Can add team members to project
- Cannot delete the project or change ownership

### Project Viewer
- Can view all project details
- Read-only access to tasks
- Cannot make changes

### Task Contributor
- Can only see tasks assigned to them
- Can edit their assigned tasks
- Can add comments and time

## Assigning Roles

### To Organization Members
1. Go to **Settings** → **Team Management**
2. Find the user you want to update
3. Click the role dropdown
4. Select new role
5. Changes take effect immediately

### To Project Members
1. Open the **Project**
2. Go to **Project Settings** → **Team**
3. Click the user's role
4. Select new project role
5. Save changes

## Custom Permissions

Some actions can be controlled independently:

### Task Management
- Create tasks
- Edit all tasks
- Delete tasks
- Reassign tasks

### Time Tracking
- Track time
- Edit own time entries
- Edit all time entries
- Delete time entries

### Collaboration
- Comment on tasks
- Mention users
- Create channels
- Manage channels

### Client Portal
- Access client portal
- View specific client projects
- Submit feedback

## Guest Access

Invite external users (clients, contractors) with limited access:

1. Go to **Settings** → **Guest Management**
2. Click **Invite Guest**
3. Select which projects they can access
4. Set their permission level
5. Choose expiration date (optional)
6. Send invite

Guests can:
- View assigned projects/tasks
- Submit comments
- View project files
- Access client portal

Guests cannot:
- See private organization details
- Access user list
- Manage other users
- Access billing

## Permission Matrix

| Action | Admin | Manager | Member | Viewer |
|--------|-------|---------|--------|--------|
| Manage users | ✓ | ✗ | ✗ | ✗ |
| Create projects | ✓ | ✓ | ✓* | ✗ |
| Edit projects | ✓ | ✓ | ✓* | ✗ |
| Create tasks | ✓ | ✓ | ✓ | ✗ |
| Manage team | ✓ | ✓ | ✓* | ✗ |
| View all data | ✓ | ✓ | ✓* | ✓* |
| Access billing | ✓ | ✗ | ✗ | ✗ |
| Access admin | ✓ | ✗ | ✗ | ✗ |
| Track time | ✓ | ✓ | ✓ | ✗ |

*With project-level restrictions

## Audit Trail

Admins can view all permission changes:

1. Go to **Admin Portal** → **Audit Logs**
2. Filter by "Role Changes"
3. See who made changes and when

## Best Practices

- **Give least privilege**: Only grant the minimum access needed
- **Use Managers for projects**: Let project managers handle team assignments
- **Audit regularly**: Review user roles and access quarterly
- **Separate duties**: Don't let one person manage billing and ops
- **Review guests**: Remove expired guest access regularly

## Troubleshooting Permissions

**User can't see a project?**
- Check if they're on the project team
- Verify their project-level role

**Can't edit a task?**
- Check if you have project editor or owner role
- Verify it's not locked by another user

**Missing admin option?**
- You need Admin role at organization level
- Contact your admin to grant access

## See Also
- [Team Management](../teams-users/01-managing-team-members.md)
- [Organization Settings](../admin/03-organization-settings.md)
- [Security & Privacy](../topics/security.md)
