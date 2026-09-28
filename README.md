# NovaPay MVP v0.1
A test-mode-only merchant payment dashboard built with Next.js App Router, TypeScript, Prisma/PostgreSQL and optional Firebase Google sign-in. It does not connect to banks, UPI, card networks, or payment processors and cannot move real money.

## Included
- Responsive merchant dashboard, payment links, hosted simulated checkout
- Success / pending / failure test outcomes, transaction list, simulated refunds
- Test API-key creation/revocation (display-only; not yet accepted by an API)
- Webhook event simulator (records events in DB; does not deliver HTTP callbacks)
- Optional Firebase Google sign-in UI

## Requirements
Node.js 20.9+ (Node 22 LTS recommended), npm, and a PostgreSQL database. You can develop on Android with Termux. PostgreSQL itself is easiest to host using a free-tier managed PostgreSQL provider; do not expose database credentials in client code.

## Termux setup
1. Install Termux from a trusted source, then run:
```sh
pkg update -y && pkg upgrade -y
pkg install nodejs-lts git -y
node -v
npm -v
```
2. Extract this project, `cd` into `novapay-mvp`, and install:
```sh
npm install
cp .env.example .env.local
```
3. Create a PostgreSQL database with a provider of your choice and paste its connection URL into `DATABASE_URL` in `.env.local`. For local-only UI work, a database is still needed for dashboard data.
4. Initialize tables and start the app:
```sh
npx prisma generate
npx prisma db push
npm run dev
```
Open `http://localhost:3000` on the phone. `npm run dev` binds to `0.0.0.0` for device/LAN access.

Optional sample link:
```sh
npm run db:seed
```

## Firebase (optional)
Create a Firebase project, enable Google provider in Authentication, register a Web app, then copy the API key, Auth domain, Project ID, and App ID into `.env.local` as `NEXT_PUBLIC_FIREBASE_*`. Restart the dev server. Without Firebase config the app operates as a local demo workspace. This MVP currently uses Firebase only for client-side Google sign-in UI; it does not enforce identity on API routes. Do not expose it publicly with real merchant data until server-side Firebase token verification and authorization are implemented.

## Deploy
- Push the project to GitHub.
- Deploy the repository to Vercel using the Next.js preset.
- Add `DATABASE_URL` and `NEXT_PUBLIC_APP_URL` to Vercel environment variables; add Firebase public config if used.
- Ensure Prisma client generation runs during build (the package build script does this). Run `npx prisma db push` against the production database from a trusted local environment before first use, or use a controlled migration workflow.
- Deploy only as a private test/demo until authentication, authorization, rate limiting, CSRF/origin controls, secret handling, auditability, backups, and security review are complete.

## Safety / limitations
- All payment outcomes are simulated. No real payments, refunds, settlement, payment processor integration, or external webhook delivery occur.
- The dashboard's test API keys are generated and stored as hashes, but API-key authentication is not implemented. The newly generated secret is shown once in the browser.
- API routes are demo routes without production authentication or rate limiting. Do not use with sensitive or real customer data.
- For live payment activity in India, obtain legal advice about the exact funds flow and use an appropriately authorized provider/contractual arrangement. This software is not a payment gateway or payment aggregator.
