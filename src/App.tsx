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
import { User } from '@/types';

function App() {
  const { setCurrentUser, setSession } = useAppContext();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the current user.
    async function getActiveSession() {
      const { data: { session } } = await supabase.auth.getSession()

      setSession(session)

      if (session?.user) {
        // Query the profiles table instead of users table
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileData && !error) {
          // Create a User object from the profile data and session user
          const user: User = {
            id: profileData.id,
            name: profileData.display_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            avatar: profileData.avatar_url,
            role: 'admin',
            teamIds: [],
            permissions: {
              projects: 'admin',
              clients: 'admin',
              reports: 'admin',
              templates: 'admin',
              admin: 'admin',
              timeTracking: 'admin',
              tasks: 'admin',
              users: 'admin',
              teams: 'admin',
              billing: 'admin'
            }
          };
          setCurrentUser(user);
        } else {
          // If no profile exists, create a basic user from session data
          const user: User = {
            id: session.user.id,
            name: session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            role: 'admin',
            teamIds: [],
            permissions: {
              projects: 'admin',
              clients: 'admin',
              reports: 'admin',
              templates: 'admin',
              admin: 'admin',
              timeTracking: 'admin',
              tasks: 'admin',
              users: 'admin',
              teams: 'admin',
              billing: 'admin'
            }
          };
          setCurrentUser(user);
        }
      }

      setLoading(false)
    }

    getActiveSession()

    supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      
      if (session?.user) {
        // Query the profiles table instead of users table
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileData && !error) {
          // Create a User object from the profile data and session user
          const user: User = {
            id: profileData.id,
            name: profileData.display_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            avatar: profileData.avatar_url,
            role: 'admin',
            teamIds: [],
            permissions: {
              projects: 'admin',
              clients: 'admin',
              reports: 'admin',
              templates: 'admin',
              admin: 'admin',
              timeTracking: 'admin',
              tasks: 'admin',
              users: 'admin',
              teams: 'admin',
              billing: 'admin'
            }
          };
          setCurrentUser(user);
        } else {
          // If no profile exists, create a basic user from session data
          const user: User = {
            id: session.user.id,
            name: session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            role: 'admin',
            teamIds: [],
            permissions: {
              projects: 'admin',
              clients: 'admin',
              reports: 'admin',
              templates: 'admin',
              admin: 'admin',
              timeTracking: 'admin',
              tasks: 'admin',
              users: 'admin',
              teams: 'admin',
              billing: 'admin'
            }
          };
          setCurrentUser(user);
        }
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
