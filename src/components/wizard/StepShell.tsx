import type { ReactNode } from "react";
import type { Draft } from "@/lib/wizard";

export type StepProps = {
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  /**
   * Several fields as one change — one undo step, one save, one render.
   * For anything the customer experiences as a single action: choosing a
   * model, which also settles body type and fuel; or reading four fields off
   * a photographed ID.
   */
  setMany: (values: Partial<Draft>) => void;
  errors: Record<string, string>;
};

export function StepHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-7">
      <h1 className="text-2xl font-extrabold text-ink-950 sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-600">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white p-5 ring-1 ring-ink-200/70 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-500">
      {children}
    </h2>
  );
}
