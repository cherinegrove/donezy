
// Fix for mockData.ts
// For each task definition in the mock data:
// Replace:
// assigneeIds: ["user-X", "user-Y"],
// With:
// assigneeId: "user-X",
// Where "user-X" is the first user in the original assigneeIds array

// Also add:
// collaboratorIds: [],
// To each task definition
