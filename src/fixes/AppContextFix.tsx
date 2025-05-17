
// Fix for AppContext.tsx

// For the addTask function, make sure to add collaboratorIds:
// Replace:
// const newTask = {
//   title,
//   description,
//   projectId,
//   assigneeId,
//   status,
//   priority,
//   ...rest
// }

// With:
// const newTask = {
//   title,
//   description,
//   projectId,
//   assigneeId,
//   collaboratorIds: [],
//   status,
//   priority,
//   ...rest
// }

// Also for the addNestedTask function:
// const nestedTask = {
//   id: generateId(),
//   title,
//   description,
//   projectId,
//   parentTaskId: task.id,
//   assigneeId,
//   collaboratorIds: [],
//   status: 'todo',
//   priority: 'medium',
//   createdAt: new Date().toISOString(),
//   customFields: {},
//   subtasks: [],
//   timeEntries: [],
//   comments: []
// }

// Also fix the getTasksByUser function:
// const getTasksByUser = (userId: string) => {
//   return tasks.filter(task => task.assigneeId === userId || task.collaboratorIds.includes(userId));
// };
