import { destroySession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  await destroySession();
  return Response.json({ ok: true });
}
