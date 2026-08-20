"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/** Wrapper that gives every control a label, hint and error slot. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
          {required && <span className="ml-0.5 text-ck-red">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-ck-red">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  required,
  type = "text",
  placeholder,
  id,
  className,
  disabled,
  min,
  max,
  step,
}: {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  type?: "text" | "email" | "tel" | "number" | "date" | "time" | "datetime-local" | "password" | "url";
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number;
}) {
  const fieldId = id ?? `f_${label?.toLowerCase().replace(/\W+/g, "-") ?? "input"}`;
  return (
    <Field label={label} htmlFor={fieldId} hint={hint} error={error} required={required} className={className}>
      <Input
        id={fieldId}
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className="h-9"
      />
    </Field>
  );
}

export function TextareaField({
  label,
  value,
  onChange,
  hint,
  error,
  required,
  placeholder,
  rows = 4,
  id,
  className,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  id?: string;
  className?: string;
}) {
  const fieldId = id ?? `t_${label?.toLowerCase().replace(/\W+/g, "-") ?? "textarea"}`;
  return (
    <Field label={label} htmlFor={fieldId} hint={hint} error={error} required={required} className={className}>
      <Textarea
        id={fieldId}
        value={value}
        rows={rows}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
    </Field>
  );
}

/**
 * Native `<select>` on purpose: it is keyboard/mobile-native, needs no portal,
 * and survives being rendered inside dialogs and tables without z-index games.
 */
export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  error,
  required,
  placeholder,
  id,
  className,
  disabled,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}) {
  const fieldId = id ?? `s_${label?.toLowerCase().replace(/\W+/g, "-") ?? "select"}`;
  return (
    <Field label={label} htmlFor={fieldId} hint={hint} error={error} required={required} className={className}>
      <select
        id={fieldId}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={cn(
          "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
          !value && placeholder && "text-muted-foreground",
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SwitchField({
  label,
  description,
  checked,
  onChange,
  disabled,
  className,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 rounded-xl border p-3", className)}>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2 text-sm", className)}>
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(!!c)} />
      {label}
    </label>
  );
}

/** Comma-separated text ⇄ string[] — used for allergies, tags, materials. */
export function ListField({
  label,
  values,
  onChange,
  hint = "Separate with commas",
  placeholder,
  className,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  hint?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <TextField
      label={label}
      hint={hint}
      placeholder={placeholder}
      value={values.join(", ")}
      onChange={(v) =>
        onChange(
          v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        )
      }
      className={className}
    />
  );
}
