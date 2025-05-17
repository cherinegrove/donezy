
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

// Fix in createProjectFromTemplate:
// tasksToCreate.push({
//   title: templateTask.title,
//   description: templateTask.description,
//   projectId: projectId,
//   assigneeId: taskIdMap.get(index) || `user-${uuidv4()}`, // Use assigneeId instead of assigneeIds
//   collaboratorIds: [],
//   status: templateTask.status,
//   priority: templateTask.priority,
//   customFields: {},
//   subtasks: []
// });

// And in the same function:
// const newSubtask: Task = {
//   id: subtaskId,
//   title: subtask.title,
//   description: subtask.description,
//   projectId: projectId,
//   parentTaskId: parentTaskId,
//   assigneeId: subtaskId, // Use assigneeId instead of assigneeIds
//   collaboratorIds: [],
//   status: "todo",
//   priority: "medium",
//   createdAt: new Date().toISOString(),
//   customFields: {},
//   subtasks: [],
//   timeEntries: [],
//   comments: []
// };

