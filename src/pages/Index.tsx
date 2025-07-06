
import React, { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is logged in, show dashboard content
  if (session) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome to donezy</h1>
          <p className="text-muted-foreground">Professional Time Tracking and Task Management Platform</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold mb-2">Quick Actions</h3>
            <p className="text-sm text-muted-foreground mb-4">Get started with these common tasks</p>
            <div className="space-y-2">
              <Button asChild className="w-full justify-start">
                <Link to="/projects">View Projects</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/tasks">Manage Tasks</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/time">Time Tracking</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold mb-2">Your Account</h3>
            <p className="text-sm text-muted-foreground mb-4">Manage your profile and preferences</p>
            <div className="space-y-2">
              <Button asChild className="w-full justify-start">
                <Link to="/settings">Profile Settings</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/notifications">Notifications</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold mb-2">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">No recent activity to show</p>
          </div>
        </div>
      </div>
    );
  }

  // If user is not logged in, show welcome screen with login option
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          <FileText className="h-16 w-16" />
          <h1 className="text-5xl font-bold">donezy</h1>
        </div>
        <p className="text-xl text-gray-600 mb-8">Professional Time Tracking and Task Management Platform</p>
        
        <div className="space-x-4">
          <Button asChild size="lg">
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
