'use client';

import { useState } from 'react';

export default function Checkout({
  link
}: {
  link: {
    id: string;
    title: string;
    description: string;
    amount: number;
    currency: string;
    status: string;
  };
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('');
  const [busy, setBusy] = useState(false);
  const [intentId, setIntentId] = useState('');

  async function pay() {
    if (busy || link.status !== 'ACTIVE') return;

    setBusy(true);
    setState('');

    try {
      const response = await fetch('/api/network/payment-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId: link.id, email })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'NovaPay Network cannot accept this payment yet.');
      }

      setIntentId(result.intentId);
      setState('PROCESSING');

      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const statusResponse = await fetch(
          '/api/network/payment-intents/' + encodeURIComponent(result.intentId),
          { cache: 'no-store' }
        );

        const statusResult = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(statusResult.error || 'Could not read payment status.');
        }

        if (statusResult.status === 'SUCCEEDED') {
          setState('SUCCESS');
          setBusy(false);
          return;
        }

        if (statusResult.status === 'FAILED') {
          setState('FAILED');
          setBusy(false);
          return;
        }
      }

      setState('WAITING');
    } catch (error) {
      setState(error instanceof Error ? error.message : 'Could not start NovaPay payment.');
    } finally {
      setBusy(false);
    }
  }

  const formattedAmount =
    '₹' +
    (link.amount / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2
    });

  return (
    <main className="checkoutPage">
      <section className="checkoutCard">
        <div className="checkoutBrand">
          <span className="checkoutLogo">N</span>
          <b>NovaPay</b>
          <small>NOVAPAY NETWORK</small>
        </div>

        <div className="merchant">Payment through NovaPay Network</div>

        <h1>{link.title}</h1>
        {link.description && (
          <p className="checkoutDesc">{link.description}</p>
        )}

        <div className="checkoutAmount">{formattedAmount}</div>

        {state === 'SUCCESS' ? (
          <div className="result successResult">
            <div className="resultMark">✓</div>
            <b>Payment successful</b>
            <p>Your payment was confirmed by NovaPay Network.</p>
            {intentId && <code className="networkRef">{intentId}</code>}
          </div>
        ) : (
          <>
            <div className="checkoutLabel">
              Customer email <span>optional</span>
            </div>

            <input
              className="checkoutInput"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              disabled={busy}
            />

            {state && state !== 'PROCESSING' && (
              <div
                className={
                  state === 'WAITING'
                    ? 'notice'
                    : state === 'FAILED'
                      ? 'payError'
                      : 'payError'
                }
              >
                {state === 'WAITING'
                  ? 'NovaPay created the payment intent, but a network settlement confirmation has not arrived yet.'
                  : state === 'FAILED'
                    ? 'NovaPay Network reported that the payment was not settled.'
                    : state}
              </div>
            )}

            {state === 'PROCESSING' && (
              <div className="notice">
                Payment intent created. Waiting for NovaPay Network settlement
                confirmation…
              </div>
            )}

            {!busy && state !== 'WAITING' && (
              <button
                disabled={link.status !== 'ACTIVE'}
                onClick={pay}
                className="checkoutPrimary"
              >
                {link.status === 'ACTIVE'
                  ? 'Pay with NovaPay Network'
                  : 'Payment link inactive'}
              </button>
            )}

            {state === 'WAITING' && (
              <button
                className="checkoutPrimary"
                onClick={() => window.location.reload()}
              >
                Check again
              </button>
            )}

            <div className="providerNote">
              NovaPay does not embed a third-party checkout. Settlement is
              accepted only from the authenticated NovaPay Network protocol.
            </div>
          </>
        )}

        <div className="secure">🔒 NovaPay Network · {formattedAmount}</div>
      </section>
    </main>
  );
}
