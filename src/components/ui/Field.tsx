"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

const CONTROL =
  "w-full rounded-xl bg-white px-3.5 py-2.5 text-ink-900 ring-1 ring-inset ring-ink-200 " +
  "placeholder:text-ink-400 transition-shadow " +
  "focus:ring-2 focus:ring-ml-red-500 focus:outline-none " +
  "disabled:bg-ink-50 disabled:text-ink-500";

const INVALID = "ring-ml-red-400 bg-ml-red-50/40";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: (props: { id: string; invalid: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const invalid = Boolean(error);

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-800">
        {label}
        {required ? (
          <span className="ml-1 text-ml-red-600" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-ink-400">
            optional
          </span>
        )}
      </label>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
      <div className="mt-1.5">{children({ id, invalid })}</div>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-ml-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  invalid,
  className = "",
  ...rest
}: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} ${invalid ? INVALID : ""} ${className}`}
    />
  );
}

export function Select({
  invalid,
  className = "",
  children,
  ...rest
}: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select
        {...rest}
        aria-invalid={invalid || undefined}
        className={`${CONTROL} appearance-none pr-10 ${invalid ? INVALID : ""} ${className}`}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m6 8 4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Textarea({
  invalid,
  className = "",
  ...rest
}: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      {...rest}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} resize-y ${invalid ? INVALID : ""} ${className}`}
    />
  );
}

/** Peso input: shows the symbol, accepts "485,000" or "485k". */
export function PesoInput({
  invalid,
  className = "",
  ...rest
}: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500">
        ₱
      </span>
      <input
        {...rest}
        inputMode="numeric"
        aria-invalid={invalid || undefined}
        className={`${CONTROL} nums pl-8 ${invalid ? INVALID : ""} ${className}`}
      />
    </div>
  );
}

/**
 * Large tappable yes/no. Radio semantics beat a switch here: a customer
 * answering "has this been flooded?" should see both answers, not infer the
 * second from the absence of the first.
 */
export function YesNo({
  name,
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "No",
  invert = false,
}: {
  name: string;
  value: boolean | null;
  onChange: (next: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
  /** True when "yes" is the unwanted answer, so it reads as a caution. */
  invert?: boolean;
}) {
  const options: Array<{ label: string; val: boolean }> = [
    { label: yesLabel, val: true },
    { label: noLabel, val: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const selected = value === opt.val;
        const caution = invert && opt.val;
        return (
          <button
            key={String(opt.val)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.val)}
            className={`rounded-xl px-4 py-3 text-sm font-semibold ring-1 ring-inset transition-colors ${
              selected
                ? caution
                  ? "bg-ml-red-50 text-ml-red-800 ring-ml-red-300"
                  : "bg-ink-900 text-white ring-ink-900"
                : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Card-sized radio for picking one of a handful of options. */
export function ChoiceGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
  label,
}: {
  options: Array<{ value: T; label: string; description?: string; icon?: ReactNode }>;
  value: T | null;
  onChange: (next: T) => void;
  columns?: 1 | 2 | 3 | 4;
  label: string;
}) {
  const cols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  }[columns];

  return (
    <div className={`grid ${cols} gap-2`} role="radiogroup" aria-label={label}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`rounded-xl px-3.5 py-3 text-left ring-1 ring-inset transition-all ${
              selected
                ? "bg-ml-red-50 ring-2 ring-ml-red-500"
                : "bg-white ring-ink-200 hover:bg-ink-50 hover:ring-ink-300"
            }`}
          >
            {opt.icon ? <div className="mb-1.5">{opt.icon}</div> : null}
            <span
              className={`block text-sm font-semibold ${
                selected ? "text-ml-red-800" : "text-ink-800"
              }`}
            >
              {opt.label}
            </span>
            {opt.description ? (
              <span className="mt-0.5 block text-xs leading-snug text-ink-500">
                {opt.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-ink-300 text-ml-red-600 accent-ml-red-600"
      />
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block text-sm font-medium text-ink-800">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-ink-500">{description}</span>
        ) : null}
      </label>
    </div>
  );
}
