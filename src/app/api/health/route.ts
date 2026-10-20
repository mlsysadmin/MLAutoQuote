import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Cloud Run startup and liveness probe.
 *
 * Touches the database so a container with a broken connection string is
 * replaced rather than quietly serving errors.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", time: new Date().toISOString() });
  } catch (err) {
    console.error("health check failed", err);
    return Response.json(
      { status: "degraded", error: "database unreachable" },
      { status: 503 },
    );
  }
}
