import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
}

export function FormField({ label, name, errors, hint, className, ...rest }: Props) {
  const errorId = `${name}-error`;
  const hasError = Boolean(errors?.length);
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 ${
          hasError ? "border-red-400" : "border-border"
        } ${className ?? ""}`}
        {...rest}
      />
      {hint && !hasError && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {hasError && (
        <p id={errorId} className="mt-1 text-xs text-red-700 dark:text-red-300">
          {errors!.join(" ")}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ message, tone = "error" }: { message: string; tone?: "error" | "success" }) {
  const classes =
    tone === "error"
      ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
      : "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-md border px-4 py-3 text-sm ${classes}`}>
      {message}
    </p>
  );
}

export const primaryButton = "rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";
export const secondaryButton = "rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-background disabled:opacity-50";
