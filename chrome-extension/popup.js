// Supabase configuration
const SUPABASE_URL = 'https://puwxkygdlclcbyxrtppd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d3hreWdkbGNsY2J5eHJ0cHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMDU2OTUsImV4cCI6MjA2MTY4MTY5NX0._p3ZxKJSSzOkZO6xml4kvg9vOA64Qlxhg5HNhuEAF-0';

// Completed/closed task statuses to filter out
const COMPLETED_STATUSES = ['done', 'completed', 'closed', 'cancelled'];

let currentSession = null;
let timerInterval = null;
let timerStartTime = null;
let currentTimeEntry = null;
let projectsCache = [];
let usersCache = [];
let selectedTaskId = null;

// DOM elements
const loginSection = document.getElementById('loginSection');
const mainSection = document.getElementById('mainSection');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const timerDisplay = document.getElementById('timerDisplay');
const timerInfo = document.getElementById('timerInfo');
const timerButton = document.getElementById('timerButton');
const timerProject = document.getElementById('timerProject');
const taskListContainer = document.getElementById('taskListContainer');
const taskList = document.getElementById('taskList');
const taskTitle = document.getElementById('taskTitle');
const taskDescription = document.getElementById('taskDescription');
const taskProject = document.getElementById('taskProject');
const taskStatus = document.getElementById('taskStatus');
const taskAssignee = document.getElementById('taskAssignee');
const taskDueDate = document.getElementById('taskDueDate');
const createTaskButton = document.getElementById('createTaskButton');
const noteTitle = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const noteProject = document.getElementById('noteProject');
const createNoteButton = document.getElementById('createNoteButton');
const statusToast = document.getElementById('statusToast');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthState();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  loginButton.addEventListener('click', handleLogin);
  logoutButton.addEventListener('click', handleLogout);
  timerButton.addEventListener('click', handleTimerToggle);
  createTaskButton.addEventListener('click', handleCreateTask);
  createNoteButton.addEventListener('click', handleCreateNote);
  timerProject.addEventListener('change', handleProjectChange);
  
  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}Tab`).classList.add('active');
    });
  });
  
  // Enter key for login
  loginPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  loginEmail.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginPassword.focus();
  });
}

// Authentication functions
async function checkAuthState() {
  try {
    const result = await chrome.storage.local.get(['supabase_session']);
    if (result.supabase_session) {
      currentSession = result.supabase_session;
      showMainSection();
      await loadProjects();
      await loadUsers();
      await checkActiveTimer();
    } else {
      showLoginSection();
    }
  } catch (error) {
    console.error('Error checking auth state:', error);
    showLoginSection();
  }
}

async function handleLogin() {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();
  
  if (!email || !password) {
    showToast('Please enter email and password', 'error');
    return;
  }
  
  loginButton.disabled = true;
  loginButton.textContent = 'Signing in...';
  
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.access_token) {
      currentSession = {
        access_token: data.access_token,
        user: data.user,
      };
      
      await chrome.storage.local.set({ supabase_session: currentSession });
      showMainSection();
      await loadProjects();
      await loadUsers();
      await checkActiveTimer();
      showToast('Welcome back!', 'success');
    } else {
      showToast(data.error_description || 'Login failed', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('Login failed. Please try again.', 'error');
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Sign In';
  }
}

async function handleLogout() {
  try {
    await chrome.storage.local.remove(['supabase_session']);
    currentSession = null;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    showLoginSection();
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// UI functions
function showLoginSection() {
  loginSection.classList.remove('hidden');
  mainSection.classList.add('hidden');
}

function showMainSection() {
  loginSection.classList.add('hidden');
  mainSection.classList.remove('hidden');
}

function showToast(message, type) {
  statusToast.textContent = message;
  statusToast.className = `status-toast ${type} show`;
  setTimeout(() => {
    statusToast.classList.remove('show');
  }, 3000);
}

// Project change handler - load tasks for selected project
async function handleProjectChange() {
  const projectId = timerProject.value;
  selectedTaskId = null;
  
  if (!projectId) {
    taskListContainer.classList.add('hidden');
    timerButton.disabled = true;
    return;
  }
  
  timerButton.disabled = false;
  taskListContainer.classList.remove('hidden');
  taskList.innerHTML = '<div class="empty-state">Loading tasks...</div>';
  
  try {
    // Fetch tasks for the project that are NOT completed/closed
    const statusFilter = COMPLETED_STATUSES.map(s => `status.neq.${s}`).join('&');
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks?project_id=eq.${projectId}&${statusFilter}&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      }
    );
    
    if (response.ok) {
      const tasks = await response.json();
      renderTaskList(tasks);
    } else {
      taskList.innerHTML = '<div class="empty-state">Failed to load tasks</div>';
    }
  } catch (error) {
    console.error('Error loading tasks:', error);
    taskList.innerHTML = '<div class="empty-state">Failed to load tasks</div>';
  }
}

function renderTaskList(tasks) {
  if (tasks.length === 0) {
    taskList.innerHTML = '<div class="empty-state">No active tasks in this project</div>';
    return;
  }
  
  taskList.innerHTML = tasks.map(task => `
    <div class="task-item" data-task-id="${task.id}">
      <div class="task-radio"></div>
      <div class="task-title">${escapeHtml(task.title)}</div>
      <span class="priority-badge priority-${task.priority || 'medium'}">${task.priority || 'medium'}</span>
    </div>
  `).join('');
  
  // Add click handlers
  taskList.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', () => {
      taskList.querySelectorAll('.task-item').forEach(i => i.classList.remove('selected'));
      
      if (selectedTaskId === item.dataset.taskId) {
        selectedTaskId = null;
      } else {
        item.classList.add('selected');
        selectedTaskId = item.dataset.taskId;
      }
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Timer functions
async function handleTimerToggle() {
  if (timerInterval) {
    await stopTimer();
  } else {
    await startTimer();
  }
}

async function startTimer() {
  const projectId = timerProject.value;
  
  if (!projectId) {
    showToast('Please select a project', 'error');
    return;
  }
  
  // TIMER RULE: Only one timer can run at a time
  // Stop any existing active timer before starting a new one
  try {
    const existingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/time_entries?auth_user_id=eq.${currentSession.user.id}&end_time=is.null`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      }
    );
    
    if (existingResponse.ok) {
      const existingTimers = await existingResponse.json();
      // Stop all existing active timers
      for (const timer of existingTimers) {
        const endTime = new Date();
        const duration = Math.floor((endTime - new Date(timer.start_time)) / 1000 / 60);
        await fetch(`${SUPABASE_URL}/rest/v1/time_entries?id=eq.${timer.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify({
            end_time: endTime.toISOString(),
            duration: duration,
          }),
        });
      }
    }
  } catch (error) {
    console.error('Error stopping existing timers:', error);
  }
  
  // Find client_id from project
  const project = projectsCache.find(p => p.id === projectId);
  const clientId = project?.client_id || null;
  
  timerStartTime = new Date();
  
  try {
    const timeEntry = {
      user_id: currentSession.user.id,
      auth_user_id: currentSession.user.id,
      start_time: timerStartTime.toISOString(),
      project_id: projectId,
      task_id: selectedTaskId,
      client_id: clientId,
      status: 'pending',
    };
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/time_entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(timeEntry),
    });
    
    if (response.ok) {
      const data = await response.json();
      currentTimeEntry = data[0];
      
      timerInterval = setInterval(updateTimerDisplay, 1000);
      timerButton.textContent = 'Stop Timer';
      timerButton.classList.add('button-stop');
      timerProject.disabled = true;
      
      const taskName = selectedTaskId 
        ? taskList.querySelector(`[data-task-id="${selectedTaskId}"] .task-title`)?.textContent 
        : null;
      timerInfo.textContent = taskName ? `Tracking: ${taskName}` : `Tracking: ${project?.name || 'Project'}`;
      timerInfo.classList.add('active');
      
      showToast('Timer started!', 'success');
    } else {
      throw new Error('Failed to create time entry');
    }
  } catch (error) {
    console.error('Error starting timer:', error);
    showToast('Failed to start timer', 'error');
  }
}

async function stopTimer() {
  if (!currentTimeEntry) return;
  
  const endTime = new Date();
  const duration = Math.floor((endTime - timerStartTime) / 1000 / 60);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/time_entries?id=eq.${currentTimeEntry.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${currentSession.access_token}`,
      },
      body: JSON.stringify({
        end_time: endTime.toISOString(),
        duration: duration,
      }),
    });
    
    if (response.ok) {
      clearInterval(timerInterval);
      timerInterval = null;
      currentTimeEntry = null;
      timerStartTime = null;
      
      timerButton.textContent = 'Start Timer';
      timerButton.classList.remove('button-stop');
      timerProject.disabled = false;
      timerDisplay.textContent = '00:00:00';
      timerInfo.textContent = 'No timer running';
      timerInfo.classList.remove('active');
      
      const hours = Math.floor(duration / 60);
      const mins = duration % 60;
      showToast(`Timer stopped! ${hours}h ${mins}m logged`, 'success');
    } else {
      throw new Error('Failed to update time entry');
    }
  } catch (error) {
    console.error('Error stopping timer:', error);
    showToast('Failed to stop timer', 'error');
  }
}

