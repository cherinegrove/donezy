
// Fix for TeamOverview.tsx
// Replace
// const assignedTasks = tasks.filter(task => task.assigneeIds.includes(user.id));
// With
// const assignedTasks = tasks.filter(task => task.assigneeId === user.id);

// Replace 
// if (task.assigneeIds.includes(user.id))
// With
// if (task.assigneeId === user.id)
