import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ intentId: string }> }
) {
  try {
    const { intentId } = await params;

    const payment = await prisma.payment.findUnique({
      where: { networkIntentId: intentId }
    });

    if (!payment) {
      return NextResponse.json({ error: 'NovaPay payment intent not found.' }, { status: 404 });
    }

    return NextResponse.json({
      intentId: payment.networkIntentId,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      reference: payment.networkReference || null,
      paidAt: payment.paidAt || null
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not read NovaPay payment status.' }, { status: 500 });
  }
}
