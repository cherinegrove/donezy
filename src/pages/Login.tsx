
import React from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

export default function Login() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
      <div className="mb-8 flex items-center gap-2">
        <FileText className="h-10 w-10" />
        <h1 className="text-3xl font-bold">TaskTimerHQ</h1>
      </div>
      
      <div className="w-full max-w-md">
        <LoginForm />
        
        <p className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Link to="/signup" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
      
      <div className="mt-12 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} TaskTimerHQ. All rights reserved.</p>
        <p className="mt-1">For support, contact your system administrator.</p>
      </div>
    </div>
  );
}
