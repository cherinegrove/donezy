// Supabase configuration
const SUPABASE_URL = 'https://puwxkygdlclcbyxrtppd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d3hreWdkbGNsY2J5eHJ0cHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMDU2OTUsImV4cCI6MjA2MTY4MTY5NX0._p3ZxKJSSzOkZO6xml4kvg9vOA64Qlxhg5HNhuEAF-0';

let currentSession = null;
let timerInterval = null;
let timerStartTime = null;
let currentTimeEntry = null;

// DOM elements
const loginSection = document.getElementById('loginSection');
const mainSection = document.getElementById('mainSection');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginStatus = document.getElementById('loginStatus');
const timerDisplay = document.getElementById('timerDisplay');
const timerButton = document.getElementById('timerButton');
const taskTitle = document.getElementById('taskTitle');
const taskDescription = document.getElementById('taskDescription');
const taskProject = document.getElementById('taskProject');
const taskPriority = document.getElementById('taskPriority');
const createTaskButton = document.getElementById('createTaskButton');
const status = document.getElementById('status');

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
  
  // Auto-fill task title from current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].title) {
      taskTitle.placeholder = `Task from: ${tabs[0].title.substring(0, 30)}...`;
    }
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
    showLoginStatus('Please enter email and password', 'error');
    return;
  }
  
  loginButton.disabled = true;
  loginButton.textContent = 'Logging in...';
  
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email,
        password,
      }),
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
      showLoginStatus('Login successful!', 'success');
    } else {
      showLoginStatus(data.error_description || 'Login failed', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showLoginStatus('Login failed. Please try again.', 'error');
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Login';
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

function showLoginStatus(message, type) {
  loginStatus.textContent = message;
  loginStatus.className = `status ${type}`;
  loginStatus.classList.remove('hidden');
  setTimeout(() => {
    loginStatus.classList.add('hidden');
  }, 3000);
}

function showStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
  status.classList.remove('hidden');
  setTimeout(() => {
    status.classList.add('hidden');
  }, 3000);
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
  timerStartTime = new Date();
  
  // Create time entry in database
  try {
    const timeEntry = {
      user_id: currentSession.user.id,
      auth_user_id: currentSession.user.id,
      start_time: timerStartTime.toISOString(),
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
      timerButton.style.background = 'hsl(0 84.2% 60.2%)';
      
      showStatus('Timer started!', 'success');
    } else {
      throw new Error('Failed to create time entry');
    }
  } catch (error) {
    console.error('Error starting timer:', error);
    showStatus('Failed to start timer', 'error');
  }
}

async function stopTimer() {
  if (!currentTimeEntry) return;
  
  const endTime = new Date();
  const duration = Math.floor((endTime - timerStartTime) / 1000 / 60); // Duration in minutes
  
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
      timerButton.style.background = '';
      timerDisplay.textContent = '00:00:00';
      
      showStatus(`Timer stopped! Duration: ${Math.floor(duration / 60)}h ${duration % 60}m`, 'success');
    } else {
      throw new Error('Failed to update time entry');
    }
  } catch (error) {
    console.error('Error stopping timer:', error);
    showStatus('Failed to stop timer', 'error');
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
  // Check if there's an active timer (time entry without end_time)
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/time_entries?auth_user_id=eq.${currentSession.user.id}&end_time=is.null&order=created_at.desc&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${currentSession.access_token}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        currentTimeEntry = data[0];
        timerStartTime = new Date(currentTimeEntry.start_time);
        timerInterval = setInterval(updateTimerDisplay, 1000);
        timerButton.textContent = 'Stop Timer';
        timerButton.style.background = 'hsl(0 84.2% 60.2%)';
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
  const priority = taskPriority.value;
  
  if (!title) {
    showStatus('Please enter a task title', 'error');
    return;
  }
  
  createTaskButton.disabled = true;
  createTaskButton.textContent = 'Creating...';
  
  try {
    const task = {
      title,
      description,
      auth_user_id: currentSession.user.id,
      assignee_id: currentSession.user.id,
      project_id: projectId,
      priority,
      status: 'backlog',
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
      taskProject.value = '';
      taskPriority.value = 'medium';
      
      showStatus('Task created successfully!', 'success');
    } else {
      throw new Error('Failed to create task');
    }
  } catch (error) {
    console.error('Error creating task:', error);
    showStatus('Failed to create task', 'error');
  } finally {
    createTaskButton.disabled = false;
    createTaskButton.textContent = 'Create Task';
  }
}

async function loadProjects() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=id,name&order=name.asc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${currentSession.access_token}`,
      },
    });
    
    if (response.ok) {
      const projects = await response.json();
      
      // Clear existing options except the first one
      taskProject.innerHTML = '<option value="">Select project (optional)</option>';
      
      projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        taskProject.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}