function updateTimerDisplay() {
  if (!timerStartTime) return;
  
  const now = new Date();
  const elapsed = now - timerStartTime;
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
  
  timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function checkActiveTimer() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/time_entries?auth_user_id=eq.${currentSession.user.id}&end_time=is.null&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        currentTimeEntry = data[0];
        timerStartTime = new Date(currentTimeEntry.start_time);
        timerInterval = setInterval(updateTimerDisplay, 1000);
        timerButton.textContent = 'Stop Timer';
        timerButton.classList.add('button-stop');
        timerButton.disabled = false;
        timerProject.disabled = true;
        
        // Set the project dropdown
        if (currentTimeEntry.project_id) {
          timerProject.value = currentTimeEntry.project_id;
        }
        
        const project = projectsCache.find(p => p.id === currentTimeEntry.project_id);
        timerInfo.textContent = `Tracking: ${project?.name || 'Project'}`;
        timerInfo.classList.add('active');
        
        updateTimerDisplay();
      }
    }
  } catch (error) {
    console.error('Error checking active timer:', error);
  }
}

// Task functions
async function handleCreateTask() {
  const title = taskTitle.value.trim();
  const description = taskDescription.value.trim();
  const projectId = taskProject.value || null;
  const status = taskStatus.value || 'backlog';
  const assigneeId = taskAssignee.value || currentSession.user.id;
  const dueDate = taskDueDate.value || null;
  
  if (!title) {
    showToast('Please enter a task title', 'error');
    return;
  }
  
  if (!projectId) {
    showToast('Please select a project', 'error');
    return;
  }
  
  createTaskButton.disabled = true;
  createTaskButton.textContent = 'Creating...';
  
  try {
    const task = {
      title,
      description,
      auth_user_id: currentSession.user.id,
      assignee_id: assigneeId,
      project_id: projectId,
      priority: 'medium',
      status: status,
      due_date: dueDate,
      created_at: new Date().toISOString(),
    };
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${currentSession.access_token}`,
      },
      body: JSON.stringify(task),
    });
    
    if (response.ok) {
      taskTitle.value = '';
      taskDescription.value = '';
      taskStatus.value = 'backlog';
      taskAssignee.value = '';
      taskDueDate.value = '';
      showToast('Task created!', 'success');
    } else {
      throw new Error('Failed to create task');
    }
  } catch (error) {
    console.error('Error creating task:', error);
    showToast('Failed to create task', 'error');
  } finally {
    createTaskButton.disabled = false;
    createTaskButton.textContent = 'Create Task';
  }
}

async function loadProjects() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?select=id,name,client_id&order=name.asc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      }
    );
    
    if (response.ok) {
      projectsCache = await response.json();
      
      // Update all project dropdowns
      const optionsHtml = '<option value="">Select project</option>' + 
        projectsCache.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
      
      timerProject.innerHTML = optionsHtml;
      taskProject.innerHTML = optionsHtml;
      noteProject.innerHTML = optionsHtml;
    }
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

async function loadUsers() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/users?select=auth_user_id,name,email&order=name.asc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      }
    );
    
    if (response.ok) {
      usersCache = await response.json();
      
      // Update assignee dropdown
      const optionsHtml = '<option value="">Select owner (optional)</option>' + 
        usersCache.map(u => `<option value="${u.auth_user_id}">${escapeHtml(u.name || u.email)}</option>`).join('');
      
      taskAssignee.innerHTML = optionsHtml;
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// Note functions
async function handleCreateNote() {
  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();
  const projectId = noteProject.value || null;
  
  if (!title) {
    showToast('Please enter a note title', 'error');
    return;
  }
  
  if (!projectId) {
    showToast('Please select a project', 'error');
    return;
  }
  
  createNoteButton.disabled = true;
  createNoteButton.textContent = 'Saving...';
  
  try {
    const note = {
      title,
      content,
      project_id: projectId,
      tags: [],
    };
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/project_notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${currentSession.access_token}`,
      },
      body: JSON.stringify(note),
    });
    
    if (response.ok) {
      noteTitle.value = '';
      noteContent.value = '';
      showToast('Note saved!', 'success');
    } else {
      throw new Error('Failed to save note');
    }
  } catch (error) {
    console.error('Error saving note:', error);
    showToast('Failed to save note', 'error');
  } finally {
    createNoteButton.disabled = false;
    createNoteButton.textContent = 'Save Note';
  }
}
