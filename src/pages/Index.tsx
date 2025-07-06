
import React from "react";
import { FileText } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          <FileText className="h-16 w-16" />
          <h1 className="text-5xl font-bold">donezy</h1>
        </div>
        <p className="text-xl text-gray-600">Professional Time Tracking and Task Management Platform</p>
      </div>
    </div>
  );
};

export default Index;
