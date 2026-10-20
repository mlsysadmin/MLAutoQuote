"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  PesoInput,
} from "@/components/ui";
import { formatPeso, formatKm, parsePeso } from "@/lib/money";
import { marketplaceSearchUrl } from "@/lib/valuation/providers/marketplace";

type Comparable = {
  id: string;
  source: string;
  title: string;
  url: string;
  pricePhp: number;
  year: number | null;
  mileageKm: number | null;
  location: string | null;
  isExcluded: boolean;
  bucket: string | null;
};

const SOURCE_LABELS: Record<string, { label: string; tone: "ok" | "info" | "neutral" }> =
  {
    FACEBOOK_MARKETPLACE: { label: "Marketplace", tone: "ok" },
    MANUAL: { label: "Added by staff", tone: "info" },
    PARTNER_API: { label: "Data feed", tone: "ok" },
    SEED: { label: "Reference estimate", tone: "neutral" },
  };

/**
 * The comparables the offer was built from.
 *
 * Low / mid / high are called out because they are the three numbers the
 * customer will see, and every row links to the listing so the appraiser can
 * check it rather than take the table's word for it.
 */
export function ComparablesPanel({
  submissionId,
  comparables,
  make,
  model,
  year,
}: {
  submissionId: string;
  comparables: Comparable[];
  make: string | null;
  model: string | null;
  year: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [title, setTitle] = useState("");
  const [km, setKm] = useState("");

  const active = useMemo(
    () => comparables.filter((c) => !c.isExcluded),
    [comparables],
  );

  const searchUrl =
    make && model ? marketplaceSearchUrl({ make, model, year }) : null;

  async function call(
    method: string,
    body?: unknown,
    search?: string,
  ): Promise<boolean> {
    setError(null);
    const res = await fetch(
      `/api/staff/submissions/${submissionId}/comparables${search ?? ""}`,
      {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setError(payload.error ?? "That didn't work.");
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  async function addComparable(e: React.FormEvent) {
    e.preventDefault();
    const pricePhp = parsePeso(price);
    if (!url.trim() || !pricePhp) {
      setError("A listing link and a price are both needed.");
      return;
    }

    const ok = await call("POST", {
      url: url.trim(),
      pricePhp,
      title:
        title.trim() ||
        [year, make, model].filter(Boolean).join(" ") ||
        "Comparable listing",
      year,
      mileageKm: km ? Number(km.replace(/[^0-9]/g, "")) : null,
    });

    if (ok) {
      setUrl("");
      setPrice("");
      setTitle("");
      setKm("");
      setAdding(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Market comparables"
        description={
          active.length > 0
            ? `${active.length} listing${active.length === 1 ? "" : "s"} in the band · ${comparables.length - active.length} excluded`
            : "No comparables yet — add at least three for a defensible offer."
        }
        action={
          <div className="flex items-center gap-2">
            {searchUrl ? (
              <a
                href={searchUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"
              >
                Search Marketplace
              </a>
            ) : null}
            <Button size="sm" onClick={() => setAdding((v) => !v)}>
              {adding ? "Cancel" : "Add listing"}
            </Button>
          </div>
        }
      />

      <CardBody>
        {error ? (
          <div className="mb-4">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}

        {adding ? (
          <form
            onSubmit={addComparable}
            className="mb-5 space-y-4 rounded-xl bg-ink-50 p-4"
          >
            <Field
              label="Listing link"
              required
              hint="Paste the Marketplace URL — or any public listing."
            >
              {({ id }) => (
                <Input
                  id={id}
                  value={url}
                  autoFocus
                  placeholder="https://www.facebook.com/marketplace/item/…"
                  onChange={(e) => setUrl(e.target.value)}
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Asking price" required>
                {({ id }) => (
                  <PesoInput
                    id={id}
                    value={price}
                    placeholder="485,000"
                    onChange={(e) => setPrice(e.target.value)}
                  />
                )}
              </Field>

              <Field label="Mileage">
                {({ id }) => (
                  <Input
                    id={id}
                    value={km}
                    inputMode="numeric"
                    placeholder="85000"
                    className="nums"
                    onChange={(e) => setKm(e.target.value)}
                  />
                )}
              </Field>

              <Field label="Title">
                {({ id }) => (
                  <Input
                    id={id}
                    value={title}
                    placeholder={[year, make, model].filter(Boolean).join(" ")}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                )}
              </Field>
            </div>

            <Button type="submit" size="sm" loading={pending}>
              Add to comparables
            </Button>
          </form>
        ) : null}

        {comparables.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500">
            Nothing to compare against yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left">
                  <th className="pb-2 pr-3 text-xs font-bold uppercase tracking-wider text-ink-500">
                    Listing
                  </th>
                  <th className="pb-2 pr-3 text-right text-xs font-bold uppercase tracking-wider text-ink-500">
                    Price
                  </th>
                  <th className="pb-2 pr-3 text-xs font-bold uppercase tracking-wider text-ink-500">
                    Details
                  </th>
                  <th className="pb-2 text-right text-xs font-bold uppercase tracking-wider text-ink-500">
                    Use
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {comparables.map((c) => {
                  const source = SOURCE_LABELS[c.source] ?? {
                    label: c.source,
                    tone: "neutral" as const,
                  };
                  return (
                    <tr
                      key={c.id}
                      className={c.isExcluded ? "opacity-45" : undefined}
                    >
                      <td className="py-2.5 pr-3">
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-ink-900 hover:text-ml-red-700 hover:underline"
                        >
                          {c.title}
                        </a>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge tone={source.tone}>{source.label}</Badge>
                          {c.bucket && !c.isExcluded ? (
                            <Badge
                              tone={c.bucket === "MID" ? "gold" : "neutral"}
                            >
                              {c.bucket === "LOW"
                                ? "Lowest"
                                : c.bucket === "MID"
                                  ? "Middle"
                                  : "Highest"}
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right align-top">
                        <span className="font-bold text-ink-900 nums">
                          {formatPeso(c.pricePhp)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 align-top text-xs text-ink-600">
                        {[c.year, formatKm(c.mileageKm), c.location]
                          .filter((v) => v && v !== "—")
                          .join(" · ") || "—"}
                      </td>
                      <td className="py-2.5 text-right align-top">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            call("PATCH", {
                              comparableId: c.id,
                              isExcluded: !c.isExcluded,
                            })
                          }
                          className="text-xs font-semibold text-ml-red-700 hover:underline disabled:opacity-50"
                        >
                          {c.isExcluded ? "Include" : "Exclude"}
                        </button>
                        {c.source === "MANUAL" ||
                        c.source === "FACEBOOK_MARKETPLACE" ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              call(
                                "DELETE",
                                undefined,
                                `?comparableId=${encodeURIComponent(c.id)}`,
                              )
                            }
                            className="ml-3 text-xs font-semibold text-ink-500 hover:underline disabled:opacity-50"
                          >
                            Delete
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-ink-500">
          Rows marked <strong>Reference estimate</strong> come from our local
          price model, not a captured listing — their link opens the live
          Marketplace search for the same vehicle so you can verify the range.
          Add real listings and recalculate to replace them in the band.
        </p>
      </CardBody>
    </Card>
  );
}
