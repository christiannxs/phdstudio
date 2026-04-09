import { useState, useEffect } from "react";

type PhaseLabelInputProps = {
  demandId: string;
  value: string;
  disabled: boolean;
  saving: boolean;
  onCommit: (v: string) => void;
  className?: string;
};

export function PhaseLabelInput({ demandId, value, disabled, saving, onCommit, className }: PhaseLabelInputProps) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value, demandId]);

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local.trim() !== value.trim()) onCommit(local);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      onClick={(e) => e.stopPropagation()}
      disabled={disabled || saving}
      placeholder="Nome da etapa"
      maxLength={120}
      className={
        className ??
        "min-w-0 flex-1 border-0 border-b border-transparent bg-transparent px-0.5 py-0.5 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
      }
    />
  );
}
