# Miss Elanor — Shop Manager

A private web app for **Miss Elanor**, a small clothing shop in Lebanon. It covers point of sale, stock, sales history and returns, customers, expenses and a dashboard. Data lives in a **Supabase** (Postgres) database. Payments are cash only, in USD and/or LBP.

- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth, via `@supabase/ssr`) · `zod` validation
- **Users:** only Supabase accounts listed in the `staff` table. Sign-ups are turned off in Supabase; there is no sign-up page.
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

### Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, e.g. `https://zqissqafqrwugcuhesge.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The project's **publishable** key (`sb_publishable_…`) |

Both values are safe in the browser: data is protected by login and Row Level Security, not by hiding the key. **Never** put the `service_role` / secret key in this app or in Vercel.

---

## 2. Database (Supabase)

The full schema is in [`supabase/schema.sql`](supabase/schema.sql) and is already applied to the live project. To set up a fresh project, run that file once in the Supabase SQL editor.

| Table | Purpose |
| --- | --- |
| `products`, `variants` | Catalogue; stock is held per size/color in `variants.quantity` |
| `sales`, `sale_items` | One row per sale and one per sale line |
| `customers`, `expenses` | As named |
| `stock_movements` | Audit trail of every stock change: restock / sale / return / adjustment |
| `settings` | `shop_name`, `exchange_rate_lbp_per_usd`, `low_stock_default`, `lbp_rounding` |
| `lists` | Dropdown values (`categories`, `sizes`, `colors`, `expense_categories`); `sort_order` sets the order shown in the app |
| `staff` | Which Supabase accounts may use the app, and the name shown as "Sold by" |

Notes:

- Edit dropdown lists and settings in **Supabase → Table Editor** (Settings in the app links there).
- Every multi-step write runs inside one Postgres function — `record_sale`, `apply_return`, `change_stock`, `create_product`, `save_product` — so it either fully succeeds or changes nothing.
- Stock can never go below zero: the database re-checks it inside the same transaction, so two phones selling the last item at the same time cannot oversell.
- Row Level Security is on for every table. Only signed-in users listed in `staff` can read or write; everyone else gets nothing.

---

## 3. Users

1. Supabase → **Authentication → Users → Add user**: enter email and password and tick **Auto Confirm User**.
2. Add the person to the staff list (SQL editor):
   ```sql
   insert into public.staff (user_id, display_name)
   select id, 'Name shown in the app' from auth.users where email = 'person@example.com';
   ```
3. Keep **Authentication → Sign In / Providers → Allow new users to sign up** turned off.

To remove someone, delete their row in `staff` (or the user in Authentication). Passwords are changed in Authentication → Users.

### Forgot password

**Currently switched off** (`PASSWORD_RESET_EMAIL_ENABLED` in `lib/features.ts`) until custom SMTP is set up; set it to `true` after step 3 below. When on, the login page has a **Forgot password?** link. It emails a reset link; the link opens `/auth/confirm`, which signs the person in and sends them to `/reset-password` to choose a new password. Signed-in staff can also change their password in **Settings**.

One-time setup in Supabase:

1. **Authentication → URL Configuration**: set **Site URL** to the live address of the app, and add `https://<live address>/**` under **Redirect URLs**.
2. **Authentication → Emails → Reset password**: paste [`supabase/templates/reset-password.html`](supabase/templates/reset-password.html) as the message body. Its link works on any device; the default template only works when the email is opened in the same browser that asked for it.
3. **Authentication → Emails → SMTP Settings**: turn on custom SMTP. Supabase's built-in sender only delivers to members of the Supabase organization, so without this, staff never receive the email. A Gmail account with an app password works: host `smtp.gmail.com`, port `587`, username = the Gmail address, password = the 16-character app password.

Sessions are handled by Supabase Auth (cookies refreshed by `middleware.ts`). After 5 wrong passwords for an email the app blocks it for 15 minutes (in server memory), on top of Supabase's own rate limits.

---

## 4. Deploying to Vercel

1. Import the GitHub repository in Vercel (framework: Next.js, defaults are fine).
2. **Settings → Environment Variables**: add the two variables above for Production, Preview and Development. Vercel may warn about the `NEXT_PUBLIC_` prefix; choose **Config** — these values are meant to be public.
3. Deploy. Changing environment variables later needs a redeploy (**Deployments → … → Redeploy**).

### Installing on a phone

Open the deployed URL and log in, then:

- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** menu → **Install app** / **Add to Home screen**

---

## 5. Project layout

```
app/
  login/                 Login page + login/logout server actions (Supabase Auth)
  forgot-password/       Request a password-reset email
  auth/confirm/          Landing route for links in Supabase emails
  reset-password/        Choose a new password after following the email link
  (shop)/                Everything behind login (shared nav layout)
    page.tsx             Dashboard
    sell/                POS screen + createSale action
    products/            List, detail (restock/adjust/archive), new, edit
    sales/               History, sale detail + returns, receipt
    customers/  expenses/  settings/  more/
  manifest.ts            PWA manifest
components/              Nav, modal/confirm dialog, bar chart, small UI pieces
lib/
  db/                    ALL database access (one module per table + client.ts)
  supabase/              Supabase clients for server code and middleware
  auth/                  Current staff member, login rate limiting
  strings.ts             All UI text (add an Arabic dictionary here later)
  payment.ts             Checkout maths (shared by POS and server)
  dates.ts  format.ts  ids.ts  inventory.ts  reports.ts  receipt.ts
middleware.ts            Refreshes the session; redirects to /login unless signed in
supabase/schema.sql      Full database schema, policies and functions
```

### QR labels and scanning

- **Products → Labels** (all products) or **Print QR labels** on a product page opens `/labels`: choose how many labels per size, optionally skip labels already used on a sheet, then print on A4 sticker sheets of 24 (3 × 8, 70 × 37 mm). Print at 100% scale with no margins.
- Each QR holds a link to `/v/<variant_id>`, so a normal phone camera opens that product in the app (after sign-in).
- **Sell → Scan** uses the phone camera (`jsqr`) to add one piece of the scanned size/colour to the cart; it refuses to go over stock. **Products → Scan** jumps to the scanned product.

### Conventions

- IDs look like `PREFIX-YYMMDD-XXXX` (for example `S-261013-K7QD`), using the Asia/Beirut date.
- Timestamps are stored as `timestamptz` and shown in Beirut time; the app converts them to ISO strings with the Beirut offset (`2026-10-13T14:05:09+03:00`). Expense dates are plain dates (`YYYY-MM-DD`).
- USD is the base currency. Each sale and expense stores the exchange rate used at that moment, so changing the rate never alters history. LBP amounts are rounded to `lbp_rounding` (default 5,000).
- When change is due, the cashier picks USD or LBP. The sale records the change in that currency (`change_usd` or `change_lbp`; the other stays 0).
- Profit = revenue (net of returns) − cost of items sold − expenses.

### Branding

Colours are CSS variables at the top of `app/globals.css` (a light set and a matching dark set; users pick Light / Dark / Automatic in Settings or More) (`--color-accent`, `--color-bg`, …) and are exposed as Tailwind tokens (`bg-accent`, `text-muted`, …). Change them there when the final brand colours are ready. App icons are in `public/icons/` and `public/apple-touch-icon.png`, and the manifest colours are in `app/manifest.ts`.
