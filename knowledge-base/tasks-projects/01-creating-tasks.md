# Creating Tasks

Tasks are the core of Donezy. Learn how to create and structure tasks for your projects.

## Quick Task Creation

### Using the New Task Button

1. Click the **+** button in the sidebar
2. Click **New Task**
3. Enter task title
4. Click "Create Quick Task"

This creates a basic task you can edit later with more details.

### From the Tasks Page

1. Go to **Tasks**
2. Click **New Task** button
3. Enter required information
4. Click **Create Task**

### From a Project

1. Open a **Project**
2. Click **Add Task**
3. Fill in task details
4. Click **Create Task**

The task automatically belongs to that project.

## Full Task Creation Form

When creating a task, you can set:

### Basic Information

**Title** (Required)
- What the task is about
- Be specific and descriptive
- Examples: "Design homepage mockup", "Fix login bug"

**Description** (Optional)
- Detailed explanation of the task
- Context and background
- Steps or requirements
- Use rich text formatting

**Project** (Required)
- Which project this task belongs to
- Cannot be changed after creation
- Create new project option available

### Scheduling

**Due Date** (Optional)
- When the task should be completed
- Click to choose date from calendar
- Set reminders for approaching deadlines

**Start Date** (Optional)
- When work should begin
- Creates a time window for work
- Useful for planning

**Priority** (Optional)
- Urgent / High / Medium / Low
- Affects task ordering
- Shows in notifications

### Assignment

**Assignee**
- Who will do the work
- Can be yourself or team members
- Leave empty for unassigned
- Can be changed anytime

**Collaborators** (Optional)
- Add multiple people
- Give them update visibility
- They can add comments
- Receive task notifications

**Watchers** (Optional)
- Interested parties who want updates
- View-only access by default
- Receive activity notifications

### Task Organization

**Status** (Optional)
- Backlog / Todo / In Progress / Done / On Hold
- Default is Backlog
- Changeable anytime

**Labels** (Optional)
- Categorize tasks with tags
- Multiple labels per task
- Use existing labels or create new
- Filter tasks by labels

**Subtasks** (Optional)
- Break complex tasks into smaller items
- Track progress on subtasks
- Check off as you complete them
- Created after main task saved

### Custom Fields

If your organization has custom fields, set them:
- Examples: Budget, Client, Hours Estimated
- Varies by organization
- Optional unless marked required

### Additional Options

**Recurring**
- Create repeating tasks
- Daily / Weekly / Monthly / Custom
- Set end date or number of occurrences

**Estimate** (Hours)
- How long task will take
- Used for scheduling
- Compared against actual time tracked

**Milestone** (Optional)
- Link to project milestone
- Track progress toward milestones
- Group related tasks

## Creating From Template

### Using Task Templates

1. Go to **Projects** → **Templates**
2. Find a template
3. Click **Use Template**
4. Customize task details
5. Click **Create Task**

Templates can include:
- Title and description
- Default assignee
- Estimated hours
- Subtasks
- Labels

### Organization Templates

Admins can create organization-wide task templates:

1. Go to **Admin** → **Task Templates**
2. Click **New Template**
3. Set up the template
4. Team members can use it

## Advanced Task Creation

### Bulk Create Tasks

Create multiple tasks at once:

1. Go to **Projects** → **Bulk Actions**
2. Click **Import Tasks**
3. Use template or CSV
4. Upload file
5. Map fields
6. Review and create

### From Integrations

Create tasks from:
- **Google Chat**: Forward messages to Donezy
- **Slack**: Use `/donezy create task`
- **Email**: Forward emails to create tasks
- **External apps**: Use Donezy API

### From Comments

Turn a comment into a task:

1. Comment on a task
2. Type `/task` followed by description
3. Press Enter
4. New task created

## Task Naming Best Practices

