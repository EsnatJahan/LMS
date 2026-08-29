"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext({
  showToast: (message, type = "info") => {},
  toast: {
    success: (msg) => {},
    error: (msg) => {},
    info: (msg) => {},
  },
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const toast = {
    success: (msg) => showToast(msg, "success"),
    error: (msg) => showToast(msg, "error"),
    info: (msg) => showToast(msg, "info"),
  };

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-top-3 ${
                isSuccess
                  ? "bg-emerald-950/90 text-emerald-100 border-emerald-700/60 shadow-emerald-950/40"
                  : isError
                  ? "bg-rose-950/90 text-rose-100 border-rose-700/60 shadow-rose-950/40"
                  : "bg-gray-900/90 text-gray-100 border-gray-700/60 shadow-gray-950/40"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg font-bold">
                  {isSuccess ? "✅" : isError ? "⚠️" : "ℹ️"}
                </span>
                <p className="text-sm font-medium leading-snug">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-gray-400 hover:text-white transition text-xs font-bold px-1"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

