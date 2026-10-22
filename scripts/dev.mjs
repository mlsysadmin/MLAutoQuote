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

/**
 * 3400 unless told otherwise.
 *
 * Not Next's default of 3000, because `APP_URL` in .env is baked into every
 * offer link we text and email. A server on the wrong port doesn't fail —
 * it serves a site whose links all point somewhere nothing is listening.
 */
const args = process.argv.slice(2);
const port = args.includes("-p") || args.includes("--port")
  ? []
  : ["-p", process.env.PORT ?? "3400"];

// One command string through a shell, rather than a command plus an argument
// array. Windows refuses to spawn a .cmd shim without a shell at all, and
// passing an array *with* one makes Node warn that the arguments are
// concatenated unescaped — so they are concatenated here, deliberately, from
// values this file controls.
const child = spawn(["npx", "next", "dev", ...port, ...args].join(" "), {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NODE_OPTIONS: flags },
});

child.on("exit", (code) => process.exit(code ?? 0));
