
// Fix for EditTaskDialog.tsx
// Replace
// setSelectedTask(null);
// setIsEditDialogOpen(false);
// With
// setNestedSelectedTask(null);
// setIsNestedDialogOpen(false);

// Also replace
// <TaskWatchButton taskId={task.id} />
// With
// <TaskWatchButton task={task} />
