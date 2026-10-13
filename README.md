# Miss Elanor — Shop Manager

A private web app for **Miss Elanor**, a small clothing shop in Lebanon. It covers point of sale, stock, sales history and returns, customers, expenses and a dashboard. Data lives in a Google Sheet. Payments are cash only, in USD and/or LBP.

- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Google Sheets API (`googleapis`) · `bcryptjs` + `jose` auth · `zod` validation
- **Users:** only the accounts listed in `AUTH_USERS`. There is no sign-up and no password reset.
- **Works on:** phones (bottom navigation) and laptops (sidebar). It can also be installed as a PWA.

---

## 1. Local setup

Requirements: **Node.js 20+** and npm.

```bash
npm install
cp .env.example .env.local      # then fill in the values (see below)
npm run dev                     # http://localhost:3000
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run build` | Production build (also lints and type-checks) |
| `npm run hash-password -- <password>` | Prints a bcrypt hash for `AUTH_USERS` |

### Environment variables

| Variable | Description |
| --- | --- |
| `GOOGLE_SHEET_ID` | The ID from the Sheet URL: `docs.google.com/spreadsheets/d/<ID>/edit` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | The service account's `client_email` |
| `GOOGLE_PRIVATE_KEY` | The service account's `private_key`. Literal `\n` sequences are turned into newlines at runtime. |
| `AUTH_SECRET` | A long random string (at least 32 characters) used to sign session cookies |
| `AUTH_USERS` | JSON list of users: `[{"username":"...","passwordHash":"$2b$..."}]` |

Never commit `.env.local`; it is already listed in `.gitignore`. The app never logs the private key or password hashes.

Generate `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## 2. Google service account

The app reads and writes the Sheet through a service account. The account acts like a robot user with edit access to that one Sheet.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a project (or pick an existing one).
2. Go to **APIs & Services → Library**, search for **Google Sheets API** and click **Enable**.
3. Go to **IAM & Admin → Service Accounts → Create service account**. Give it a name such as `miss-elanor-app`. It needs no roles, so skip that step.
4. Open the new service account, then **Keys → Add key → Create new key → JSON**. A `.json` file downloads. Keep it private.
5. From that file, copy:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`. In `.env.local`, wrap it in double quotes and keep the `\n` sequences as they are:
     ```
     GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
     ```
6. Open the Google Sheet, click **Share**, paste the service account email, and give it **Editor** access. Untick "Notify people".

### Sheet structure

The tabs and header row are already created. **Do not rename tabs or headers**, because the app maps columns by header name. Adding extra columns at the end is safe; the app ignores them and never overwrites them.

| Tab | Purpose |
| --- | --- |
| Products, Variants | Catalogue; stock is held per size/color in `Variants.quantity` |
| Sales, Sale_Items | One row per sale and one per sale line |
| Customers, Expenses | As named |
| Stock_Movements | Audit trail of every stock change: restock / sale / return / adjustment |
| Settings | `shop_name`, `exchange_rate_lbp_per_usd`, `low_stock_default`, `lbp_rounding` |
| Lists | Dropdown values (`categories`, `sizes`, `colors`, `expense_categories`). Edit them directly in the Sheet; the order of `sizes` is the order shown in the app. |

Notes:

- Reads are cached for about 30 seconds to stay under Google's API quotas. Every change made in the app refreshes the cache straight away. Edits made directly in the Sheet appear within about 30 seconds.
- Google Sheets has no transactions, so a sale is written step by step (Sales → Sale_Items → Variants → Stock_Movements). If a step fails, the app shows exactly which steps were saved and which failed, so the Sheet can be fixed by hand. The same detail is written to the server log.
- Stock is re-checked against a fresh read of the Sheet right before a sale is saved.

---

## 3. Users and password hashes

Create a hash for each person:

```bash
npm run hash-password -- 'their-password'
```

The script prints two versions of the hash:

- **For Vercel:** paste the hash as-is.
- **For `.env.local`:** use the escaped version, where every `$` is written as `\$`. Next.js expands `$...` inside `.env` files, so an unescaped hash gets mangled and login fails.

Example `.env.local` line (all on one line):

```
AUTH_USERS=[{"username":"owner","passwordHash":"\$2b\$12\$abc..."},{"username":"wife","passwordHash":"\$2b\$12\$def..."}]
```

Login rules:

- Sessions last 30 days, in an httpOnly, `SameSite=Lax` cookie that is `Secure` in production.
- After 5 wrong passwords for a username, that username is blocked for 15 minutes. The counter is kept in server memory, so it resets when the server restarts.
- To change a password or remove a user, update `AUTH_USERS` and redeploy. A removed user's session stops working immediately.

---

## 4. Deploying to Vercel

1. Push this repository to GitHub.
2. On [vercel.com](https://vercel.com), click **Add New → Project** and import the repository. The framework is detected as Next.js; keep the defaults.
3. Under **Settings → Environment Variables**, add all five variables from the table above for **Production** (and Preview, if you use it):
   - `GOOGLE_PRIVATE_KEY`: paste the key either with real line breaks or with literal `\n`. Both work. Don't add surrounding quotes.
   - `AUTH_USERS`: paste the JSON with the **unescaped** hashes.
4. Deploy. Later changes to environment variables need a redeploy (**Deployments → … → Redeploy**).

### Installing on a phone

Open the deployed URL and log in, then:

- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** menu → **Install app** / **Add to Home screen**

---

## 5. Project layout

```
app/
  login/                 Login page + login/logout server actions
  (shop)/                Everything behind login (shared nav layout)
    page.tsx             Dashboard
    sell/                POS screen + createSale action
    products/            List, detail (restock/adjust/archive), new, edit
    sales/               History, sale detail + returns, receipt
    customers/  expenses/  settings/  more/
  manifest.ts            PWA manifest
components/              Nav, modal/confirm dialog, bar chart, small UI pieces
lib/
  sheets/                ALL Google Sheets access (one module per tab + client.ts)
  auth/                  JWT session, AUTH_USERS parsing, rate limiting
  strings.ts             All UI text (add an Arabic dictionary here later)
  payment.ts             Checkout maths (shared by POS and server)
  dates.ts  format.ts  ids.ts  inventory.ts  reports.ts  receipt.ts
middleware.ts            Redirects to /login unless signed in
scripts/hash-password.mjs
```

### Conventions

- IDs look like `PREFIX-YYMMDD-XXXX` (for example `S-261013-K7QD`), using the Asia/Beirut date.
- Timestamps are ISO strings with the Beirut offset (`2026-10-13T14:05:09+03:00`). Expense dates are stored as `YYYY-MM-DD`.
- USD is the base currency. Each sale and expense stores the exchange rate used at that moment, so changing the rate never alters history. LBP amounts are rounded to `lbp_rounding` (default 5,000).
- When change is due, the cashier picks USD or LBP. The sale records the change in that currency (`change_usd` or `change_lbp`; the other stays 0).
- Profit = revenue (net of returns) − cost of items sold − expenses.

### Branding

Colours are CSS variables at the top of `app/globals.css` (`--color-accent`, `--color-bg`, …) and are exposed as Tailwind tokens (`bg-accent`, `text-muted`, …). Change them there when the final brand colours are ready. App icons are in `public/icons/` and `public/apple-touch-icon.png`, and the manifest colours are in `app/manifest.ts`.
