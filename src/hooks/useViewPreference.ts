import { useState } from 'react';

type ViewType = 'list' | 'kanban' | 'timeline' | 'calendar' | 'gantt';

/**
 * Hook for managing and persisting view preferences
 * Automatically saves and loads view selections from localStorage
 */
export function useViewPreference(
  storageKey: string,
  defaultView: ViewType = 'kanban'
) {
  const [view, setViewState] = useState<ViewType>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return (saved as ViewType) || defaultView;
    } catch {
      return defaultView;
    }
  });

  const setView = (newView: ViewType) => {
    setViewState(newView);
    try {
      localStorage.setItem(storageKey, newView);
    } catch (error) {
      console.error('Failed to save view preference:', error);
    }
  };

  return [view, setView] as const;
}

/**
 * Storage keys for different views
 */
export const VIEW_STORAGE_KEYS = {
  projects: 'donezy-projects-view',
  tasks: 'donezy-tasks-view-mode', // Existing key for backward compatibility
  projectDetails: 'donezy-project-details-view',
  clients: 'donezy-clients-view',
} as const;
