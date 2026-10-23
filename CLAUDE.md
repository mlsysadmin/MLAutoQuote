# MLAutoQuote

A second-hand vehicle buying platform for M Lhuillier. A customer describes
their car or motorcycle, uploads photos, and gets a cash offer priced against
marketplace comparables — which an appraiser reviews and releases. Offers are
never sent automatically.

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 ·
Prisma 6 + MySQL 8 · deployed to Cloud Run.

## Running it

```powershell
powershell -File scripts/db-start.ps1   # MySQL on 3310 — does NOT survive a reboot
npm.cmd run dev                         # http://localhost:3400
```

In PowerShell use `npm.cmd`, not `npm`: the execution policy here blocks
`npm.ps1`.

| Command | What it does |
| --- | --- |
| `npm.cmd run dev` | Dev server on 3400 (`scripts/dev.mjs` pins the port) |
| `npm test` | 97 tests, pure functions only, under a second |
| `npm run typecheck` / `npm run lint` | |
| `npm run package` | The zip the SysAd deploys to Cloud Run |
| `npm run laptop-kit` | Source + a database dump + a setup script, for a second machine |

Staff sign-in: `appraiser@mlhuillier.com` / `1234567890`, or
`admin@mlhuillier.com` for Settings.

## How Clark wants work done here

These are standing instructions, not preferences. They apply to every change
on this project, on any machine, without being asked each time. On Clark's
desktop they also live in Claude Code's own memory; this file is what carries
them everywhere else.

### Finishing a piece of work

1. **QA every change — including a one-line fix.** Not just a build and a
   lint: exercise the path a user would take, in the browser for UI, by
   running the thing for scripts. Judge usability, consistency, colour, the
   length of the flow and whether anything reads like a lie, with the real
   rendered page in front of you.
2. **Rebuild the deployment package** (`npm run package`) so the zip on disk
   always matches the code. It is a handover: Clark passes it to his SysAd to
   deploy, and a package older than the code means the wrong thing ships.
3. **Say explicitly that it is done.** Never leave him to infer it from the
   absence of errors.
4. **End with how to reach it** — clickable links, the commands to run, and
   the package path with its checksum.
5. **Report honestly.** If something could not be verified, say which part
   and why, rather than implying it passed.

### What the code must be

6. **Security hardened.** CSRF on every state-changing route, CSP, rate
   limiting and lockout on auth, least-privilege roles enforced server-side,
   secrets never in source or logs, PII masked in logs, sensitive actions
   audited. A check that exists only in the UI does not count — the API is
   the boundary. (A real defect this project shipped: the revise button let
   through a request the server then refused, with nothing shown to explain
   it. Gate the client on exactly what the server enforces.)
7. **Multi-user.** Real roles with a management screen, not a CLI script.
   Every record carries who did what and when.
8. **Enterprise grade.** Health and readiness endpoints that name the fault,
   graceful degradation when a dependency is down, migrations that run safely
   on every deploy, no single-container assumptions.
9. **Reports and dashboards** that people can act on, with CSV export.
10. **Well documented** — README, deployment guide, and notes on the
    decisions that look odd without context.
11. **Minimal customer data entry.** Read any uploaded document rather than
    asking for what it already contains. The customer confirms, never
    retypes.
12. **Light enough for 3G, and survives a dropped connection.** Compress on
    the device before upload, save progress as it is typed, make writes
    idempotent so a retry cannot duplicate, resume rather than restart.
    "Check your connection and try again" is a last resort, not a design.
    Measured here: homepage 237 KB, `/sell` 217 KB, ~4.3s at 400 kbps.

### Interface details he expects by default

13. **Ctrl+Z undo and Ctrl+C copy** wherever something is editable or
    interactive.
14. **Real photographs** for every product or service, including intangible
    ones. Never default an image to null.
15. **Design quality in the real app**, not only in artifacts — the same care
    with spacing, colour and states that a design pass would bring.

### Rules specific to this business

16. **Every development password is `1234567890`**, including the production
    Cloud SQL one. He asked for that explicitly, for consistency.
17. **The logo always comes from mlhuillier.com** (`/brand/ml-logo.svg`).
    There is no inverted variant.
18. **Never scrape Facebook Marketplace.** Comparables come from the manual,
    partner or seed providers.
19. **Offers never auto-send.** The engine proposes; an appraiser releases.

## Traps this project has already fallen into

Each of these cost real debugging time. They are fixed; the note is so the
same shape is recognised next time.

- **MySQL does not start itself after a reboot.** The app serves pages
  perfectly while `/api/health/ready` says `database: unreachable`, and the
  only symptom is a customer told to check their connection. Check that
  endpoint first, always.
- **Stop the dev server before `npm run build`.** They share `.next`, and
  Windows holds the Prisma query-engine DLL open, so `prisma generate` fails
  with EPERM.
- **A stale Turbopack cache serves old code.** If an edit is on disk but not
  in the browser, `rm -rf .next` and restart before believing anything else.
- **The homepage has its own copy of the site header** (`src/app/page.tsx`),
  separate from `SiteChrome`. A header change must be made in both.
- **Step numbers live in `src/lib/wizard.ts`, with tests.** Merging two wizard
  steps once left the validation on the old numbering, demanding fields that
  were no longer on screen — Continue died silently. Never put step rules back
  in a component.
- **AVG's Web/Mail Shield intercepts HTTPS** on Clark's desktop and re-signs
  it. Node rejects its root, so every outbound call fails with
  `UNABLE_TO_VERIFY_LEAF_SIGNATURE` while browsers are fine. `npm run dev`
  passes `--use-system-ca` to fix it.
- **PowerShell scripts need a UTF-8 BOM.** Windows PowerShell 5.1 misreads an
  em dash without one and the file fails to parse.

## Where things are

- `src/lib/valuation/` — pricing. Pure functions, no database, no clock
  beyond the current year. That is why it is fast to test and safe to reason
  about.
- `src/lib/vehicle-class.ts` — everything that differs between four wheels
  and two. Model list, photo slots, mileage expectations, transmissions.
- Providers are pluggable behind interfaces: comparables, ID extraction
  (`vision` / `claude` / `local` Tesseract), email (`api` / `smtp` /
  `webhook`), storage (`gcs` / `local`). Each is a vendor you might swap.
- `prisma/migrations/` — applied in production by a Cloud Run Job, never at
  container start.

## Production

https://ml-autoquote-376318511165.asia-southeast1.run.app

**Currently broken**: the live revision has no `DATABASE_URL`, so it serves
pages and saves nothing. The fix is `scripts/repair-production.ps1`, which
Clark's SysAd runs — there is no gcloud on the desktop.

`/api/health/ready` names the fault in one line: unreachable, unconfigured,
pending migrations (with the names), or ready.

## Not a git repository

The project is plain files on `X:\`. No history, no branches. Worth changing.
