"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
} from "@/components/ui";
import { ROLE_OPTIONS, ROLE_LABELS } from "@/lib/staff-users";

type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  branch: string | null;
  active: boolean;
  offersHandled: number;
  lastLoginAt: string | null;
};

/**
 * Managing colleagues' access.
 *
 * Accounts are deactivated rather than deleted: an appraiser's name is on the
 * offers they released, and those have to stay attributable. Deactivating stops
 * the sign-in and leaves the history intact.
 */
export function UserAdmin({
  users,
  currentUserId,
}: {
  users: StaffUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/staff/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(payload.error ?? "That didn't work.");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(user: StaffUser) {
    const next = window.prompt(
      `New password for ${user.name}. They should change it after signing in.`,
      "",
    );
    if (next === null) return;
    if (next.length < 8) {
      setError("A password needs at least 8 characters.");
      return;
    }
    await patch(user.id, { password: next });
    setNotice(`Password updated for ${user.name}.`);
  }

  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="ok">{notice}</Alert> : null}

      <Card>
        <CardHeader
          title={`${users.filter((u) => u.active).length} active`}
          description={`${users.length} account${users.length === 1 ? "" : "s"} in total`}
          action={
            <Button size="sm" onClick={() => setAdding((v) => !v)}>
              {adding ? "Cancel" : "Add someone"}
            </Button>
          }
        />

        {adding ? (
          <CardBody className="border-b border-ink-100 bg-ink-50">
            <AddUserForm
              onDone={(message) => {
                setAdding(false);
                setNotice(message);
                startTransition(() => router.refresh());
              }}
              onError={setError}
            />
          </CardBody>
        ) : null}

        <CardBody>
          <ul className="divide-y divide-ink-100">
            {users.map((user) => {
              const isMe = user.id === currentUserId;
              return (
                <li
                  key={user.id}
                  className={`flex flex-wrap items-center gap-4 py-4 ${
                    user.active ? "" : "opacity-55"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold text-ink-900">
                      {user.name}
                      {isMe ? <Badge tone="info">You</Badge> : null}
                      {user.active ? null : <Badge tone="neutral">Suspended</Badge>}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-ink-600">
                      {user.email}
                      {user.branch ? ` · ${user.branch}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {user.offersHandled} offer
                      {user.offersHandled === 1 ? "" : "s"} handled ·{" "}
                      {user.lastLoginAt
                        ? `last in ${new Date(user.lastLoginAt).toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" })}`
                        : "never signed in"}
                    </p>
                  </div>

                  <Select
                    aria-label={`Role for ${user.name}`}
                    value={user.role}
                    disabled={busyId === user.id}
                    className="!w-44 !py-1.5 !text-sm"
                    onChange={(e) => patch(user.id, { role: e.target.value })}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={busyId === user.id}
                      onClick={() => resetPassword(user)}
                      className="text-xs font-semibold text-ink-600 hover:underline disabled:opacity-50"
                    >
                      Reset password
                    </button>
                    <button
                      type="button"
                      disabled={busyId === user.id || isMe}
                      title={isMe ? "You can't suspend your own account" : undefined}
                      onClick={() => patch(user.id, { active: !user.active })}
                      className="text-xs font-semibold text-ml-red-600 hover:underline disabled:opacity-40 disabled:no-underline"
                    >
                      {user.active ? "Suspend" : "Reinstate"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="What each role can do" />
        <CardBody>
          <dl className="space-y-3">
            {ROLE_OPTIONS.map((role) => (
              <div key={role.value}>
                <dt className="text-sm font-semibold text-ink-900">
                  {role.label}
                </dt>
                <dd className="text-sm text-ink-600">{role.description}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 border-t border-ink-100 pt-4 text-xs leading-relaxed text-ink-500">
            Accounts are suspended rather than deleted. An appraiser&apos;s name
            stays on the offers they released, so the record of who decided what
            survives them leaving.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function AddUserForm({
  onDone,
  onError,
}: {
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("APPRAISER");
  const [branch, setBranch] = useState("");
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFields({});
    try {
      const res = await fetch("/api/staff/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role, branch: branch || null }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string>;
        password?: string;
      };
      if (!res.ok) {
        onError(body.error ?? "Couldn't create the account.");
        setFields(body.fields ?? {});
        return;
      }
      onDone(
        `${name} can now sign in as ${ROLE_LABELS[role]}, with the password ${body.password}. Have them change it.`,
      );
    } catch {
      onError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={fields.name}>
          {({ id, invalid }) => (
            <Input
              id={id}
              invalid={invalid}
              value={name}
              autoFocus
              placeholder="Maria Santos"
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>

        <Field label="Work email" required error={fields.email}>
          {({ id, invalid }) => (
            <Input
              id={id}
              invalid={invalid}
              type="email"
              value={email}
              placeholder="maria@mlhuillier.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>

        <Field label="Role" required>
          {({ id }) => (
            <Select
              id={id}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Branch">
          {({ id }) => (
            <Input
              id={id}
              value={branch}
              placeholder="ML Colon, Cebu City"
              onChange={(e) => setBranch(e.target.value)}
            />
          )}
        </Field>
      </div>

      <p className="text-xs text-ink-600">
        {ROLE_OPTIONS.find((r) => r.value === role)?.description}
      </p>

      <Button type="submit" size="sm" loading={busy}>
        Create account
      </Button>
    </form>
  );
}
