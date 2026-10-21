# Security

How AutoQuote protects the two things it holds that matter: customers'
identity documents, and the authority to commit M Lhuillier to a purchase
price.

This is a description of what the code actually does, not a policy aspiration.
Where something is deliberately *not* done, it says so and why.

---

## What's worth protecting

| Asset | Why it matters | Where it lives |
| --- | --- | --- |
| CR, OR and government ID scans | Identity documents. A leak is a Data Privacy Act incident. | Private Cloud Storage bucket |
| Customer PII | Name, birth date, ID number, mobile, address | Cloud SQL |
| The authority to release an offer | An offer is a commitment to pay | Staff accounts |
| The valuation parameters | Buy margin sets every price | Environment configuration |

---

## Authentication

**Staff** sign in with email and password. Passwords are bcrypt at cost 10 —
never stored or logged in any recoverable form.

The sign-in comparison runs a bcrypt hash **even when the email is unknown**,
against a fixed dummy hash. Without that, response time alone reveals which
addresses have accounts.

**Customers** have no account at all. Two mechanisms stand in:

- A **draft-ownership cookie** — a signed, httpOnly JWT listing the submission
  IDs this browser created. A submission ID on its own grants nothing, so a
  guessed or leaked ID cannot be used to read or alter someone's draft.
- A **tracking token** — 32 bytes of entropy, URL-safe, in the offer link.

Recovering a lost tracking link needs **both** the reference code and the
registered mobile number, and the response is identical whether or not a match
exists — so it cannot be used to confirm that a particular person sold a car.

### Brute force

Two independent counters, because they stop different attacks:

| Counter | Limit | Stops |
| --- | --- | --- |
| Per IP | 10 attempts / 10 min | One source hammering many accounts |
| Per account | 8 failures / 15 min, extending | Many sources targeting one account |

The account check runs **before** the password is verified, so a locked
account costs an attacker nothing to discover and gains them nothing. Lockouts
clear on a successful sign-in, a password reset, or reinstatement.

Both counters are in-process. On Cloud Run that means per-container, which is
a deliberate trade-off: it costs nothing and adds no dependency, and the
concurrency limit caps how far an attacker can spread. A deployment under
real attack should move these to a shared store.

---

## Authorisation

Three roles, checked **server-side on every endpoint** — never only in the UI:

| Role | Can |
| --- | --- |
| `VIEWER` | Read the queue, registry, dashboard; export |
| `APPRAISER` | …plus adjust and release offers |
| `ADMIN` | …plus manage staff accounts |

`requireStaff(minimum)` returns the user or an HTTP response, so a route that
forgets the check fails to compile rather than silently opening.

Two self-lockout guards: an administrator cannot deactivate their own account
or demote themselves, and the **last active administrator** cannot be demoted
or suspended by anyone. Otherwise the only route back in is the database.

### Offers above the recommendation

Going above the system's figure requires a reason and an internal note of at
least a sentence. **Enforced in the send endpoint**, not just the form — the
form can be bypassed with a terminal; the endpoint cannot. The reason is
recorded on the offer and in the audit log so uplifts can be reviewed as a
pattern.

---

## Request integrity

### CSRF

Every authenticated surface is cookie-based, which is exactly what CSRF
exploits. `SameSite=lax` helps but is a property of the cookie rather than a
check we control, so `src/middleware.ts` requires every state-changing request
to `/api/*` to demonstrably originate here:

1. `Sec-Fetch-Site` must be `same-origin` or `none`. Browsers set this and
   page script cannot forge it.
2. Failing that, `Origin` must match the receiving host.
3. Neither present — refused.

`/api/ingest/*` is exempt: it authenticates with a bearer token and carries no
cookie, so there is nothing for a third-party page to ride on.

### Content Security Policy

`default-src 'self'`, with `object-src 'none'`, `base-uri 'self'` and
`frame-ancestors 'self'`. An injected script cannot load code from elsewhere,
exfiltrate to another origin, or frame the app.

Two deliberate concessions:

