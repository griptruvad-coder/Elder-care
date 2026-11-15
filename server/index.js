const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const db = require('./db');
const { loadUser } = require('./lib/auth');
const rzp = require('./lib/razorpay');
const authRoutes = require('./routes/auth');
const familyRoutes = require('./routes/family');
const payments = require('./routes/payments');
const companion = require('./routes/companion');
const adminRoutes = require('./routes/admin');

const app = express();
app.set('trust proxy', 1); // Render sits behind a proxy; needed for correct IPs (rate limits) and secure cookies.
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://checkout.razorpay.com', 'https://*.razorpay.com', 'https://accounts.google.com/gsi/client'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com/gsi/style'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://*.razorpay.com', 'https://accounts.google.com/gsi/'],
      frameSrc: ['https://*.razorpay.com', 'https://accounts.google.com/gsi/'],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.isProd ? [] : null
    }
  },
  // Google Sign-In popups need this relaxed from the default.
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

// Razorpay webhook needs the raw body for signature checks, so it is mounted before express.json().
app.post('/api/webhooks/razorpay', express.raw({ type: '*/*', limit: '1mb' }), payments.webhook);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(loadUser);

// General API rate limit (per IP).
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/enquiries', rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, message: { error: 'Too many enquiries from here. Please call or WhatsApp us instead.' } }));

app.get('/api/health', async (_req, res) => {
  await db.query('SELECT 1');
  res.json({ ok: true });
});

// Public settings the browser needs (no secrets here).
app.get('/api/config', (_req, res) => res.json({
  googleClientId: config.googleClientId || null,
  paymentsEnabled: rzp.configured(),
  whatsappNumber: config.whatsappNumber || null,
  activities: companion.ACTIVITIES
}));

app.use('/api/auth', authRoutes);
app.use('/api', familyRoutes);
app.use('/api', payments.router);
app.use('/api', companion.router);
app.use('/api', adminRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Website (static files). index.html is never cached so new deploys show up immediately.
const pub = path.join(__dirname, '..', 'public');
app.use(express.static(pub, {
  maxAge: config.isProd ? '7d' : 0,
  setHeaders: (res, file) => { if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); }
}));
app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(pub, 'index.html')));

// Errors: log the details, show the user a plain message.
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: status >= 500 && status !== 502 && status !== 503 ? 'Something went wrong. Please try again.' : err.message });
});

async function start() {
  await db.migrate();
  app.listen(config.port, () => console.log(`ApnaSa running on http://localhost:${config.port}`));
}

if (require.main === module) start().catch(err => { console.error('Failed to start:', err); process.exit(1); });

module.exports = { app, start };
