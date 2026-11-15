// Creates the three monthly plans in your Razorpay account and prints the plan IDs
// to paste into Render → Environment. Run once per mode (test keys, then live keys).
// Usage: RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... npm run razorpay:plans
const { PLANS } = require('../server/config');
const rzp = require('../server/lib/razorpay');

(async () => {
  if (!rzp.configured()) { console.error('Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET first.'); process.exit(1); }
  for (const [key, p] of Object.entries(PLANS)) {
    const plan = await rzp.api('POST', '/plans', {
      period: 'monthly', interval: 1,
      item: { name: `ApnaSa ${p.name}`, amount: p.amountPaise, currency: 'INR', description: `ApnaSa ${p.name} monthly care plan` },
      notes: { plan: key }
    });
    console.log(`${p.envPlanId}=${plan.id}`);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
