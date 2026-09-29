import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [links, payments, keys, events] = await Promise.all([
      prisma.paymentLink.findMany({ include: { payments: true }, orderBy: { createdAt: 'desc' } }),
      prisma.payment.findMany({ include: { link: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.webhookEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })
    ]);

    return NextResponse.json({
      network: {
        id: process.env.NOVAPAY_NETWORK_ID || 'novapay-in',
        status: process.env.NOVAPAY_NETWORK_STATUS || 'NOT_AUTHORIZED',
        name: 'NovaPay Network'
      },
      links,
      payments,
      keys: keys.map(k => ({ ...k, secretHash: undefined })),
      events
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database unavailable. Check DATABASE_URL.' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === 'createLink') {
      const title = String(body.title || '').trim();
      const amount = Math.round(Number(body.amount) * 100);

      if (!title || !Number.isInteger(amount) || amount < 100 || amount > 100000000) {
        return NextResponse.json({ error: 'Enter a title and amount between ₹1 and ₹1,000,000.' }, { status: 400 });
      }

      const link = await prisma.paymentLink.create({
        data: {
          title,
          description: String(body.description || '').trim(),
          amount
        }
      });

      return NextResponse.json({ link });
    }

    if (body.action === 'deactivateLink') {
      const link = await prisma.paymentLink.update({
        where: { id: String(body.id || '') },
        data: { status: 'INACTIVE' }
      });

      return NextResponse.json({ link });
    }

    if (body.action === 'refund') {
      const paymentId = String(body.paymentId || '');
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

      if (!payment || payment.status !== 'SUCCEEDED') {
        return NextResponse.json(
          { error: 'Only a successful NovaPay payment can have a refund requested.' },
          { status: 400 }
        );
      }

      if (payment.refundRequestedAt || payment.refundedAt) {
        return NextResponse.json(
          { error: 'A refund has already been requested or completed.' },
          { status: 409 }
        );
      }

      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REFUND_REQUESTED',
          refundRequestedAt: new Date()
        }
      });

      await prisma.webhookEvent.create({
        data: {
          paymentId: payment.id,
          type: 'refund.requested',
          payload: {
            network: 'NovaPay Network',
            paymentId: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            requestedAt: updated.refundRequestedAt?.toISOString()
          },
          delivered: false
        }
      });

      return NextResponse.json(
        { payment: updated, message: 'Refund request recorded for NovaPay Network settlement.' },
        { status: 202 }
      );
    }

    if (body.action === 'apiKey') {
      const secret = 'np_' + randomBytes(32).toString('hex');

      const key = await prisma.apiKey.create({
        data: {
          label: String(body.label || 'NovaPay API key').trim().slice(0, 80) || 'NovaPay API key',
          prefix: secret.slice(0, 11),
          secretHash: createHash('sha256').update(secret).digest('hex')
        }
      });

      return NextResponse.json({
        key: { id: key.id, label: key.label, prefix: key.prefix },
        secret
      });
    }

    if (body.action === 'revokeKey') {
      await prisma.apiKey.update({
        where: { id: String(body.id || '') },
        data: { revoked: true }
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Request failed.' },
      { status: 500 }
    );
  }
}
