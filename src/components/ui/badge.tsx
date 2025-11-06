import React from "react";
export const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" | "destructive" }>
= ({ className = "", variant = "default", ...props }) => {
  const v = variant === "secondary"
    ? "bg-gray-200 text-gray-900"
    : variant === "destructive"
    ? "bg-rose-600 text-white"
    : "bg-sky-600 text-white";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${v} ${className}`} {...props} />;
};
