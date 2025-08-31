import CryptoJS from 'crypto-js';

function makeId(length = 80): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateTranzilaHeaders(): Record<string, string> {
  const time = Math.round(Date.now() / 1000);
  const nonce = makeId();
  const publicKey = import.meta.env.VITE_TRANZILA_PUBLIC_KEY;
  const privateKey = import.meta.env.VITE_TRANZILA_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error('Tranzila keys are not configured');
  }

  const hash = CryptoJS.HmacSHA256(publicKey, privateKey + time + nonce).toString(CryptoJS.enc.Hex);

  return {
    'Content-Type': 'application/json',
    'X-tranzila-api-app-key': publicKey,
    'X-tranzila-api-request-time': time.toString(),
    'X-tranzila-api-nonce': nonce,
    'X-tranzila-api-access-token': hash,
  };
}

