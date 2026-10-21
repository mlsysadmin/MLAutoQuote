/**
 * Creates or updates a staff account.
 *
 *   node scripts/create-user.mjs --email you@mlhuillier.com --name "Your Name" --role ADMIN
 *
 * Reads DATABASE_URL from the environment. Against Cloud SQL, run the Cloud SQL
 * Auth Proxy first (scripts/create-user.ps1 does that for you).
 *
 * With no --password the account gets the standard development password. Pass
 * --remote (the wrapper scripts do, when they tunnel to Cloud SQL) and it says
 * so loudly, because that default has no business on a deployed service.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { parseArgs } from "node:util";

/** The development standard, used everywhere a password is seeded or defaulted. */
const DEV_PASSWORD = "1234567890";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string", default: "APPRAISER" },
    password: { type: "string" },
    branch: { type: "string" },
    remote: { type: "boolean", default: false },
  },
});

const ROLES = ["ADMIN", "APPRAISER", "VIEWER"];

if (!values.email || !values.name) {
  console.error(
    'Usage: node scripts/create-user.mjs --email you@mlhuillier.com --name "Your Name" [--role ADMIN] [--branch "Cebu — Colon"]',
  );
  process.exit(1);
}

const role = String(values.role).toUpperCase();
if (!ROLES.includes(role)) {
  console.error(`--role must be one of: ${ROLES.join(", ")}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const password = values.password ?? DEV_PASSWORD;
const prisma = new PrismaClient();

try {
  const passwordHash = await bcrypt.hash(password, 10);
  const email = values.email.trim().toLowerCase();

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: values.name,
      role,
      branch: values.branch ?? undefined,
      passwordHash,
      active: true,
    },
    create: {
      email,
      name: values.name,
      role,
      branch: values.branch ?? null,
      passwordHash,
    },
  });

  console.log("");
  console.log(`  Account ready: ${user.email}`);
  console.log(`  Name:          ${user.name}`);
  console.log(`  Role:          ${user.role}`);
  if (!values.password) {
    console.log("");
    console.log(`  Password:      ${password}  (development standard)`);

    if (values.remote) {
      console.log("");
      console.log("  ⚠  This account is on a DEPLOYED database, and it can");
      console.log("     release offers and open customers' CR, OR and ID scans.");
      console.log("     Re-run with --password '<something only they know>'");
      console.log("     before anyone outside the team uses it.");
    }
  }
  console.log("");
} finally {
  await prisma.$disconnect();
}
