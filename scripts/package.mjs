/**
 * Build the Cloud Run deployment package.
 *
 * Written as a zip writer rather than shelling out because the two obvious
 * options both fail here: `zip` isn't installed on this machine, and
 * PowerShell's Compress-Archive writes entry names with backslashes, which
 * Cloud Build reads as literal filename characters — the whole tree arrives
 * flattened and the build dies looking for `package.json`. Entry names here
 * are always forward-slashed.
 *
 *   node scripts/package.mjs            # -> dist/ml-autoquote-cloudrun-<ts>.zip
 */
import { createHash } from "node:crypto";
import { deflateRawSync } from "node:zlib";
import {
  readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, rmSync,
} from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "dist");

/**
 * What to leave out comes from .gitignore, so this never drifts from it. That
 * matters more than it sounds: .uploads/ holds photo submissions from local
 * development, and a hand-maintained list missed it — 79 MB of test customers
 * would have gone out to the SysAd.
 */
function gitignoreMatchers() {
  return readFileSync(join(ROOT, ".gitignore"), "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((pattern) => {
      const dirOnly = pattern.endsWith("/");
      const body = dirOnly ? pattern.slice(0, -1) : pattern;
      return { body, dirOnly };
    });
}

/** Literal match, or a "*" glob — the only form .gitignore uses here. */
function globMatch(pattern, name) {
  const parts = pattern.split("*");
  if (parts.length === 1) return pattern === name;
  if (!name.startsWith(parts[0])) return false;
  let pos = parts[0].length;
  for (let i = 1; i < parts.length - 1; i++) {
    const idx = name.indexOf(parts[i], pos);
    if (idx === -1) return false;
    pos = idx + parts[i].length;
  }
  const last = parts[parts.length - 1];
  return name.length - pos >= last.length && name.endsWith(last);
}

/** Always out, whether or not .gitignore mentions them. */
const ALWAYS_EXCLUDE = new Set([".git", ".claude", "dist"]);
const IGNORES = gitignoreMatchers();

function ignored(name, isDir) {
  if (ALWAYS_EXCLUDE.has(name)) return true;
  return IGNORES.some((m) => (m.dirOnly ? isDir : true) && globMatch(m.body, name));
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (ignored(entry.name, entry.isDirectory())) continue;
    if (entry.isDirectory()) walk(abs, acc);
    else acc.push(abs);
  }
  return acc;
}

// ---- minimal zip writer -----------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

const dosTime = (d) =>
  ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() / 2)) & 0xffff;
const dosDate = (d) =>
  (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;

function buildZip(files) {
  const locals = [];
  const central = [];
  let offset = 0;

  for (const { name, data, mtime } of files) {
    const nameBuf = Buffer.from(name, "utf8");
    const comp = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const time = dosTime(mtime);
    const date = dosDate(mtime);

    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4);
    lfh.writeUInt16LE(0, 6);
    lfh.writeUInt16LE(8, 8); // deflate
    lfh.writeUInt16LE(time, 10);
    lfh.writeUInt16LE(date, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(comp.length, 18);
    lfh.writeUInt32LE(data.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);
    locals.push(lfh, nameBuf, comp);

    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(0, 8);
    cdh.writeUInt16LE(8, 10);
    cdh.writeUInt16LE(time, 12);
    cdh.writeUInt16LE(date, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(comp.length, 20);
    cdh.writeUInt32LE(data.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    // 0644, or 0755 for the shell scripts the deploy steps run directly.
    const mode = name.endsWith(".sh") ? 0o100755 : 0o100644;
    cdh.writeUInt32LE((mode * 0x10000) >>> 0, 38); // << would overflow int32
    cdh.writeUInt32LE(offset, 42);
    central.push(cdh, nameBuf);

    offset += lfh.length + nameBuf.length + comp.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, eocd]);
}

// ---- run --------------------------------------------------------------------

const files = walk(ROOT)
  .map((abs) => ({
    // Forward slashes, always: see the note at the top of this file.
    name: relative(ROOT, abs).split(sep).join("/"),
    data: readFileSync(abs),
    mtime: statSync(abs).mtime,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const zip = buildZip(files);

mkdirSync(OUT_DIR, { recursive: true });
// Only our own older builds. `dist/` also holds the laptop clone kit, and
// sweeping every .zip here once deleted a 108 MB kit that had just been made.
for (const old of readdirSync(OUT_DIR).filter(
  (f) => f.startsWith("ml-autoquote-cloudrun-") && f.endsWith(".zip"),
)) {
  rmSync(join(OUT_DIR, old));
}

const d = new Date();
const p = (n) => String(n).padStart(2, "0");
const stamp =
  `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
  `-${p(d.getHours())}${p(d.getMinutes())}`;
const outPath = join(OUT_DIR, `ml-autoquote-cloudrun-${stamp}.zip`);
writeFileSync(outPath, zip);

console.log(`${files.length} files, ${(zip.length / 1024).toFixed(0)} KB`);
console.log(outPath);
console.log(`sha256 ${createHash("sha256").update(zip).digest("hex")}`);
