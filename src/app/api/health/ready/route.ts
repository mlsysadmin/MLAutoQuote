import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Readiness.
 *
 * Can the service actually do its job — is the database reachable and is the
 * schema applied? Point monitoring and alerting here, not a startup probe:
 * returning 503 from a startup probe would stop a revision that is serving the
 * public pages perfectly well from ever going live.
 *
 * The migration check is what catches a deploy where the container started
 * with SKIP_MIGRATIONS and nobody ran the job afterwards.
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
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  // A missing _prisma_migrations table means the schema was never applied.
  let migrations: "applied" | "missing" | "unknown" = "unknown";
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      "SELECT COUNT(*) AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL",
    );
    migrations = Number(rows[0]?.n ?? 0) > 0 ? "applied" : "missing";
  } catch {
    migrations = "missing";
  }

  const ready = migrations === "applied";
  return Response.json(
    {
      status: ready ? "ready" : "not-ready",
      database: "reachable",
      migrations,
      latencyMs: Date.now() - started,
      ...(ready
        ? {}
        : { detail: "Schema not applied. Run scripts/migrate-job.ps1." }),
    },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