### Good Task Titles
- ✅ "Design homepage hero section"
- ✅ "Fix login button alignment on mobile"
- ✅ "Review Q3 budget proposal"
- ✅ "Deploy v2.1 to production"

### Poor Task Titles
- ❌ "Work on stuff"
- ❌ "Important"
- ❌ "Thing"
- ❌ "Check this out"

### Naming Tips
- **Be specific**: Who, what, when, where
- **Avoid jargon**: Use team language
- **Action-oriented**: Start with verb when possible
- **Measurable**: Include acceptance criteria in description
- **Scope**: One task = one clear deliverable

## Setting Up Subtasks

### Adding Subtasks

1. Open a task
2. Scroll to **Subtasks**
3. Click **Add Subtask**
4. Enter title
5. Press Enter or click "Create"

### Managing Subtasks

Each subtask can have:
- Title
- Assigned person
- Due date
- Status
- Notes

### Subtask Best Practices

- Use 3-5 subtasks per task
- Make subtasks independent if possible
- Assign different people if needed
- Set progressive due dates
- Use for complex work breakdown

## Linking Tasks

### Create Task Dependencies

Link tasks to show:
- **Blocks**: This task blocks another
- **Depends on**: Requires another task first
- **Related**: Loosely connected

1. Open a task
2. Click **Links**
3. Click **Add Link**
4. Select link type
5. Choose related task

## Quick Templates

Use shortcuts for common task patterns:

### Project Planning Tasks
- Project kickoff meeting
- Requirements gathering
- Design review
- Development sprint
- Testing & QA
- Launch prep
- Post-launch review

### Development Tasks
- Create database schema
- Build API endpoint
- Implement UI component
- Write tests
- Fix bug
- Refactor code
- Performance optimization

### Content Tasks
- Write outline
- Draft content
- Edit & review
- Optimize for SEO
- Publish
- Promote
- Measure results

## Customizing Task Creation

### Set Personal Defaults

In **Settings** → **Preferences**:
- Default project for new tasks
- Default assignee (yourself)
- Default priority
- Default status

New tasks use these defaults automatically.

### Team Task Templates

Admins can create team-specific templates:

1. **Admin** → **Task Templates**
2. Create templates for common work
3. Share with team
4. Team uses when creating tasks

## Common Scenarios

### Creating a Bug Fix Task

1. **Title**: "Fix mobile dropdown menu overflow"
2. **Priority**: High (if blocking users)
3. **Description**: Include steps to reproduce, expected behavior, actual behavior
4. **Labels**: "bug", "mobile", "urgent"
5. **Estimate**: 2-4 hours
6. **Assign to**: Developer

### Creating a Feature Request

1. **Title**: "Add dark mode option"
2. **Priority**: Medium (nice to have)
3. **Description**: User benefit, acceptance criteria
4. **Subtasks**: Design, implement, test, document
5. **Estimate**: 8 hours
6. **Assign to**: Designer first, then Developer

### Creating a Content Task

1. **Title**: "Write blog post: Tips for Remote Teams"
2. **Due Date**: Next Friday
3. **Description**: Target audience, length (800 words), tone
4. **Labels**: "content", "blog", "marketing"
5. **Collaborators**: Add editor
6. **Subtasks**: Research, write draft, review, edit, publish

## Editing After Creation

You can change almost everything after creating a task:

1. Open the task
2. Click **Edit**
3. Modify details
4. Click **Save**

The task history shows what changed.

## Deleting Tasks

### Delete a Task

1. Open the task
2. Click the three-dot menu
3. Click **Delete**
4. Confirm deletion

**Warning**: Deletion is permanent! Consider archiving instead.

### Archive Instead of Delete

For tasks to keep but hide:

1. Open the task
2. Click **Archive**
3. Task hidden from lists
4. Can be recovered later

## See Also
- [Task Management](./02-task-management.md)
- [Task Workflows](./03-task-workflows.md)
- [Creating Projects](./04-creating-projects.md)
