
// Fix for AppContext.tsx
// Replace
// assigneeIds: [],
// With
// assigneeId: undefined,
// collaboratorIds: [],

// Also replace 
// const getTasksByUser = (userId: string) => {
//   return tasks.filter(task => task.assigneeIds.includes(userId));
// };
// With
// const getTasksByUser = (userId: string) => {
//   return tasks.filter(task => task.assigneeId === userId || task.collaboratorIds.includes(userId));
// };

// Make sure to add collaboratorIds to all Task objects
// Example:
// {
//   id: generateId(),
//   title,
//   description,
//   projectId,
//   assigneeId,
//   collaboratorIds: [], // Add this line
//   status,
//   priority,
//   ...rest
// }
