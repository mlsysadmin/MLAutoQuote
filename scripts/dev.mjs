import { spawn } from "node:child_process";

/**
 * Starts the dev server with Node trusting the machine's own certificate
 * store.
 *
 * Security software — AVG's Web/Mail Shield on this machine, Zscaler and
 * Fortinet elsewhere — works by intercepting HTTPS and re-signing it with a
 * root certificate it installs into Windows. Browsers accept that, because
 * they read the Windows store. Node ships its own list of certificate
 * authorities and does not, so every outbound HTTPS call from the server
 * fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE — the email API, the ID reader,
 * anything.
 *
 * `--use-system-ca` tells Node to trust exactly what the operating system
 * trusts. It is not a bypass: certificates are still verified, against the
 * store the machine's administrator controls. Nothing is disabled, and this
 * never reaches production — Cloud Run has no interception and runs
 * `next start`, not this.
 *
 * Node 22.15+ and 24+ only. On older versions the flag is ignored with a
 * warning and the dev server still starts.
 */
const flags = ["--use-system-ca", process.env.NODE_OPTIONS]
  .filter(Boolean)
  .join(" ");

const child = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, NODE_OPTIONS: flags },
});

child.on("exit", (code) => process.exit(code ?? 0));
