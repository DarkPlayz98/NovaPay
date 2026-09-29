import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyNetworkSignature } from '@/lib/nova-network';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const timestamp = req.headers.get('x-novapay-timestamp') || '';
  const signature = req.headers.get('x-novapay-signature') || '';
  const rawBody = await req.text();

  if (!verifyNetworkSignature(timestamp, rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid NovaPay Network signature.' }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);
    const intentId = String(body.intentId || '');
    const reference = String(body.reference || '');
    const amount = Number(body.amount);
    const currency = String(body.currency || '');
    const status = String(body.status || '');

    if (!intentId || !reference || !Number.isSafeInteger(amount) || amount <= 0 || currency !== 'INR' || status !== 'SETTLED') {
      return NextResponse.json({ error: 'Invalid settlement payload.' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { networkIntentId: intentId }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment intent not found.' }, { status: 404 });
    }

    if (payment.amount !== amount || payment.currency !== currency) {
      return NextResponse.json({ error: 'Settlement amount or currency does not match the payment intent.' }, { status: 409 });
    }

    if (payment.status === 'SUCCEEDED') {
      return NextResponse.json({
        ok: true,
        idempotent: true,
        status: payment.status,
        reference: payment.networkReference
      });
    }

    if (!['PROCESSING', 'PENDING'].includes(payment.status)) {
      return NextResponse.json({ error: 'Payment is not eligible for settlement.' }, { status: 409 });
    }

    const now = new Date();

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCEEDED',
          paidAt: now,
          networkReference: reference,
          networkSignature: signature
        }
      });

      await tx.webhookEvent.create({
        data: {
          paymentId: payment.id,
          type: 'payment.settled',
          payload: {
            intentId,
            reference,
            amount,
            currency,
            status: 'SETTLED'
          },
          delivered: true
        }
      });

      return result;
    });

    return NextResponse.json({
      ok: true,
      status: updated.status,
      paymentId: updated.id,
      intentId,
      reference
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Settlement confirmation failed.' }, { status: 500 });
  }
}
