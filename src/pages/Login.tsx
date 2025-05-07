
import React from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { FileText } from "lucide-react";

export default function Login() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-2">
        <FileText className="h-8 w-8" />
        <h1 className="text-2xl font-bold">Manex</h1>
      </div>
      <LoginForm />
    </div>
  );
}