- `'unsafe-inline'` for **styles** — Tailwind and React emit inline style
  attributes. Inline CSS cannot execute; the risk is cosmetic.
- `'unsafe-eval'` and websockets in **development only**, for hot reloading.
  Production gets neither.

Also set: HSTS (2 years), `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Cross-Origin-Opener-Policy`, and a `Permissions-Policy`
granting camera and geolocation only to this origin.

---

## Customer documents

- Bucket has **uniform access and public access prevention**; no object is
  ever world-readable.
- Browsers upload with a **15-minute V4 signed PUT URL** — the image never
  passes through the application.
- Reads use **6-hour signed URLs**, generated per view and cached in-process.
- Upload keys must sit under `submissions/<id>/`, so a client cannot claim a
  file belonging to another submission.
- Content type is checked against an allow-list; size is capped at 12 MB.

Consent is explicit: the customer ticks a specific confirmation that
M Lhuillier may process their details and photographs to appraise the vehicle,
recorded against the submission.

### Reading the ID

Uploaded IDs are read automatically to pre-fill the customer's details. This
trades a little privacy for a lot less typing, so:

- Extracted values are **always shown for confirmation** and never silently
  trusted.
- A low-confidence read shows **nothing** rather than a confident guess.
- Field values are **never written to logs** — only how many fields were found
  and at what confidence.
- Where the image goes depends on the reader. `local` (Tesseract, in-process)
  sends it nowhere at all; Cloud Vision keeps it inside your own GCP project;
  the vision-model provider sends it to a third party. With nothing configured
  the best available is used, and `local` always is — so reading is on by
  default. `ID_EXTRACTION_PROVIDER=off` disables it entirely, and
  `ID_EXTRACTION_PROVIDER=local` is the setting for a deployment that must not
  send ID images anywhere, including to its own cloud.

---

## Data handling

**Logs never contain** passwords, ID numbers, extracted field values, full
mobile numbers or full email addresses. Numbers and addresses are masked
(`0917***99`, `cl***@mlhuillier.com`).

**Audit log** records every sign-in, failed sign-in, lockout, offer
generation, adjustment, release, customer response, account change and export
— with actor, IP and timestamp. Audit writes are wrapped so a logging failure
can never take down the action it is recording.

**Exports** are capped at 20,000 rows, audited, and sent `no-store`. CSV cells
beginning `=`, `+`, `-` or `@` are prefixed with a quote, so a customer who
types a formula into a free-text field cannot have it execute on the machine
of whoever opens the export.

---

## Secrets

`DATABASE_URL`, `SESSION_SECRET` and gateway tokens live in **Secret Manager**
and reach the container as environment variables — never in source, never on a
command line, never in the image. `.env` is git-ignored and excluded from the
deployment package (verified on every build).

`SESSION_SECRET` must be **32+ characters in production** or the app refuses
to start. It signs staff session cookies, so a weak one would let anyone forge
an appraiser login.

### The development password

Every development and demo account uses `1234567890`, by instruction. This is
a deliberate convenience with a hard boundary:

- `AUTH_ALLOW_BLANK_PASSWORD` is **refused in production** regardless of what
  the environment says, and has tests proving it.
- `scripts/create-user.ps1` prints a plain warning when that default lands on
  a deployed database.

**Before going live**, set real passwords for every staff account. A staff
account can release offers and open customers' CR, OR and ID scans.

---

## Known limitations

Stated plainly, because a security document that lists only strengths is
marketing:

1. **Rate limiting is per-container.** See Authentication above.
2. **No MFA.** Password alone. For accounts that can commit money, MFA is the
   obvious next hardening step.
3. **No password complexity policy**, by instruction.
4. **Signed read URLs last 6 hours.** A URL copied out of a browser works for
   that long, from anywhere.
5. **No automated dependency scanning** in the pipeline yet.
6. **ID extraction accuracy is unmeasured** against real Philippine IDs.

---

## Reporting a problem

Security issues go to the M Lhuillier IT security team, not a public tracker.
Include what you did, what happened, and what you expected.
