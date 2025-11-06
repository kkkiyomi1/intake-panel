import React from "react";

type Variant = "default" | "outline" | "destructive" | "ghost";
type Size = "default" | "sm" | "icon";

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
> = ({ className = "", variant = "default", size = "default", ...props }) => {
  const v =
    variant === "outline"
      ? "border border-gray-300 bg-white hover:bg-gray-50 text-gray-900"
      : variant === "destructive"
      ? "bg-rose-600 hover:bg-rose-700 text-white"
      : variant === "ghost"
      ? "bg-transparent hover:bg-gray-100 text-gray-900"
      : "bg-sky-600 hover:bg-sky-700 text-white";

  const s =
    size === "sm"
      ? "text-sm h-8 px-3"
      : size === "icon"
      ? "h-9 w-9 p-0 flex items-center justify-center"
      : "h-10 px-4";

  return (
    <button
      className={`rounded-2xl font-medium transition-colors ${v} ${s} ${className}`}
      {...props}
    />
  );
};
