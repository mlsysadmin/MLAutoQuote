import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Builds a single folder that turns a second computer into this one.
 *
 * Different from `npm run package`, which produces the zip the SysAd deploys
 * to Cloud Run. This is for a person who wants to carry on working: the
 * source, the database as it stands right now, and one script that wires the
 * two together.
 *
 * What it deliberately leaves out: node_modules (reinstalled on the other
 * side, because native modules are built per machine), .next, and .env —
 * which holds the live email key and is nobody's business travelling on a
 * USB stick. The setup script writes a fresh .env instead.
 */

const root = resolve(import.meta.dirname, "..");
// Local time, not UTC: the name is read by a person who wants to know which
// copy is the newer one, and theirs is the clock on the wall.
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp =
  `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
  `-${pad(now.getHours())}${pad(now.getMinutes())}`;

const out = join(root, "dist", `ml-autoquote-laptop-${stamp}`);

// ── What travels ─────────────────────────────────────────────────────────────

const INCLUDE = [
  "src",
  "prisma",
  "public",
  "scripts",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "eslint.config.mjs",
  "postcss.config.mjs",
  ".env.example",
  "README.md",
  "CLAUDE.md",
  "DEPLOYMENT.md",
  "ARCHITECTURE.md",
  "SECURITY.md",
  "Dockerfile",
  "docker-entrypoint.sh",
  ".dockerignore",
  ".gitignore",
];

// Big, machine-specific, or secret. None of it should cross.
const SKIP = new Set(["node_modules", ".next", "dist", ".env", ".env.local"]);

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let files = 0;
let bytes = 0;

for (const entry of INCLUDE) {
  const from = join(root, entry);
  if (!existsSync(from)) continue;

  cpSync(from, join(out, entry), {
    recursive: true,
    filter: (src) => {
      const name = src.split(/[\\/]/).pop();
      if (name && SKIP.has(name)) return false;
      try {
        if (statSync(src).isFile()) {
          files += 1;
          bytes += statSync(src).size;
        }
      } catch {
        // A file that vanished mid-copy is not worth failing the kit for.
      }
      return true;
    },
  });
}

// ── The database as it stands ────────────────────────────────────────────────

// Clark's standing instructions. CLAUDE.md above carries them for Claude
// automatically; these are the originals, for dropping into the other
// machine's own memory folder so they survive outside this project too.
const memorySource = join(root, "dist", "laptop", "claude-memory");
if (existsSync(memorySource)) {
  cpSync(memorySource, join(out, "claude-memory"), { recursive: true });
  console.log("  standing instructions: copied for the other machine's memory");
}

const dumpSource = join(root, "dist", "laptop", "ml_autoquote.sql");
if (existsSync(dumpSource)) {
  cpSync(dumpSource, join(out, "ml_autoquote.sql"));
  const size = statSync(dumpSource).size;
  files += 1;
  bytes += size;
  console.log(`  database dump: ${Math.round(size / 1024)} KB`);
} else {
  console.log("  no database dump found — the kit will set up an empty database");
}

// ── The uploaded photographs ──────────────────────────────────────────────────

// The dump carries the photo ROWS; the image files live on disk under
// .uploads. Without them the other machine shows a gallery of broken
// thumbnails for every existing submission, which looks like data loss even
// though nothing is lost. Skipped with --no-photos when the transfer has to
// stay small.
const wantPhotos = !process.argv.includes("--no-photos");
const uploads = join(root, ".uploads");
if (wantPhotos && existsSync(uploads)) {
  cpSync(uploads, join(out, "uploads-restore"), { recursive: true });
  let n = 0;
  let b = 0;
  const count = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) count(full);
      else { n += 1; b += statSync(full).size; }
    }
  };
  count(uploads);
  console.log(`  photographs: ${n} files, ${Math.round(b / 1024 / 1024)} MB`);
} else if (!wantPhotos) {
  console.log("  photographs: skipped (--no-photos)");
}

// ── A note for whoever opens the folder ──────────────────────────────────────

writeFileSync(
  join(out, "START-HERE.md"),
  `# Setting this up on another computer

Everything here came from the desktop. One command sets it up.

## Before you start

Two things need installing, if they are not already:

1. **Node 24** — https://nodejs.org/en/download
2. **MySQL 8.4**, "Server only" — https://dev.mysql.com/downloads/installer/
   Set the root password to \`1234567890\` so it matches the desktop.

## Then

Open PowerShell in this folder and run:

\`\`\`powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-laptop.ps1
\`\`\`

It installs the packages, starts the database on port 3310, loads
\`ml_autoquote.sql\` — the desktop's data as of ${new Date().toISOString().slice(0, 16).replace("T", " ")} —
applies migrations, and tells you what to run next.

Start the app:

\`\`\`powershell
npm.cmd run dev
\`\`\`

Then open http://localhost:3400, or http://localhost:3400/staff for the
appraiser portal (\`appraiser@mlhuillier.com\` / \`1234567890\`).

## Getting Claude Code working here too

Install the desktop app from https://claude.ai/download and sign in with the
same account. Open **this folder** as the working directory and start a new
session — it runs on this machine, so it keeps working when the desktop
sleeps.

CLAUDE.md in this folder is read automatically at the start of every
session: it carries the project's conventions, Clark's standing instructions
(QA every change, rebuild the package, say when it's done) and the traps this
codebase has already fallen into.

The claude-memory/ folder holds those same standing instructions as Claude's
own memory files. CLAUDE.md already applies them inside this project; copy
these into the path below only if you want them to apply to other work on
this machine as well:

    %USERPROFILE%\\.claude\\projects\\<this-folder-slug>\\memory\\

If that path does not exist yet, start one session first and it will.

## What is not in here

- **node_modules** — reinstalled by the setup script, because some packages
  are compiled for the machine they run on.
- **.env** — it holds the live email API key. The setup script writes a fresh
  one for this computer. To send real email, copy \`EMAIL_API_KEY\` across from
  the desktop's \`.env\` by hand.
- **Uploaded photos** — the ones in the dump are rows pointing at files that
  live on the desktop, so thumbnails of older submissions will not load here.
  New submissions made on this machine work normally.

## After a reboot

MySQL does not start itself:

\`\`\`powershell
powershell -File scripts/db-start.ps1
npm.cmd run dev
\`\`\`
`,
  "utf8",
);

console.log("");
console.log(`  ${files} files, ${Math.round(bytes / 1024)} KB`);
console.log(`  ${out}`);
console.log("");
console.log("  Copy that folder to the laptop and open START-HERE.md.");

// A zip too, for carrying it across.
try {
  const zip = `${out}.zip`;
  if (existsSync(zip)) rmSync(zip);
  execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path '${out}\\*' -DestinationPath '${zip}' -CompressionLevel Optimal`,
    ],
    { stdio: "inherit" },
  );
  console.log(`  zipped: ${zip} (${Math.round(statSync(zip).size / 1024 / 1024 * 10) / 10} MB)`);
} catch {
  console.log("  (could not zip it — copy the folder as it is)");
}
