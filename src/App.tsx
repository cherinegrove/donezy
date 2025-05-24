
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useAppContext } from './contexts/AppContext';
import { Account } from './pages/Account';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import TimeTracking from './pages/TimeTracking';
import Team from './pages/Team';
import Messages from './pages/Messages';
import Clients from './pages/Clients';
import Reports from './pages/Reports';
import Notes from './pages/Notes';
import Admin from './pages/Admin';
import Users from './pages/Users';
import ProjectDetails from './pages/ProjectDetails';
import TaskDetails from './pages/TaskDetails';
import ClientDetails from './pages/ClientDetails';
import ProjectTemplates from './pages/ProjectTemplates';
import TemplateDetails from './pages/TemplateDetails';
import ClientAgreements from './pages/ClientAgreements';
import { AppSidebar } from './components/layout/AppSidebar';

function App() {
  const { setCurrentUser, setSession } = useAppContext();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the current user.
    async function getActiveSession() {
      const { data: { session } } = await supabase.auth.getSession()

      setSession(session)

      if (session) {
        const { data: { user } } = await supabase
          .from('users')
          .select()
          .eq('id', session?.user.id)
          .single()

        setCurrentUser(user)
      }

      setLoading(false)
    }

    getActiveSession()

    supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      
      if (session) {
        supabase
          .from('users')
          .select()
          .eq('id', session?.user.id)
          .single()
          .then(({ data: user }) => setCurrentUser(user))
      } else {
        setCurrentUser(null)
      }
    })
  }, [setCurrentUser, setSession])

  const { currentUser, session } = useAppContext();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google', 'github']}
        />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <AppSidebar />

          <div className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Projects />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:projectId" element={<ProjectDetails />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/tasks/:taskId" element={<TaskDetails />} />
              <Route path="/time-tracking" element={<TimeTracking />} />
              <Route path="/team" element={<Team />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:clientId" element={<ClientDetails />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/users" element={<Users />} />
              <Route path="/project-templates" element={<ProjectTemplates />} />
              <Route path="/project-templates/:templateId" element={<TemplateDetails />} />
              <Route path="/client-agreements" element={<ClientAgreements />} />
              <Route path="/account" element={<Account />} />
              
              <Route 
                path="/admin" 
                element={
                  currentUser?.permissions?.admin === 'admin' ? (
                    <Admin />
                  ) : (
                    <Navigate to="/" />
                  )
                } 
              />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
