# NovaPay

NovaPay is a merchant payment infrastructure project built with Next.js App Router, TypeScript, Prisma/PostgreSQL and optional Firebase sign-in.

The application is designed around a **NovaPay-owned payment protocol**. It contains no Razorpay SDK, Razorpay API calls, Stripe integration, PayPal integration, hosted third-party checkout, or third-party payment-provider credentials.

## Architecture

- NovaPay payment links
- NovaPay merchant API keys
- NovaPay payment intents
- NovaPay Network settlement confirmation protocol
- Signed network messages with timestamp replay protection
- PostgreSQL-backed transaction state
- Refund request and refund-settlement states
- Network event/audit records
- Ledger-account and ledger-entry primitives for future production settlement accounting
- Optional Firebase authentication UI

## Important

This repository does **not** pretend that a database update equals a real bank settlement.

The checkout can create a live payment intent only when the NovaPay Network is explicitly configured as authorized. A payment is marked successful only after an authenticated NovaPay Network settlement confirmation reaches the server.

There is no fake success button and no simulated payment outcome.

For India, operating a payment system requires the applicable Reserve Bank of India authorization, and the exact activity must be assessed under the Payment and Settlement Systems Act and current RBI directions. Banking and settlement arrangements are also required for real INR movement. Obtain specialist legal/compliance advice before enabling live money movement.

## Environment

Copy `.env.example` to `.env.local`.

Required:

- `DATABASE_URL`

NovaPay Network server configuration:

- `NOVAPAY_NETWORK_ID`
- `NOVAPAY_NETWORK_STATUS`
- `NOVAPAY_NETWORK_SHARED_SECRET`

Set `NOVAPAY_NETWORK_STATUS=AUTHORIZED` only after NovaPay has the legal, regulatory, banking and operational authority to perform the intended live settlement activity.

Never expose `NOVAPAY_NETWORK_SHARED_SECRET` to the browser or use a `NEXT_PUBLIC_` prefix.

Firebase variables are optional and are only used for the sign-in UI.

## Database

After updating `prisma/schema.prisma`, apply the SQL in:

`prisma/migrations/001_novapay_network.sql`

Do not reset or drop the production database.

The SQL is written to add the new NovaPay fields/tables without deleting existing records. Legacy provider columns can be removed later in a controlled migration after confirming that no historical data or reporting depends on them.

## Development

```sh
npm install
cp .env.example .env.local
npx prisma generate
npm run dev
```

Open `http://localhost:3000`.

## NovaPay API

Create an API key from the Developers section. The secret is shown once and stored only as a SHA-256 hash.

Example:

```sh
curl -X POST https://YOUR-NOVAPAY-DOMAIN/api/v1/payment-links \
  -H "Authorization: Bearer np_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Order #123","amount":499}'
```

Amounts are supplied in INR rupees to the merchant API and stored internally in paise.

## Network settlement protocol

A NovaPay Network settlement participant confirms a payment by sending the exact JSON body to:

`POST /api/network/settlements/confirm`

Required headers:

- `x-novapay-timestamp`: Unix timestamp in milliseconds
- `x-novapay-signature`: HMAC-SHA256 of `timestamp + "." + rawBody` using the NovaPay Network shared secret

Example payload:

```json
{
  "intentId": "npi_...",
  "reference": "NOVA-SETTLEMENT-...",
  "amount": 49900,
  "currency": "INR",
  "status": "SETTLED"
}
```

NovaPay accepts only recent, correctly signed messages and checks amount/currency against the original payment intent. Repeated confirmations are idempotent.

The refund endpoint uses the same authenticated protocol at:

`POST /api/network/refunds`

## Production security work still required

Before public live use, NovaPay still needs server-side merchant authorization, customer identity controls appropriate to the model, rate limiting, origin/CSRF controls, fraud/risk controls, proper key management, secrets rotation, reconciliation, dispute handling, audit retention, backups, disaster recovery, monitoring, penetration testing, independent security review, and the required regulatory/banking controls.

This repository is the software foundation for that work; it is not itself an RBI authorization or a bank/settlement membership.