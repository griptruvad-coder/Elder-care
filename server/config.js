// All settings come from environment variables (set them in Render → Environment).
const env = process.env;

const isProd = env.NODE_ENV === 'production';

if (isProd && !env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. In Render → Environment, add DATABASE_URL = your database\'s Internal Database URL.');
}
if (isProd && (!env.JWT_SECRET || env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be set (at least 32 characters) in production.');
}

const PLANS = {
  basic:         { name: 'Basic',         amountPaise: 599900,  envPlanId: 'RAZORPAY_PLAN_BASIC' },
  premium:       { name: 'Premium',       amountPaise: 799900,  envPlanId: 'RAZORPAY_PLAN_PREMIUM' },
  super_premium: { name: 'Super Premium', amountPaise: 1199900, envPlanId: 'RAZORPAY_PLAN_SUPER_PREMIUM' }
};

module.exports = {
  isProd,
  port: Number(env.PORT) || 3000,
  databaseUrl: env.DATABASE_URL || 'postgres://apnasa:apnasa@localhost:5432/apnasa',
  jwtSecret: env.JWT_SECRET || 'dev-only-secret-change-me-dev-only-secret',
  // Comma-separated emails that become admin automatically when they sign up / log in.
  adminEmails: (env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
  googleClientId: env.GOOGLE_CLIENT_ID || '',
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID || '',
    keySecret: env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || '',
    // How many monthly charges a subscription runs for before it needs renewing.
    totalCount: Number(env.RAZORPAY_TOTAL_COUNT) || 60
  },
  whatsappNumber: env.WHATSAPP_NUMBER || '',
  PLANS,
  planId: key => env[PLANS[key].envPlanId] || ''
};
