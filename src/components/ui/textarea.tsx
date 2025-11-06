import React from "react";
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full rounded-xl border border-gray-300 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-sky-300 ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
