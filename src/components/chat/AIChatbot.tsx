import { useState } from "react";

export function AIChatbot() {
  console.log("🤖 AIChatbot component loaded!");
  
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "#8B5CF6",
          color: "white",
          fontSize: "24px",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        💬
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "384px",
        height: "500px",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        zIndex: 9999,
        padding: "24px",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3 style={{ fontWeight: "bold", fontSize: "18px", color: "#000" }}>AI Chatbot</h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            color: "#666"
          }}
        >
          ×
        </button>
      </div>
      <div>
        <p style={{ color: "#000" }}>✅ The chatbot is working!</p>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
          Now we can add AI features.
        </p>
      </div>
    </div>
  );
}
