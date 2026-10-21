/**
 * The blank-password guard.
 *
 * `AUTH_ALLOW_BLANK_PASSWORD` is a development convenience, and the one thing
 * that must never be true of it is that a deploy could switch it on. A staff
 * account can release offers and open customers' CR, OR and ID scans, so this
 * is worth a test of its own.
 *
 * `env.ts` reads NODE_ENV once at module load, so each case imports it fresh
 * with the environment already set.
 */

import test from "node:test";
import assert from "node:assert/strict";

async function loadEnv(nodeEnv: string, flag: string | undefined) {
  // Next's types declare NODE_ENV read-only; the test has to set it to drive
  // the production branch, so it writes through a plain record view.
  const vars = process.env as Record<string, string | undefined>;
  vars.NODE_ENV = nodeEnv;
  if (flag === undefined) delete process.env.AUTH_ALLOW_BLANK_PASSWORD;
  else process.env.AUTH_ALLOW_BLANK_PASSWORD = flag;

  // A distinct query string defeats the module cache, so NODE_ENV is re-read.
  const mod = await import(`./env.ts?case=${nodeEnv}-${flag}`);
  return mod.env as { allowBlankStaffPassword: boolean };
}

test("production refuses blank passwords even when the flag is set", async () => {
  const env = await loadEnv("production", "true");
  assert.equal(
    env.allowBlankStaffPassword,
    false,
    "a stray AUTH_ALLOW_BLANK_PASSWORD must never open production",
  );
});

test("development honours the flag when it is explicitly true", async () => {
  const env = await loadEnv("development", "true");
  assert.equal(env.allowBlankStaffPassword, true);
});

test("development still requires a password unless the flag is set", async () => {
  const unset = await loadEnv("development", undefined);
  assert.equal(unset.allowBlankStaffPassword, false);

  const off = await loadEnv("development", "false");
  assert.equal(off.allowBlankStaffPassword, false);
});

test("only the exact string \"true\" counts", async () => {
  for (const value of ["TRUE", "1", "yes", "on", " true "]) {
    const env = await loadEnv("development", value);
    assert.equal(
      env.allowBlankStaffPassword,
      false,
      `"${value}" should not enable blank passwords`,
    );
  }
});
