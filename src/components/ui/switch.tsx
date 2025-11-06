import React from "react";
export const Switch: React.FC<{ checked?: boolean; onCheckedChange?: (val: boolean) => void }> = ({
  checked = false,
  onCheckedChange,
}) => {
  return (
    <button
      onClick={() => onCheckedChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-emerald-600" : "bg-gray-300"
      }`}
      aria-pressed={checked}
      type="button"
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
};
