import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

const networkId = process.env.NOVAPAY_NETWORK_ID || 'novapay-in';
const networkStatus = process.env.NOVAPAY_NETWORK_STATUS || 'NOT_AUTHORIZED';
const sharedSecret = process.env.NOVAPAY_NETWORK_SHARED_SECRET || '';

export const novaNetworkId = networkId;
export const novaNetworkAuthorized = networkStatus === 'AUTHORIZED';
export const novaNetworkConfigured = Boolean(networkId && sharedSecret);

export function newNetworkIntentId() {
  return `npi_${randomUUID().replace(/-/g, '')}`;
}

export function isNetworkReady() {
  return novaNetworkConfigured && novaNetworkAuthorized;
}

function safeEqual(expected: string, actual: string) {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(actual, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signNetworkPayload(timestamp: string, rawBody: string) {
  if (!sharedSecret) throw new Error('NovaPay network shared secret is not configured.');
  return createHmac('sha256', sharedSecret)
    .update(timestamp + '.' + rawBody)
    .digest('hex');
}

export function verifyNetworkSignature(timestamp: string, rawBody: string, signature: string) {
  if (!sharedSecret || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isSafeInteger(ts)) return false;
  if (Math.abs(Date.now() - ts) > 5 * 60 * 1000) return false;

  return safeEqual(signNetworkPayload(timestamp, rawBody), signature);
}

export function assertNetworkReady() {
  if (!isNetworkReady()) {
    throw new Error('NovaPay Network is not authorized for live settlement yet.');
  }
}
