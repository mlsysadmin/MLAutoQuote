export const dynamic = "force-dynamic";

/**
 * Liveness.
 *
 * Answers one question: is this process up and serving? It deliberately does
 * not touch the database, because this is what a Cloud Run startup or liveness
 * probe should point at — a cold Cloud SQL instance must not be able to stop a
 * healthy revision from starting, or take a running one down.
 *
 * For "can it actually do its job", use /api/health/ready.
 */
export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "ml-autoquote",
      time: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
