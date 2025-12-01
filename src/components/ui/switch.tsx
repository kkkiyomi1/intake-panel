import React from "react";
export const Switch: React.FC<{
  checked?: boolean;
  onCheckedChange?: (val: boolean) => void;
  disabled?: boolean;
}> = ({ checked = false, onCheckedChange, disabled = false }) => {
  return (
    <button
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? "bg-emerald-600" : "bg-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      aria-pressed={checked}
      type="button"
      disabled={disabled}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
};
