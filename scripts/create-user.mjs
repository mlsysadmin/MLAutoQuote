/**
 * Creates or updates a staff account.
 *
 *   node scripts/create-user.mjs --email you@mlhuillier.com --name "Your Name" --role ADMIN
 *
 * Reads DATABASE_URL from the environment. Against Cloud SQL, run the Cloud SQL
 * Auth Proxy first (scripts/create-user.ps1 does that for you).
 *
 * If --password is omitted a strong one is generated and printed once.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string", default: "APPRAISER" },
    password: { type: "string" },
    branch: { type: "string" },
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

const password = values.password ?? generatePassword();
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
    console.log(`  Password:      ${password}`);
    console.log("  This is shown once. Give it to them over a private channel");
    console.log("  and have them change it after first sign-in.");
  }
  console.log("");
} finally {
  await prisma.$disconnect();
}

/** 20 characters from a set that survives being typed from a sticky note. */
function generatePassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(20);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
