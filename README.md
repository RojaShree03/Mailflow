# MailFlow — Bulk Email Management Platform

A MERN application starter for consent-based email campaigns. Frontend: React/Vite/Zustand. Backend: Node.js/Express/Mongoose. Email: Nodemailer over SMTP.

## Implemented

- One-time initial administrator setup, login/logout and protected API routes.
- Password hashing with bcrypt and JWT in an HttpOnly cookie.
- React dashboard, campaign composer, recipient manager, CSV import, campaign history/detail logs, analytics and settings screens.
- Per-recipient email sending (addresses are not exposed to other recipients).
- MongoDB persistence for administrators, recipients, campaigns and individual email logs.
- Recipient soft-delete, restore and permanent deletion.
- Server-side Zod validation, Helmet, CORS allow-list, request rate limits, centralized errors and bounded JSON request size.
- Vercel configuration for separately deployed frontend and backend.

## Requirements

- Node.js 20+
- MongoDB local instance or MongoDB Atlas
- SMTP credentials from an email provider that permits your intended sending volume

## Run locally

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with MongoDB, a unique JWT_SECRET (32+ random characters), and SMTP credentials
npm install
npm run dev
```

Backend runs at `http://localhost:5000`. Check `http://localhost:5000/api/health`.

### 2. Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. The first-time sign-in screen has a **Check initial setup** action. If no admin exists, it opens the one-time account setup form. Use a strong password of at least 10 characters. Once an admin exists, the backend permanently closes the public setup endpoint.

## Environment variables

Backend (`backend/.env`):

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` locally; `production` in deployment |
| `PORT` | Local API port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long, random secret; never commit it |
| `CLIENT_ORIGIN` | Exact frontend origin; comma-separated allow-list if needed |
| `COOKIE_SAME_SITE` | Usually `lax` locally; cross-site production deployment may require `none` |
| `SMTP_HOST`, `SMTP_PORT` | SMTP server and port |
| `SMTP_SECURE` | `true` for implicit TLS (commonly port 465); otherwise `false` (commonly port 587 with STARTTLS) |
| `SMTP_USER`, `SMTP_PASS` | SMTP credentials |
| `MAIL_FROM` | Verified sender identity accepted by your provider |
| `MAX_CAMPAIGN_RECIPIENTS` | Per-campaign upper bound (default 250) |

Frontend (`frontend/.env`): `VITE_API_URL` should be the backend API base URL, including `/api`.

## Vercel deployment (two projects)

This repository is intentionally configured as two Vercel projects because the frontend and API have different build/runtime requirements.

1. Push this folder to a Git repository.
2. Create a Vercel project with **Root Directory = `frontend`**. Set `VITE_API_URL` to `https://YOUR-BACKEND.vercel.app/api`. Deploy.
3. Create a second Vercel project from the same repository with **Root Directory = `backend`**. Deploy the Express function.
4. In backend project environment variables, set `MONGODB_URI`, `JWT_SECRET`, SMTP variables, `MAIL_FROM`, `NODE_ENV=production`, `CLIENT_ORIGIN=https://YOUR-FRONTEND.vercel.app`, and `COOKIE_SAME_SITE=none` if frontend/API are on different sites.
5. Redeploy after setting environment variables.
6. Confirm `/api/health`, create the initial admin, then test login and sending to an address you control.

For cross-site cookie authentication, HTTPS is required and browsers must allow third-party cookies. For a more reliable production setup, use custom frontend/API subdomains under the same registrable domain (for example `app.example.com` and `api.example.com`) and configure `SameSite=Lax` where applicable. Keep CORS origin exact; do not use `*` with credentials.

## Important operational limitations

- The campaign endpoint sends one email at a time and waits for each SMTP response. This protects recipient privacy and produces per-recipient logs, but it is deliberately intended for small, bounded campaigns. Serverless request duration can be exceeded by larger campaigns. For real bulk volume, move sending to a durable queue/worker (for example BullMQ + Redis or a managed queue) and return a campaign job ID immediately.
- A successful SMTP response is recorded as **accepted**, not delivered. Inbox delivery, bounces and complaints require provider webhooks and are not implemented in this starter. Do not interpret accepted count as inbox delivery rate.
- The app only sends to recipients present in the active recipient collection with `subscribed: true`. Obtain and retain appropriate consent, identify the sender, and honor unsubscribe requests before using the app with real audiences. The current starter includes subscription state but does not yet provide a public unsubscribe endpoint or provider webhook.
- The initial setup endpoint is intentionally open only while there are zero admins. Protect the deployment URL during first setup and create the admin immediately.
- Vercel function duration, region, cookie behavior and SMTP provider restrictions depend on your Vercel plan and provider. Verify these against your actual account before production use.

## Tests and checks

Backend unit tests:

```bash
cd backend
npm test
```

Frontend production build:

```bash
cd frontend
npm run build
```

These checks do not replace end-to-end testing with your MongoDB and SMTP accounts.

## API overview

- `GET /api/health`
- `GET /api/auth/setup-status`
- `POST /api/auth/setup`
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/POST /api/recipients`, `POST /api/recipients/import`
- `PATCH /api/recipients/:id`, `DELETE /api/recipients/:id`
- `POST /api/recipients/:id/restore`, `DELETE /api/recipients/:id/permanent`
- `GET/POST /api/campaigns`, `GET /api/campaigns/:id`
- `GET /api/dashboard/stats`, `GET /api/dashboard/analytics`

All recipient, campaign and dashboard routes require an authenticated admin session.
