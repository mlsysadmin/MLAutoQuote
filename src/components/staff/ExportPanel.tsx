"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, Field, Input, Select } from "@/components/ui";

const DATASETS = [
  {
    value: "offers",
    label: "Offer register",
    description:
      "Every offer with its market band, what the system proposed, what was sent, the uplift and who approved it.",
  },
  {
    value: "submissions",
    label: "Submission funnel",
    description:
      "Every submission with vehicle, condition, paperwork and where it stopped.",
  },
  {
    value: "customers",
    label: "Customer register",
    description: "The customer list with KYC status and how many vehicles each has brought.",
  },
];

/**
 * Downloads for finance and operations.
 *
 * A dashboard that can't be exported from gets rebuilt in a spreadsheet by
 * hand, badly, so the underlying rows are a click away. The download goes
 * straight to the browser rather than through state here — the file can be
 * large, and there is nothing to show about it afterwards.
 */
export function ExportPanel() {
  const [dataset, setDataset] = useState("offers");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const href = (() => {
    const params = new URLSearchParams({ dataset });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/staff/reports?${params.toString()}`;
  })();

  const selected = DATASETS.find((d) => d.value === dataset);

  return (
    <Card>
      <CardHeader
        title="Export"
        description="Download the underlying rows as CSV, ready for Excel."
      />
      <CardBody>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="What" required>
            {({ id }) => (
              <Select
                id={id}
                value={dataset}
                onChange={(e) => setDataset(e.target.value)}
              >
                {DATASETS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="From" hint="Leave blank for everything.">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            )}
          </Field>

          <Field label="To">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            )}
          </Field>
        </div>

        {selected ? (
          <p className="mt-3 text-sm text-ink-600">{selected.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* A plain link, so the browser handles the download itself. */}
          <a
            href={href}
            download
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ml-red-600 px-4 py-2.5 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-ml-red-700"
          >
            Download CSV
          </a>
          <span className="text-xs text-ink-500">
            Exports are capped at 20,000 rows and recorded in the audit log.
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
