
import React from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { FileText } from "lucide-react";

export default function Login() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
      <div className="mb-8 flex items-center gap-2">
        <FileText className="h-10 w-10" />
        <h1 className="text-3xl font-bold">Manex</h1>
      </div>
      
      <div className="w-full max-w-md">
        <LoginForm />
        
        <p className="mt-6 text-center text-sm text-muted-foreground">
          If you've received an invitation but haven't set up your account yet, check your email for instructions.
        </p>
      </div>
      
      <div className="mt-12 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Manex. All rights reserved.</p>
        <p className="mt-1">For support, contact your system administrator.</p>
      </div>
    </div>
  );
}
