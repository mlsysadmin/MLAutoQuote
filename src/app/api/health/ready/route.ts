import { readdirSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Readiness.
 *
 * Can the service actually do its job — is the database reachable and is the
 * schema the one this build expects? Point monitoring and alerting here, not
 * a startup probe: returning 503 from a startup probe would stop a revision
 * that is serving the public pages perfectly well from ever going live.
 *
 * The migration check compares the migrations in this image against the ones
 * recorded in the database, and names the difference. Counting rows was not
 * enough: a deploy that adds two migrations and never runs the job leaves a
 * database that is "migrated" by any count, and an app whose every query
 * selects a column that isn't there. The symptom is a customer told to check
 * their internet connection; the cause is one line of output away.
 */
export async function GET() {
  const started = Date.now();

  if (!process.env.DATABASE_URL) {
    return Response.json(
      {
        status: "not-ready",
        database: "unconfigured",
        detail: "DATABASE_URL is not set on this revision.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.error("readiness: database unreachable", err);
    return Response.json(
      {
        status: "not-ready",
        database: "unreachable",
        latencyMs: Date.now() - started,
        detail:
          "The database did not answer. Check the Cloud SQL instance and the connection name in DATABASE_URL.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let applied: string[];
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
      "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL",
    );
    applied = rows.map((r) => r.migration_name);
  } catch {
    // No _prisma_migrations table at all: the schema was never applied.
    return Response.json(
      {
        status: "not-ready",
        database: "reachable",
        migrations: "missing",
        latencyMs: Date.now() - started,
        detail: "The schema has never been applied. Run scripts/migrate-job.ps1.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const pending = expectedMigrations().filter((m) => !applied.includes(m));

  if (pending.length > 0) {
    return Response.json(
      {
        status: "not-ready",
        database: "reachable",
        migrations: "pending",
        pending,
        latencyMs: Date.now() - started,
        detail:
          `${pending.length} migration(s) in this build are not in the database, ` +
          "so queries will fail on the columns they add. Run scripts/migrate-job.ps1.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    {
      status: "ready",
      database: "reachable",
      migrations: "applied",
      migrationCount: applied.length,
      latencyMs: Date.now() - started,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * The migration folders shipped in this image.
 *
 * The Dockerfile copies `prisma/` in precisely so the container can apply
 * them; reading the same directory is how the app knows what it expects.
 * Returning nothing on failure is deliberate — an unreadable directory must
 * not make a healthy service report itself unready.
 */
function expectedMigrations(): string[] {
  try {
    return readdirSync(join(process.cwd(), "prisma", "migrations"), {
      withFileTypes: true,
    })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}
