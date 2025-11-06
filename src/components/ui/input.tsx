import React from "react";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-sky-300 ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";
