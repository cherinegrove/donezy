# 🧪 Local Testing Guide - AI Assistant

## Setup Steps

### 1. **Disable Email Verification in Supabase** (1 min)
- Go to: https://supabase.com/dashboard
- Select project: `puwxkygdlclcbyxrtppd`
- Settings → Authentication → Email
- Toggle **OFF**: "Confirm email"
- Save changes

### 2. **Restart Dev Server**
```bash
# In project directory
npm run dev
# Server will be at http://localhost:8080
```

### 3. **Create Test Account**
- Navigate to http://localhost:8080
- Click "Sign up"
- Fill form:
  - **Name**: Test User
  - **Email**: test@local.com
  - **Password**: TestLocal123!
- Click Sign Up
- You'll be logged in immediately ✅

### 4. **Create Sample Project & Tasks**

Once logged in, create test data:

#### **Via UI (Recommended for Testing)**
1. Click **"Projects"** in sidebar
2. Click **"+"** button → Create Project
3. Fill in:
   - **Name**: Sample Marketing Campaign
   - **Description**: Test project for AI Assistant
   - **Status**: In Progress
4. Click Create

#### **Create Tasks for the Project**
1. Click the project to open it
2. Click **"Create Task"** or use the **"+"** button
3. Create these tasks:

**Task 1: Design Landing Page**
- Status: In Progress
- Priority: High
- Assigned to: Test User
- Due date: 3 days from now
- Estimated hours: 16

**Task 2: Setup Auth System**
- Status: Blocked
- Priority: High
- Assigned to: Test User
- Due date: 2 days from now
- Estimated hours: 20
- Comment: "Waiting on API keys from client"

**Task 3: Create User Dashboard**
- Status: In Progress
- Priority: Medium
- Assigned to: Test User
- Due date: 5 days from now
- Estimated hours: 24
- Comment: "60% complete, design approved"

**Task 4: Setup Database**
- Status: Done
- Priority: High
- Assigned to: Test User
- Completed 1 day ago

**Task 5: Email Notifications**
- Status: Todo
- Priority: Low
- Assigned to: Test User
- Due date: 10 days from now
- Estimated hours: 8

---

## 🎯 Testing the AI Assistant

### **Step 1: Navigate to AI Assistant**
- Click the **Sparkles icon** (✨) in top bar
- Or click **"AI Assistant"** in sidebar

### **Step 2: Generate Project Roundup**
1. Click **"Roundup"** button (blue chart icon)
2. Click project dropdown → Select "Sample Marketing Campaign"
3. Click **"Get Roundup"** button
4. See the roundup panel with:
   - ✅ Stats bar (Completed, In Progress, Blocked, At Risk)
   - 📊 Completion percentage
   - 🎯 Task breakdown

### **Step 3: Ask Follow-Up Questions**
In the chat, ask questions about the roundup:

**Question: "What's blocked?"**
- AI will show: Setup Auth System task with "Waiting on API keys from client" comment

**Question: "What tasks are at risk?"**
- AI will analyze tasks and show which are overdue or stale

**Question: "Show in-progress tasks"**
- AI will list: Design Landing Page (In Progress)

**Question: "What's the status on the auth system?"**
- AI will provide: Full task details with comments

**Question: "When will we finish?"**
- AI will forecast based on velocity

### **Step 4: Copy Email for Client**
1. In roundup panel, click **"Copy Email"**
2. Paste into Gmail/Outlook
3. See professional HTML email with:
   - Tasks completed this week
   - New tasks
   - Currently active tasks
   - Awaiting feedback (with comments)

### **Step 5: Test Import Feature**
1. Create a test file (PDF, Excel, or Word)
2. Add content like:
   ```
   - Design homepage
   - Build contact form
   - Setup SSL certificate
   - Test on mobile devices
   ```
3. Click **"Import"** button (upload icon)
4. Select your file
5. Select "Sample Marketing Campaign" project
6. AI extracts and creates tasks automatically ✅

---

## 📝 Expected Behavior

### **Roundup Should Show:**
- **Completed**: 1 (Setup Database)
- **In Progress**: 2 (Design Landing Page, Create User Dashboard)
- **Blocked**: 1 (Setup Auth System)
- **At Risk**: 1 (Setup Auth System - overdue)
- **Completion**: ~33%
- **Health Status**: 🟡 Needs Attention

### **Follow-Up Questions Should Return:**
- Specific task details
- Latest comments from team
- Risk analysis
- Status breakdowns
- Completion forecasts

### **Email Copy Should Include:**
- ✅ Tasks Completed This Week
- 📋 New Tasks
- ⏳ Currently Active (with % complete)
- ⏸️ Awaiting Feedback (with latest comments)

---

## 🔧 Troubleshooting

### **Email Verification Still Required?**
- Confirm you disabled it in Supabase
- Refresh browser completely (Ctrl+Shift+R)
- Clear localStorage: F12 → Application → Clear All

### **No Projects Showing?**
- Make sure you created a project via the UI
- Check Projects page to verify it exists
- Refresh the browser

### **Tasks Not Appearing in Roundup?**
- Make sure tasks are assigned to the correct project
- Refresh browser
- Try creating a new task and wait 2 seconds

### **AI Not Responding to Questions?**
- Check browser console (F12) for errors
- Make sure you're still logged in
- Try a simpler question first

---

## ✨ Features to Test

- [x] Quick Actions Bar (6 buttons)
- [x] Project Selector dropdown
- [x] Task Status Filters
- [x] Roundup Stats Bar
- [x] Follow-up Questions (5+ types)
- [x] Email Copy (HTML formatted)
- [x] Import Tasks from File
- [x] Decision Logging
- [x] Workload Analysis
- [x] Bottleneck Detection
- [x] Risk Analysis
- [x] Task Recommendations
- [x] Completion Forecasting

---

## 📊 Sample Data Cheat Sheet

If you want to create different scenarios:

**For "All On Track" Scenario:**
- All tasks: In Progress or Done
- No overdue tasks
- No blocked tasks
- 70%+ completion

**For "High Risk" Scenario:**
- Multiple blocked tasks
- Overdue items
- High "at risk" count
- Low completion %
- Many comments about delays

**For "Team Capacity" Test:**
- Create 10+ tasks
- Assign to 3+ team members
- Vary estimated hours
- Test "Who has bandwidth?" question

---

## 🚀 Ready for Production?

After local testing:
1. Review all AI Assistant features
2. Test with your actual project data
3. Verify email copy formatting
4. Check performance with large datasets
5. Get team feedback
6. Then deploy to production!

---

**Happy Testing! 🎉**
