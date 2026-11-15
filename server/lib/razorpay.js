// Minimal Razorpay client (REST API + signature checks). Docs: https://razorpay.com/docs/api/payments/subscriptions/
const crypto = require('crypto');
const { razorpay } = require('../config');

const configured = () => !!(razorpay.keyId && razorpay.keySecret);

async function api(method, path, body) {
  const auth = Buffer.from(`${razorpay.keyId}:${razorpay.keySecret}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.description || `Razorpay error ${res.status}`);
    err.status = 502;
    throw err;
  }
  return data;
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const hmac = (secret, text) => crypto.createHmac('sha256', secret).update(text).digest('hex');

// Checkout success handler signature: HMAC_SHA256(payment_id + "|" + subscription_id, key_secret)
const verifyCheckout = ({ paymentId, subscriptionId, signature }, secret = razorpay.keySecret) =>
  !!secret && safeEqual(hmac(secret, `${paymentId}|${subscriptionId}`), signature);

// Webhook signature: HMAC_SHA256(raw request body, webhook_secret)
const verifyWebhook = (rawBody, signature, secret = razorpay.webhookSecret) =>
  !!secret && !!signature && safeEqual(hmac(secret, rawBody), signature);

module.exports = { configured, api, verifyCheckout, verifyWebhook, hmac };
