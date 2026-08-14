/**
 * Knowledge Base Article Mapping
 * Maps app pages and features to their corresponding help articles
 */

export interface HelpArticle {
  title: string;
  url: string;
  description?: string;
  section?: string;
}

export const KNOWLEDGE_BASE_URL = 'https://docs.donezy.io'; // Update with your actual KB URL

export const helpArticleMap: Record<string, HelpArticle> = {
  // Getting Started
  'getting-started': {
    title: 'First Steps with Donezy',
    url: `${KNOWLEDGE_BASE_URL}/getting-started/01-first-steps`,
    description: 'Learn how to get started with Donezy',
    section: 'Getting Started'
  },
  'roles-permissions': {
    title: 'User Roles & Permissions',
    url: `${KNOWLEDGE_BASE_URL}/getting-started/02-roles-and-permissions`,
    description: 'Understand roles and permissions in Donezy',
    section: 'Getting Started'
  },
  'keyboard-shortcuts': {
    title: 'Keyboard Shortcuts',
    url: `${KNOWLEDGE_BASE_URL}/getting-started/03-keyboard-shortcuts`,
    description: 'Learn all keyboard shortcuts',
    section: 'Getting Started'
  },
  'mobile-app': {
    title: 'Mobile App Guide',
    url: `${KNOWLEDGE_BASE_URL}/getting-started/04-mobile-app`,
    description: 'Guide to using Donezy on mobile',
    section: 'Getting Started'
  },
  'chrome-extension': {
    title: 'Chrome Extension',
    url: `${KNOWLEDGE_BASE_URL}/getting-started/05-chrome-extension`,
    description: 'How to use the Chrome extension',
    section: 'Getting Started'
  },

  // Tasks
  'create-task': {
    title: 'Creating Tasks',
    url: `${KNOWLEDGE_BASE_URL}/tasks-projects/01-creating-tasks`,
    description: 'Learn how to create tasks',
    section: 'Tasks & Projects'
  },
  'task-management': {
    title: 'Task Management',
    url: `${KNOWLEDGE_BASE_URL}/tasks-projects/02-task-management`,
    description: 'Master task management',
    section: 'Tasks & Projects'
  },

  // Projects
  'create-project': {
    title: 'Creating Projects',
    url: `${KNOWLEDGE_BASE_URL}/tasks-projects/04-creating-projects`,
    description: 'Learn how to create projects',
    section: 'Tasks & Projects'
  },
  'project-management': {
    title: 'Project Management',
    url: `${KNOWLEDGE_BASE_URL}/tasks-projects/05-project-management`,
    description: 'Manage your projects',
    section: 'Tasks & Projects'
  },

  // Time Tracking
  'time-tracking': {
    title: 'Time Tracking Basics',
    url: `${KNOWLEDGE_BASE_URL}/time-tracking/01-time-tracking-basics`,
    description: 'Learn time tracking features',
    section: 'Time Tracking'
  },
  'start-timer': {
    title: 'Starting & Stopping Timers',
    url: `${KNOWLEDGE_BASE_URL}/time-tracking/02-starting-stopping-timers`,
    description: 'How to start and stop timers',
    section: 'Time Tracking'
  },
  'manual-time': {
    title: 'Manual Time Entries',
    url: `${KNOWLEDGE_BASE_URL}/time-tracking/03-manual-time-entries`,
    description: 'Add time entries manually',
    section: 'Time Tracking'
  },

  // Help
  'faq': {
    title: 'Frequently Asked Questions',
    url: `${KNOWLEDGE_BASE_URL}/help/01-faq`,
    description: 'Common questions answered',
    section: 'Help & Support'
  },
  'troubleshooting': {
    title: 'Troubleshooting',
    url: `${KNOWLEDGE_BASE_URL}/help/02-troubleshooting`,
    description: 'Fix common issues',
    section: 'Help & Support'
  },
  'best-practices': {
    title: 'Best Practices',
    url: `${KNOWLEDGE_BASE_URL}/help/03-best-practices`,
    description: 'Learn best practices',
    section: 'Help & Support'
  },
};

/**
 * Get help articles for a specific page/feature
 */
export function getHelpArticles(page: string): HelpArticle[] {
  const article = helpArticleMap[page];
  if (article) {
    return [article];
  }
  // Return general help if specific article not found
  return [helpArticleMap['faq'], helpArticleMap['getting-started']];
}

/**
 * Open help article in new tab
 */
export function openHelpArticle(articleKey: string): void {
  const article = helpArticleMap[articleKey];
  if (article) {
    window.open(article.url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Get all help articles
 */
export function getAllHelpArticles(): HelpArticle[] {
  return Object.values(helpArticleMap);
}

/**
 * Get articles by section
 */
export function getArticlesBySection(section: string): HelpArticle[] {
  return Object.values(helpArticleMap).filter(a => a.section === section);
}

/**
 * Get all sections
 */
export function getAllSections(): string[] {
  const sections = new Set<string>();
  Object.values(helpArticleMap).forEach(article => {
    if (article.section) {
      sections.add(article.section);
    }
  });
  return Array.from(sections).sort();
}
