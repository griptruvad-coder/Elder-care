# ApnaSa — care that feels like family

Website + backend for ApnaSa, a daily companionship service for elderly parents.

- **Website**: warm, animated, Indian-first landing page and info pages (`public/`)
- **Accounts**: email + password and Google login, three roles
  - **Family** — add parents, buy a monthly plan, read daily visit notes
  - **Companion** — see assigned parents, write visit notes (mood, activities, medicines)
  - **Admin** — enquiries, assign companions, manage people and roles, see payments
- **Payments**: Razorpay monthly subscriptions (UPI / card / netbanking auto-pay) with webhook sync
- **Database**: PostgreSQL (tables are created automatically on start)

Stack: Node 20+, Express 5, PostgreSQL, plain HTML/CSS/JS frontend (no build step).

## Run locally

```bash
npm install
cp .env.example .env          # then edit values; at least DATABASE_URL
export $(grep -v '^#' .env | xargs)
npm start                     # http://localhost:3000
```

Tests (need a throwaway Postgres database — the tests wipe it):

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/apnasa_test npm test
```

## Deploy on Render

1. Render → **New + → Blueprint** → select this repo. It creates the web service and a Postgres database from `render.yaml`.
2. When asked, fill `ADMIN_EMAILS` with the founder's email. Others can be left empty for now.
3. Open the site, **sign up with the founder's email** → that account is admin.

> ⚠️ The free Render database is deleted 30 days after creation. Upgrade it to a paid plan (Basic) before taking real customers.

### Turn on Google login
1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** → *Web application*.
2. **Authorized JavaScript origins**: your site URL, e.g. `https://apnasa.onrender.com` (and `http://localhost:3000` for local).
3. Copy the Client ID → Render env `GOOGLE_CLIENT_ID` → redeploy. The Google button appears on the login page.

### Turn on Razorpay payments (test mode first)
1. Razorpay Dashboard (Test mode) → Account & Settings → **API Keys** → generate. Put them in `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
2. Make sure **Subscriptions** is enabled on the Razorpay account.
3. Create the three plans once (locally or in Render Shell):
   `RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... npm run razorpay:plans` → copy the three `RAZORPAY_PLAN_*` lines into Render env.
4. Razorpay → **Webhooks** → add `https://YOUR-SITE/api/webhooks/razorpay`, choose a secret (→ `RAZORPAY_WEBHOOK_SECRET`), tick the `subscription.*` events.
5. Test with Razorpay test cards / UPI. For live: complete KYC, switch to Live keys, and run step 3 again with live keys.

### Day-to-day
- **Add a companion**: they sign up on the site → admin opens *Dashboard → People* → set role to `companion` → *Parents & companions* → assign.
- **Make someone admin**: add their email to `ADMIN_EMAILS`, or `npm run make-admin -- email@example.com`.

## Photos
Stock photos from Pexels (Pexels License) in `public/images/`. They do not show ApnaSa customers or staff. Swap them by replacing the files or editing `PH` in `public/app.js`.

## Not medical care
ApnaSa provides companionship and daily-life support — not nursing, medical treatment or emergency services. Keep the disclaimer on the site.
