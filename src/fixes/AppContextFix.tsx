
// Fix for AppContext.tsx
// Replace
// assigneeIds: [],
// With
// assigneeId: undefined,

// Also replace 
// const getTasksByUser = (userId: string) => {
//   return tasks.filter(task => task.assigneeIds.includes(userId));
// };
// With
// const getTasksByUser = (userId: string) => {
//   return tasks.filter(task => task.assigneeId === userId);
// };
