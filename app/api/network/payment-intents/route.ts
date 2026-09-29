import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertNetworkReady, newNetworkIntentId, novaNetworkId } from '@/lib/nova-network';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    assertNetworkReady();

    const body = await req.json();
    const linkId = String(body.linkId || '').trim();
    const customerEmail = String(body.email || '').trim();

    if (!linkId) {
      return NextResponse.json({ error: 'Payment link is required.' }, { status: 400 });
    }

    const link = await prisma.paymentLink.findUnique({ where: { id: linkId } });

    if (!link) {
      return NextResponse.json({ error: 'Payment link not found.' }, { status: 404 });
    }

    if (link.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'This payment link is inactive.' }, { status: 409 });
    }

    if (customerEmail.length > 254) {
      return NextResponse.json({ error: 'Customer email is too long.' }, { status: 400 });
    }

    const intentId = newNetworkIntentId();

    const payment = await prisma.payment.create({
      data: {
        linkId: link.id,
        amount: link.amount,
        currency: link.currency,
        status: 'PROCESSING',
        customerEmail,
        networkIntentId: intentId
      }
    });

    await prisma.webhookEvent.create({
      data: {
        paymentId: payment.id,
        type: 'payment.intent.created',
        payload: {
          network: novaNetworkId,
          intentId,
          amount: payment.amount,
          currency: payment.currency
        }
      }
    });

    return NextResponse.json({
      intentId,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      network: novaNetworkId
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Could not create NovaPay payment intent.';
    const status = message.includes('not authorized') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
