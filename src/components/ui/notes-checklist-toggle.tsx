import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type NotesChecklistToggleProps = {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label": string;
};

/** Círculo estilo checklist do app Notas (iOS): vazio → preenchido com check ao concluir. */
export function NotesChecklistToggle({ checked, disabled, onCheckedChange, "aria-label": ariaLabel }: NotesChecklistToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onCheckedChange(!checked);
      }}
      className={cn(
        "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled && "cursor-not-allowed opacity-50",
        checked
          ? "border-amber-400 bg-amber-400 text-neutral-900 dark:text-neutral-950"
          : "border-muted-foreground/50 bg-transparent hover:border-muted-foreground/70",
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
    </button>
  );
}
